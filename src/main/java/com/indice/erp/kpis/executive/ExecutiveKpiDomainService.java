package com.indice.erp.kpis.executive;

import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import static com.indice.erp.kpis.executive.ExecutiveKpiDomainContracts.*;

@Service
public class ExecutiveKpiDomainService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Toronto");
    private static final String BASIS_PERIOD = "period";
    private static final String BASIS_PERIOD_END = "periodEnd";
    private static final String BASIS_CURRENT_SNAPSHOT = "currentSnapshot";

    private final ExecutiveKpiDomainRepository repository;
    private final KpiCurrencyAggregationService currencyAggregationService;
    private final BusinessExchangeRateService exchangeRateService;
    private final TransactionTemplate readTransaction;

    public ExecutiveKpiDomainService(
            ExecutiveKpiDomainRepository repository,
            KpiCurrencyAggregationService currencyAggregationService,
            BusinessExchangeRateService exchangeRateService,
            PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.currencyAggregationService = currencyAggregationService;
        this.exchangeRateService = exchangeRateService;
        this.readTransaction = new TransactionTemplate(transactionManager);
        this.readTransaction.setName("executive-kpi-consistent-read");
        this.readTransaction.setReadOnly(true);
        this.readTransaction.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        this.readTransaction.setTimeout(20);
    }

    public Dashboard build(ExecutiveKpiScope scope) {
        // Exchange-rate refresh may write its daily cache, so it must finish before the read-only KPI snapshot starts.
        var rates = exchangeRateService.loadDailyRates();
        var dashboard = readTransaction.execute(status -> buildConsistent(scope, rates));
        if (dashboard == null) {
            throw new IllegalStateException("Unable to build the executive KPI snapshot.");
        }
        return dashboard;
    }

    private Dashboard buildConsistent(ExecutiveKpiScope scope, BusinessExchangeRatesResponse rates) {
        var previous = scope.previousPeriod();
        var metadata = rates.metadata();
        var parsedRateDate = parseDate(metadata == null ? null : metadata.sourceDate());
        var rateDate = parsedRateDate == null ? LocalDate.now(BUSINESS_ZONE) : parsedRateDate;
        var rateSource = metadata == null ? "" : metadata.sourceName();
        var partialCurrencies = new LinkedHashSet<String>();
        var convertedCurrencies = new LinkedHashSet<String>();

        Function<List<KpiMoneyAmount>, KpiMonetaryAggregate> aggregate = amounts -> {
            var result = currencyAggregationService.aggregate(
                    amounts,
                    scope.preferredCurrency(),
                    rates.ratesPerUsd(),
                    "daily",
                    rateDate,
                    rateSource);
            partialCurrencies.addAll(result.excludedCurrencies());
            result.nativeTotals().stream()
                    .map(item -> item.currency().toUpperCase(Locale.ROOT))
                    .filter(currency -> !currency.equals(scope.preferredCurrency()))
                    .forEach(convertedCurrencies::add);
            return result;
        };

        var process = processDomain(scope, repository.loadProcesses(scope), repository.loadProcesses(previous));
        var expenses = expenseDomain(scope, previous, aggregate);
        var pettyCash = pettyCashDomain(scope, aggregate);
        var inventory = inventoryDomain(scope, previous, aggregate);
        var sales = salesDomain(scope, previous, aggregate);
        var domains = List.of(process, expenses, pettyCash, inventory, sales);

        var globalIssues = new ArrayList<String>();
        domains.forEach(domain -> domain.dataQuality().issues().forEach(issue ->
                globalIssues.add(domain.label() + ": " + issue)));
        var exchangeIssues = exchangeIssues(scope, rates, convertedCurrencies, rateDate, parsedRateDate != null);
        globalIssues.addAll(exchangeIssues);
        if (!partialCurrencies.isEmpty()) {
            globalIssues.add("Hay importes excluidos por moneda o tasa de conversión no válida.");
        }

        var decisionReady = partialCurrencies.isEmpty()
                && domains.stream().allMatch(domain -> domain.dataQuality().decisionReady())
                && exchangeIssues.isEmpty();
        return new Dashboard(
                "2.1",
                new ComparisonRange(previous.from().toString(), previous.to().toString()),
                scope.preferredCurrency(),
                domains,
                new DataQuality(
                        decisionReady,
                        !partialCurrencies.isEmpty(),
                        List.copyOf(partialCurrencies),
                        List.copyOf(globalIssues),
                        "live-source-tables/repeatable-read",
                        Instant.now().toString(),
                        scope.snapshotDate().toString(),
                        rateDate.toString(),
                        decisionReady
                                ? "Cálculo íntegro y consistente; no se detectaron exclusiones ni anomalías estructurales."
                                : "Revisión requerida: no use los indicadores afectados como cifra definitiva hasta corregir las observaciones."));
    }

    private Domain processDomain(
            ExecutiveKpiScope scope,
            ExecutiveKpiDomainRepository.ProcessSnapshot current,
            ExecutiveKpiDomainRepository.ProcessSnapshot previous) {
        var issues = new ArrayList<String>();
        addIssue(issues, current.missingScheduleDates(), "tareas abiertas sin fecha de agenda o vencimiento");
        addIssue(issues, current.invalidCompletionRows(), "tareas con avance fuera del rango 0-100");
        addIssue(issues, current.completedWithoutTimestamp(), "tareas completadas sin marca de finalización");
        addIssue(issues, current.cancelledWithoutTimestamp(), "tareas canceladas sin marca de cancelación");
        addIssue(issues, current.historicalMutableRows(), "tareas históricas cuyo avance no puede reconstruirse al corte");
        var invalidRecords = current.missingScheduleDates() + current.invalidCompletionRows()
                + current.completedWithoutTimestamp() + current.cancelledWithoutTimestamp()
                + current.historicalMutableRows();
        var quality = quality(invalidRecords, issues);

        var completion = percent(current.closedTasks(), current.totalTasks());
        var previousCompletion = percent(previous.closedTasks(), previous.totalTasks());
        var overdueRate = percent(current.overdueTasks(), Math.max(1, current.totalTasks()));
        var currentReliable = processExecutionPeriodReliable(current);
        var previousReliable = processExecutionPeriodReliable(previous);
        var completionAvailable = current.totalTasks() > 0 && currentReliable;
        var previousCompletionAvailable = previous.totalTasks() > 0 && previousReliable;
        var backlogAvailable = current.missingScheduleDates() == 0
                && current.completedWithoutTimestamp() == 0 && current.cancelledWithoutTimestamp() == 0;
        var previousBacklogAvailable = previous.missingScheduleDates() == 0
                && previous.completedWithoutTimestamp() == 0 && previous.cancelledWithoutTimestamp() == 0;
        var averageAvailable = current.totalTasks() > 0 && currentReliable;
        var metrics = List.of(
                compared("completionRate", "Cumplimiento", completion, previousCompletion, "percent", "up",
                        current.totalTasks() == 0 ? "watch" : scoreStatus(completion),
                        completionAvailable, previousCompletionAvailable, false, List.of(), BASIS_PERIOD,
                        "Tareas programadas en el periodo y completadas a más tardar en la fecha de corte."),
                compared("overdueTasks", "Tareas vencidas", current.overdueTasks(), previous.overdueTasks(), "count", "down",
                        riskRateStatus(overdueRate), backlogAvailable, previousBacklogAvailable,
                        false, List.of(), BASIS_PERIOD_END,
                        "Rezago completo al corte: tareas vencidas aunque su fecha sea anterior al inicio del periodo."),
                current("averageCompletion", "Avance promedio", current.averageCompletion(), "percent", "up",
                        averageAvailable ? scoreStatus(current.averageCompletion()) : "watch",
                        averageAvailable, false, List.of(), BASIS_PERIOD,
                        "Avance de las tareas programadas; para cortes históricos sólo se publica cuando es reconstruible."),
                current("unassignedTasks", "Sin responsable", current.unassignedTasks(), "count", "down",
                        countRiskStatus(current.unassignedTasks()), true, false, List.of(), BASIS_CURRENT_SNAPSHOT,
                        "Tareas abiertas actualmente sin una persona responsable."));
        var signals = new ArrayList<Signal>();
        addSignal(signals, "overdue", current.overdueTasks() > 0 ? "critical" : "healthy",
                current.overdueTasks() + " tareas requieren regularización por vencimiento.", current.overdueTasks());
        addSignal(signals, "audit", current.pendingAuditTasks() > 0 ? "watch" : "healthy",
                current.pendingAuditTasks() + " tareas terminadas esperan auditoría.", current.pendingAuditTasks());
        return domain("processTasks", "Tareas y procesos", metrics, signals, quality);
    }

    private boolean processExecutionPeriodReliable(ExecutiveKpiDomainRepository.ProcessSnapshot snapshot) {
        // An open task without a date cannot be classified as overdue, but it is not part of the
        // dated population used by completion and average-progress KPIs. Keep the quality warning
        // without hiding the valid period measurement.
        return snapshot.invalidCompletionRows() == 0
                && snapshot.completedWithoutTimestamp() == 0
                && snapshot.cancelledWithoutTimestamp() == 0
                && snapshot.historicalMutableRows() == 0;
    }

    private Domain expenseDomain(
            ExecutiveKpiScope scope,
            ExecutiveKpiScope previous,
            Function<List<KpiMoneyAmount>, KpiMonetaryAggregate> aggregate) {
        var currentSnapshot = repository.loadExpenses(scope);
        var previousSnapshot = repository.loadExpenses(previous);
        var total = aggregate.apply(repository.loadExpenseValue(scope, "total_amount", false));
        var previousTotal = aggregate.apply(repository.loadExpenseValue(previous, "total_amount", false));
        var payables = aggregate.apply(repository.loadExpenseValue(scope, "balance_amount", false));
        var overdue = aggregate.apply(repository.loadExpenseValue(scope, "balance_amount", true));
        var planned = aggregate.apply(repository.loadBudgetValue(scope, "planned_amount"));
        var actual = aggregate.apply(repository.loadBudgetValue(scope, "actual_expense_amount"));
        var budgetQuality = repository.loadBudgetQuality(scope);
        var budgetReliable = budgetQuality.invalidAmountRows() == 0 && budgetQuality.invalidCurrencyRows() == 0;
        var budgetCoverageMissing = currentSnapshot.expenseCount() > 0
                && currentSnapshot.expensesOutsideActiveBudget() == currentSnapshot.expenseCount();
        var budgetAvailable = value(planned).compareTo(BigDecimal.ZERO) > 0
                && budgetReliable && !budgetCoverageMissing && !planned.partial() && !actual.partial();
        var budgetUsage = budgetAvailable ? percent(value(actual), value(planned)) : 0;

        var issues = new ArrayList<String>();
        addIssue(issues, currentSnapshot.invalidPeriodAmountRows(), "gastos del periodo con importes o saldos inconsistentes");
        addIssue(issues, currentSnapshot.invalidPayableAmountRows(), "cuentas por pagar con importes o saldos inconsistentes");
        addIssue(issues, currentSnapshot.payableWithoutDueDate(), "cuentas por pagar sin fecha de vencimiento");
        addIssue(issues, currentSnapshot.invalidPeriodCurrencyRows(), "gastos del periodo con código de moneda inválido");
        addIssue(issues, currentSnapshot.invalidPayableCurrencyRows(), "cuentas por pagar con código de moneda inválido");
        addIssue(issues, currentSnapshot.expensesOutsideActiveBudget(),
                "gastos ejecutados del periodo sin una línea de presupuesto activa");
        addIssue(issues, budgetQuality.invalidAmountRows(), "líneas presupuestales con importes negativos");
        addIssue(issues, budgetQuality.invalidCurrencyRows(), "líneas presupuestales con código de moneda inválido");
        var invalidRecords = currentSnapshot.invalidPeriodAmountRows() + currentSnapshot.invalidPayableAmountRows()
                + currentSnapshot.payableWithoutDueDate() + currentSnapshot.invalidPeriodCurrencyRows()
                + currentSnapshot.invalidPayableCurrencyRows() + currentSnapshot.expensesOutsideActiveBudget()
                + budgetQuality.invalidAmountRows()
                + budgetQuality.invalidCurrencyRows();
        var quality = quality(invalidRecords, issues);
        var periodReliable = currentSnapshot.invalidPeriodAmountRows() == 0
                && currentSnapshot.invalidPeriodCurrencyRows() == 0;
        var previousPeriodReliable = previousSnapshot.invalidPeriodAmountRows() == 0
                && previousSnapshot.invalidPeriodCurrencyRows() == 0;
        var payablesReliable = currentSnapshot.invalidPayableAmountRows() == 0
                && currentSnapshot.invalidPayableCurrencyRows() == 0;
        var overdueReliable = payablesReliable && currentSnapshot.payableWithoutDueDate() == 0;
        var expenseStatus = budgetAvailable
                ? budgetStatus(budgetUsage)
                : trendStatus(value(total), value(previousTotal), "down");

        var metrics = List.of(
                comparedMoney("expenseTotal", "Gasto ejecutado", total, previousTotal, "down", expenseStatus,
                        periodReliable, previousPeriodReliable, BASIS_PERIOD,
                        "Sólo gastos aprobados, parcialmente pagados, pagados o cerrados del periodo; excluye borradores."),
                current("budgetUsage", "Presupuesto consumido", budgetUsage, "percent", "down",
                        budgetAvailable ? budgetStatus(budgetUsage) : "watch", budgetAvailable,
                        planned.partial() || actual.partial(), excluded(planned, actual), BASIS_CURRENT_SNAPSHOT,
                        "Gasto ejecutado vinculado a líneas activas sobre presupuesto activo vigente; no mezcla gastos sin asignación."),
                currentMoney("payables", "Cuentas por pagar", payables, "down",
                        value(payables).signum() > 0 ? "watch" : "healthy", payablesReliable, BASIS_CURRENT_SNAPSHOT,
                        "Saldo actual no pagado, independientemente de la etapa operativa; excluye registros rechazados o cancelados."),
                currentMoney("overduePayables", "Pagos vencidos", overdue, "down",
                        value(overdue).signum() > 0 ? "critical" : "healthy", overdueReliable, BASIS_CURRENT_SNAPSHOT,
                        "Saldo actual abierto cuya fecha de pago ya venció."));
        var signals = new ArrayList<Signal>();
        addSignal(signals, "approval", currentSnapshot.pendingApproval() > 0 ? "watch" : "healthy",
                currentSnapshot.pendingApproval() + " gastos esperan aprobación.", currentSnapshot.pendingApproval());
        addSignal(signals, "receipts", currentSnapshot.missingReceipts() > 0 ? "watch" : "healthy",
                currentSnapshot.missingReceipts() + " gastos ejecutados del periodo no tienen comprobante.",
                currentSnapshot.missingReceipts());
        addSignal(signals, "expenseTrend", value(total).compareTo(value(previousTotal)) > 0 ? "watch" : "healthy",
                "El periodo anterior registró " + previousSnapshot.expenseCount()
                        + " gastos ejecutados; el actual registra " + currentSnapshot.expenseCount() + ".",
                currentSnapshot.expenseCount());
        return domain("expenses", "Gastos", metrics, signals, quality);
    }

    private Domain pettyCashDomain(
            ExecutiveKpiScope scope,
            Function<List<KpiMoneyAmount>, KpiMonetaryAggregate> aggregate) {
        var snapshot = repository.loadPettyCash(scope);
        var balance = aggregate.apply(repository.loadPettyCashValue(scope, "current_balance_amount"));
        var limit = aggregate.apply(repository.loadPettyCashValue(scope, "limit_amount"));
        var pending = aggregate.apply(repository.loadPettyCashSettlements(scope));
        var utilizationAvailable = snapshot.fundCount() > 0 && value(limit).signum() > 0;
        var utilization = utilizationAvailable
                ? Math.max(0, percent(value(limit).subtract(value(balance)), value(limit)))
                : 0;

        var issues = new ArrayList<String>();
        addIssue(issues, snapshot.invalidFundAmountRows(), "fondos con límites inválidos");
        addIssue(issues, snapshot.invalidFundCurrencyRows(), "fondos con moneda inválida");
        addIssue(issues, snapshot.invalidSettlementAmountRows(), "comprobaciones pendientes con importes negativos");
        addIssue(issues, snapshot.invalidSettlementCurrencyRows(), "comprobaciones pendientes con moneda inválida");
        var quality = quality(snapshot.invalidFundAmountRows() + snapshot.invalidFundCurrencyRows()
                + snapshot.invalidSettlementAmountRows() + snapshot.invalidSettlementCurrencyRows(), issues);
        var fundsReliable = snapshot.invalidFundAmountRows() == 0 && snapshot.invalidFundCurrencyRows() == 0;
        var settlementsReliable = snapshot.invalidSettlementAmountRows() == 0
                && snapshot.invalidSettlementCurrencyRows() == 0;
        var metrics = List.of(
                currentMoney("availableBalance", "Saldo disponible", balance, "context",
                        snapshot.fundCount() == 0 ? "watch" : value(balance).signum() >= 0 ? "healthy" : "critical",
                        snapshot.fundCount() > 0 && fundsReliable, BASIS_CURRENT_SNAPSHOT,
                        "Saldo actual de todos los fondos activos."),
                current("utilization", "Utilización de fondos", utilization, "percent", "down",
                        utilizationAvailable ? utilizationStatus(utilization) : "watch",
                        utilizationAvailable && fundsReliable && !balance.partial() && !limit.partial(),
                        balance.partial() || limit.partial(), excluded(balance, limit), BASIS_CURRENT_SNAPSHOT,
                        "Proporción utilizada frente al límite consolidado de fondos activos."),
                currentMoney("pendingSettlements", "Pendiente de comprobación", pending, "down",
                        value(pending).signum() > 0 ? "watch" : "healthy", settlementsReliable, BASIS_CURRENT_SNAPSHOT,
                        "Total actual de comprobaciones aún no convertidas en gasto."),
                current("attentionFunds", "Fondos en atención", snapshot.attentionFunds(), "count", "down",
                        countRiskStatus(snapshot.attentionFunds()), true, false, List.of(), BASIS_CURRENT_SNAPSHOT,
                        "Fondos marcados con saldo bajo o conciliación pendiente."));
        var signals = new ArrayList<Signal>();
        addSignal(signals, "pendingLines", snapshot.pendingSettlements() > 0 ? "watch" : "healthy",
                snapshot.pendingSettlements() + " comprobaciones siguen pendientes.", snapshot.pendingSettlements());
        addSignal(signals, "missingReceipts", snapshot.missingReceipts() > 0 ? "critical" : "healthy",
                snapshot.missingReceipts() + " comprobaciones pendientes no tienen evidencia.", snapshot.missingReceipts());
        return domain("pettyCash", "Caja chica", metrics, signals, quality);
    }

    private Domain inventoryDomain(
            ExecutiveKpiScope scope,
            ExecutiveKpiScope previous,
            Function<List<KpiMoneyAmount>, KpiMonetaryAggregate> aggregate) {
        var currentSnapshot = repository.loadInventory(scope);
        var previousSnapshot = repository.loadInventory(previous);
        var inventoryValue = aggregate.apply(repository.loadInventoryValue(scope));
        var totalUnits = currentSnapshot.availableUnits() + currentSnapshot.reservedUnits();
        var reservedAvailable = currentSnapshot.stockLocations() > 0 && totalUnits > 0;
        var reservedRate = reservedAvailable ? percent(currentSnapshot.reservedUnits(), totalUnits) : 0;

        var issues = new ArrayList<String>();
        addIssue(issues, currentSnapshot.invalidQuantityRows(), "ubicaciones con cantidad o costo inválido");
        addIssue(issues, currentSnapshot.invalidCurrencyRows(), "existencias con moneda de producto inválida");
        var quality = quality(currentSnapshot.invalidQuantityRows() + currentSnapshot.invalidCurrencyRows(), issues);
        var inventoryReliable = currentSnapshot.invalidQuantityRows() == 0
                && currentSnapshot.invalidCurrencyRows() == 0;
        var stockAvailable = currentSnapshot.stockLocations() > 0 && inventoryReliable;
        var metrics = List.of(
                currentMoney("inventoryValue", "Valor de inventario", inventoryValue, "context",
                        stockAvailable && !inventoryValue.partial() ? "healthy" : "watch", stockAvailable,
                        BASIS_CURRENT_SNAPSHOT, "Existencia disponible actual multiplicada por costo unitario."),
                current("lowStock", "Ubicaciones con stock bajo", currentSnapshot.lowStock(), "count", "down",
                        stockAvailable ? countRiskStatus(currentSnapshot.lowStock()) : "watch", stockAvailable,
                        false, List.of(), BASIS_CURRENT_SNAPSHOT,
                        "Combinaciones producto-almacén con existencia positiva menor o igual al mínimo."),
                current("outOfStock", "Ubicaciones agotadas", currentSnapshot.outOfStock(), "count", "down",
                        !stockAvailable ? "watch" : currentSnapshot.outOfStock() > 0 ? "critical" : "healthy",
                        stockAvailable, false, List.of(), BASIS_CURRENT_SNAPSHOT,
                        "Combinaciones producto-almacén sin existencia disponible."),
                current("reservedRate", "Inventario comprometido", reservedRate, "percent", "context",
                        !reservedAvailable ? "watch" : reservedRate >= 90 ? "critical" : reservedRate >= 70 ? "watch" : "healthy",
                        reservedAvailable && inventoryReliable, false, List.of(), BASIS_CURRENT_SNAPSHOT,
                        "Unidades reservadas sobre la suma de unidades disponibles y reservadas."),
                compared("movements", "Movimientos del periodo", currentSnapshot.movementCount(),
                        previousSnapshot.movementCount(), "count", "context", "healthy",
                        true, true, false, List.of(), BASIS_PERIOD,
                        "Operaciones de inventario agrupadas por movimiento durante el periodo."));
        var signals = new ArrayList<Signal>();
        addSignal(signals, "stockRisk",
                currentSnapshot.outOfStock() > 0 ? "critical" : currentSnapshot.lowStock() > 0 ? "watch" : "healthy",
                currentSnapshot.outOfStock() + " ubicaciones agotadas y " + currentSnapshot.lowStock() + " con stock bajo.",
                currentSnapshot.outOfStock() + currentSnapshot.lowStock());
        addSignal(signals, "transit", currentSnapshot.inTransit() > 0 ? "watch" : "healthy",
                currentSnapshot.inTransit() + " transferencias permanecen en tránsito.", currentSnapshot.inTransit());
        addSignal(signals, "adjustments", currentSnapshot.adjustments() > 0 ? "watch" : "healthy",
                currentSnapshot.adjustments() + " ajustes o mermas fueron registrados en el periodo.",
                currentSnapshot.adjustments());
        return domain("inventory", "Inventarios", metrics, signals, quality);
    }

    private Domain salesDomain(
            ExecutiveKpiScope scope,
            ExecutiveKpiScope previous,
            Function<List<KpiMoneyAmount>, KpiMonetaryAggregate> aggregate) {
        var currentSnapshot = repository.loadSales(scope);
        var previousSnapshot = repository.loadSales(previous);
        var sales = aggregate.apply(repository.loadSalesValue(scope));
        var previousSales = aggregate.apply(repository.loadSalesValue(previous));
        var currentCounts = repository.loadSalesCountByCurrency(scope);
        var previousCounts = repository.loadSalesCountByCurrency(previous);
        var currentComparableSales = coveredCount(currentCounts, sales.excludedCurrencies());
        var previousComparableSales = coveredCount(previousCounts, previousSales.excludedCurrencies());
        var pipeline = aggregate.apply(repository.loadPipelineValue(scope));
        var averageTicket = average(value(sales), currentComparableSales);
        var previousAverageTicket = average(value(previousSales), previousComparableSales);
        var conversion = percent(currentSnapshot.wonOpportunities(), currentSnapshot.closedOpportunities());
        var previousConversion = percent(previousSnapshot.wonOpportunities(), previousSnapshot.closedOpportunities());

        var issues = new ArrayList<String>();
        addIssue(issues, currentSnapshot.missingSaleDate(), "ventas sin fecha transaccional");
        addIssue(issues, currentSnapshot.invalidSaleAmountRows(), "ventas con importes negativos");
        addIssue(issues, currentSnapshot.invalidSaleCurrencyRows(), "ventas con código de moneda inválido");
        addIssue(issues, currentSnapshot.missingOpportunityDate(), "oportunidades cerradas sin fecha de creación");
        addIssue(issues, currentSnapshot.invalidProbabilityRows(), "oportunidades con probabilidad fuera del rango 0-100");
        addIssue(issues, currentSnapshot.invalidOpportunityAmountRows(), "oportunidades abiertas con valor negativo");
        addIssue(issues, currentSnapshot.invalidOpportunityCurrencyRows(), "oportunidades abiertas con moneda inválida");
        var invalidRecords = currentSnapshot.missingSaleDate() + currentSnapshot.invalidSaleAmountRows()
                + currentSnapshot.invalidSaleCurrencyRows() + currentSnapshot.missingOpportunityDate()
                + currentSnapshot.invalidProbabilityRows() + currentSnapshot.invalidOpportunityAmountRows()
                + currentSnapshot.invalidOpportunityCurrencyRows();
        var quality = quality(invalidRecords, issues);
        var currentSalesReliable = currentSnapshot.missingSaleDate() == 0
                && currentSnapshot.invalidSaleAmountRows() == 0
                && currentSnapshot.invalidSaleCurrencyRows() == 0;
        var previousSalesReliable = previousSnapshot.missingSaleDate() == 0
                && previousSnapshot.invalidSaleAmountRows() == 0
                && previousSnapshot.invalidSaleCurrencyRows() == 0;
        var pipelineReliable = currentSnapshot.invalidProbabilityRows() == 0
                && currentSnapshot.invalidOpportunityAmountRows() == 0
                && currentSnapshot.invalidOpportunityCurrencyRows() == 0;
        var salesStatus = trendStatus(value(sales), value(previousSales), "up");
        var metrics = List.of(
                comparedMoney("netSales", "Ventas del periodo", sales, previousSales, "up", salesStatus,
                        currentSalesReliable, previousSalesReliable, BASIS_PERIOD,
                        "Ventas no canceladas ni rechazadas, consolidadas en la moneda preferida."),
                compared("averageTicket", "Ticket promedio", averageTicket, previousAverageTicket, "money", "up",
                        currentComparableSales == 0 ? "watch"
                                : averageTicket.compareTo(previousAverageTicket) >= 0 ? "healthy" : "watch",
                        currentComparableSales > 0 && currentSalesReliable && !sales.partial(),
                        previousComparableSales > 0 && previousSalesReliable && !previousSales.partial(),
                        sales.partial() || previousSales.partial(), excluded(sales, previousSales), BASIS_PERIOD,
                        "Venta promedio calculada sólo con operaciones cuya moneda pudo consolidarse."),
                compared("conversion", "Conversión comercial", conversion, previousConversion, "percent", "up",
                        currentSnapshot.closedOpportunities() == 0 ? "watch" : scoreStatus(conversion),
                        currentSnapshot.closedOpportunities() > 0 && currentSnapshot.missingOpportunityDate() == 0,
                        previousSnapshot.closedOpportunities() > 0 && previousSnapshot.missingOpportunityDate() == 0,
                        false, List.of(), BASIS_PERIOD,
                        "Oportunidades ganadas sobre oportunidades cerradas de la cohorte creada en el periodo."),
                currentMoney("weightedPipeline", "Pipeline ponderado", pipeline, "up",
                        value(pipeline).signum() > 0 ? "healthy" : "watch", pipelineReliable, BASIS_CURRENT_SNAPSHOT,
                        "Valor actual de oportunidades abiertas multiplicado por su probabilidad, limitada a 0-100%."));
        var signals = new ArrayList<Signal>();
        addSignal(signals, "finance", currentSnapshot.pendingFinance() > 0 ? "watch" : "healthy",
                currentSnapshot.pendingFinance() + " ventas esperan validación financiera.", currentSnapshot.pendingFinance());
        addSignal(signals, "inventory", currentSnapshot.pendingInventory() > 0 ? "critical" : "healthy",
                currentSnapshot.pendingInventory() + " ventas esperan movimiento de inventario.",
                currentSnapshot.pendingInventory());
        return domain("sales", "Ventas", metrics, signals, quality);
    }

    private List<String> exchangeIssues(
            ExecutiveKpiScope scope,
            BusinessExchangeRatesResponse rates,
            Set<String> convertedCurrencies,
            LocalDate rateDate,
            boolean rateDateValid) {
        if (convertedCurrencies.isEmpty()) return List.of();
        var issues = new ArrayList<String>();
        var relevantCurrencies = new LinkedHashSet<>(convertedCurrencies);
        if (!"USD".equals(scope.preferredCurrency())) relevantCurrencies.add(scope.preferredCurrency());
        relevantCurrencies.remove("USD");
        var sources = rates.sources() == null ? List.<com.indice.erp.exchange.BusinessExchangeRateSourceResponse>of()
                : rates.sources();
        var missingSources = relevantCurrencies.stream()
                .filter(currency -> sources.stream().noneMatch(source -> currency.equals(source.currencyCode())))
                .toList();
        if (!missingSources.isEmpty()) {
            issues.add("No existe evidencia de fuente cambiaria para: " + String.join(", ", missingSources) + ".");
        }
        var nonOfficial = sources.stream()
                .filter(source -> relevantCurrencies.contains(source.currencyCode()))
                .filter(source -> !"official".equalsIgnoreCase(source.status()))
                .map(source -> source.currencyCode() + " (" + source.status() + ")")
                .toList();
        if (!nonOfficial.isEmpty()) {
            issues.add("Tasas no oficiales o desactualizadas: " + String.join(", ", nonOfficial) + ".");
        }
        if (!rateDateValid) {
            issues.add("La referencia cambiaria no contiene una fecha de corte válida.");
        }
        var snapshotDate = scope.snapshotDate() == null ? LocalDate.now(BUSINESS_ZONE) : scope.snapshotDate();
        if (ChronoUnit.DAYS.between(rateDate, snapshotDate) > 7) {
            issues.add("La referencia cambiaria tiene más de siete días de antigüedad.");
        }
        return issues;
    }

    private Domain domain(
            String id,
            String label,
            List<Metric> metrics,
            List<Signal> signals,
            DomainQuality quality) {
        var status = metrics.stream().filter(Metric::available).map(Metric::status)
                .max(Comparator.comparingInt(this::severity)).orElse("watch");
        var signalStatus = signals.stream().map(Signal::severity)
                .max(Comparator.comparingInt(this::severity)).orElse("healthy");
        if (severity(signalStatus) > severity(status)) status = signalStatus;
        if (!quality.decisionReady() && severity(status) < severity("watch")) status = "watch";
        return new Domain(id, label, status, metrics, List.copyOf(signals), quality);
    }

    private DomainQuality quality(int invalidRecords, List<String> issues) {
        return new DomainQuality(invalidRecords == 0, invalidRecords, List.copyOf(issues));
    }

    private Metric comparedMoney(
            String id,
            String label,
            KpiMonetaryAggregate current,
            KpiMonetaryAggregate previous,
            String direction,
            String status,
            boolean currentAvailable,
            boolean previousAvailable,
            String basis,
            String description) {
        return compared(id, label, value(current), value(previous), "money", direction, status,
                currentAvailable && !current.partial(), previousAvailable && !previous.partial(),
                current.partial() || previous.partial(),
                excluded(current, previous), basis, description);
    }

    private Metric currentMoney(
            String id,
            String label,
            KpiMonetaryAggregate aggregate,
            String direction,
            String status,
            boolean available,
            String basis,
            String description) {
        return current(id, label, value(aggregate), "money", direction, status, available && !aggregate.partial(),
                aggregate.partial(), aggregate.excludedCurrencies(), basis, description);
    }

    private Metric compared(
            String id,
            String label,
            double value,
            double previous,
            String unit,
            String direction,
            String status,
            boolean currentAvailable,
            boolean previousAvailable,
            boolean partial,
            List<String> excluded,
            String basis,
            String description) {
        return compared(id, label, decimal(value), decimal(previous), unit, direction, status,
                currentAvailable, previousAvailable, partial, excluded, basis, description);
    }

    private Metric compared(
            String id,
            String label,
            BigDecimal value,
            BigDecimal previous,
            String unit,
            String direction,
            String status,
            boolean currentAvailable,
            boolean previousAvailable,
            boolean partial,
            List<String> excluded,
            String basis,
            String description) {
        var comparable = currentAvailable && previousAvailable;
        var currentValue = money(value);
        var previousValue = previousAvailable ? money(previous) : null;
        var change = comparable ? money(value.subtract(previous)) : null;
        var changePercent = comparable && previous.signum() != 0
                ? money(value.subtract(previous).multiply(BigDecimal.valueOf(100))
                        .divide(previous.abs(), 8, RoundingMode.HALF_UP))
                : null;
        return new Metric(id, label, currentValue, previousValue, change, changePercent, unit, direction,
                currentAvailable ? status : "watch", currentAvailable, comparable, partial,
                List.copyOf(excluded), basis, description);
    }

    private Metric current(
            String id,
            String label,
            double value,
            String unit,
            String direction,
            String status,
            boolean available,
            boolean partial,
            List<String> excluded,
            String basis,
            String description) {
        return current(id, label, decimal(value), unit, direction, status, available, partial, excluded, basis, description);
    }

    private Metric current(
            String id,
            String label,
            BigDecimal value,
            String unit,
            String direction,
            String status,
            boolean available,
            boolean partial,
            List<String> excluded,
            String basis,
            String description) {
        return new Metric(id, label, money(value), null, null, null, unit, direction,
                available ? status : "watch", available, false, partial, List.copyOf(excluded), basis, description);
    }

    private void addSignal(List<Signal> signals, String id, String severity, String message, double value) {
        if (!"healthy".equals(severity) || value > 0) signals.add(new Signal(id, severity, message, round(value)));
    }

    private void addIssue(List<String> issues, int count, String label) {
        if (count > 0) issues.add(count + " " + label + ".");
    }

    private int severity(String value) {
        return switch (value) {
            case "critical" -> 3;
            case "watch" -> 2;
            default -> 1;
        };
    }

    private String scoreStatus(double value) {
        if (value >= 85) return "healthy";
        if (value >= 65) return "watch";
        return "critical";
    }

    private String riskRateStatus(double value) {
        if (value <= 0) return "healthy";
        if (value <= 10) return "watch";
        return "critical";
    }

    private String countRiskStatus(double value) {
        return value <= 0 ? "healthy" : "watch";
    }

    private String budgetStatus(double value) {
        if (value <= 85) return "healthy";
        if (value <= 100) return "watch";
        return "critical";
    }

    private String utilizationStatus(double value) {
        if (value < 80) return "healthy";
        if (value < 95) return "watch";
        return "critical";
    }

    private String trendStatus(BigDecimal current, BigDecimal previous, String favorableDirection) {
        if (previous.signum() == 0) {
            if (current.signum() == 0) return "watch";
            return "up".equals(favorableDirection) ? "healthy" : "watch";
        }
        var change = current.subtract(previous).multiply(BigDecimal.valueOf(100))
                .divide(previous.abs(), 8, RoundingMode.HALF_UP).doubleValue();
        if ("up".equals(favorableDirection)) {
            if (change >= 0) return "healthy";
            return change >= -10 ? "watch" : "critical";
        }
        if (change <= 0) return "healthy";
        return change <= 10 ? "watch" : "critical";
    }

    private double percent(double value, double total) {
        return total <= 0 ? 0 : round((value * 100.0) / total);
    }

    private double percent(BigDecimal value, BigDecimal total) {
        if (total == null || total.signum() <= 0) return 0;
        return value.multiply(BigDecimal.valueOf(100)).divide(total, 8, RoundingMode.HALF_UP).doubleValue();
    }

    private BigDecimal average(BigDecimal total, int count) {
        if (count <= 0) return BigDecimal.ZERO;
        return total.divide(BigDecimal.valueOf(count), 8, RoundingMode.HALF_UP);
    }

    private int coveredCount(List<ExecutiveKpiDomainRepository.CurrencyCount> counts, List<String> excludedCurrencies) {
        var excluded = Set.copyOf(excludedCurrencies);
        return counts.stream()
                .filter(item -> item.currency() != null && item.currency().trim().toUpperCase(Locale.ROOT).matches("[A-Z]{3}"))
                .filter(item -> !excluded.contains(item.currency().trim().toUpperCase(Locale.ROOT)))
                .mapToInt(ExecutiveKpiDomainRepository.CurrencyCount::count)
                .sum();
    }

    private BigDecimal value(KpiMonetaryAggregate aggregate) {
        return aggregate.preferredTotal() == null ? BigDecimal.ZERO : aggregate.preferredTotal();
    }

    private List<String> excluded(KpiMonetaryAggregate... aggregates) {
        var values = new LinkedHashSet<String>();
        for (var aggregate : aggregates) values.addAll(aggregate.excludedCurrencies());
        return List.copyOf(values);
    }

    private LocalDate parseDate(String value) {
        try {
            return value == null || value.isBlank() ? null : LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private BigDecimal decimal(double value) {
        return BigDecimal.valueOf(value);
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
