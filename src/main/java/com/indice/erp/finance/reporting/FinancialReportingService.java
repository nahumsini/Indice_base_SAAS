package com.indice.erp.finance.reporting;

import com.indice.erp.finance.reporting.AccountingPostingModels.DiscoveryIssue;
import com.indice.erp.finance.reporting.FinancialReportingContracts.FinancialStatement;
import com.indice.erp.finance.reporting.FinancialReportingContracts.Headline;
import com.indice.erp.finance.reporting.FinancialReportingContracts.PeriodActionResponse;
import com.indice.erp.finance.reporting.FinancialReportingContracts.QualityFinding;
import com.indice.erp.finance.reporting.FinancialReportingContracts.ReportContext;
import com.indice.erp.finance.reporting.FinancialReportingContracts.ReportReadiness;
import com.indice.erp.finance.reporting.FinancialReportingContracts.ReportResponse;
import com.indice.erp.finance.reporting.FinancialReportingContracts.SourceCoverage;
import com.indice.erp.finance.reporting.FinancialReportingContracts.StatementLine;
import com.indice.erp.finance.reporting.FinancialReportingContracts.TrialBalanceRow;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import com.indice.erp.finance.shared.FinanceCompanyCountryResolver;
import org.springframework.transaction.annotation.Transactional;

@Service
class FinancialReportingService {

    private static final BigDecimal ZERO = new BigDecimal("0.0000");
    private static final BigDecimal TOLERANCE = new BigDecimal("0.0100");
    private static final Set<String> SOURCE_EVENT_BLOCKER_CODES = Set.of(
        "MISSING_EXCHANGE_RATE", "PENDING_POS_RETURN",
        "MISSING_PRODUCT_COST",
        "UNBALANCED_PAYROLL_SOURCE",
        "UNPOSTED_SOURCE_EVENT",
        "SOURCE_CHANGED_AFTER_POSTING",
        "SOURCE_NO_LONGER_ELIGIBLE", "INVALID_EXPENSE_ACCOUNT", "MISSING_SOURCE_RECOGNITION", "INCOMPLETE_SALE_SETTLEMENT", "INVALID_RECEIVABLE_PRINCIPAL",
        "UNVERIFIED_INVENTORY_RECEIPT", "INVALID_SALE_TOTALS", "INVALID_EXPENSE_TOTAL", "UNPOSTED_SOURCE_REVERSAL"
    );

    private final FinancialLedgerRepository ledgerRepository;
    private final FinancialReportRepository reportRepository;
    private final AccountingSourceDiscoveryService discoveryService;
    private final FinanceCompanyCountryResolver countryResolver;
    private final FinancialSubledgerReconciliation reconciliation;
    private final AccountingSourceReversalService reversals;
    private final com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones;

    FinancialReportingService(
        FinancialLedgerRepository ledgerRepository,
        FinancialReportRepository reportRepository,
        AccountingSourceDiscoveryService discoveryService,
        FinanceCompanyCountryResolver countryResolver,
        FinancialSubledgerReconciliation reconciliation,
        AccountingSourceReversalService reversals,
        com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones
    ) {
        this.ledgerRepository = ledgerRepository;
        this.reportRepository = reportRepository;
        this.discoveryService = discoveryService;
        this.countryResolver = countryResolver;
        this.reconciliation = reconciliation;
        this.reversals = reversals;
        this.timezones = timezones;
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    ReportResponse report(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId
    ) {
        FinancialSynchronizationService.validateRange(from, to);
        var settings = ledgerRepository.findSettings(companyId)
            .orElseThrow(() -> new IllegalStateException(
                "Accounting setup is not initialized. Synchronize operations before reading financial statements."));
        validateScope(companyId, unitId, businessId);

        long days = ChronoUnit.DAYS.between(from, to) + 1;
        LocalDate comparativeTo = from.minusDays(1);
        LocalDate comparativeFrom = comparativeTo.minusDays(days - 1);
        var currentPeriod = reportRepository.periodTotals(companyId, from, to, unitId, businessId);
        var comparativePeriod = reportRepository.periodTotals(companyId, comparativeFrom, comparativeTo, unitId, businessId);
        var currentClosing = reportRepository.closingTotals(companyId, to, unitId, businessId);
        var comparativeClosing = reportRepository.closingTotals(companyId, comparativeTo, unitId, businessId);
        var openingClosing = reportRepository.closingTotals(companyId, from.minusDays(1), unitId, businessId);
        var currentCash = reportRepository.cashChanges(companyId, from, to, unitId, businessId);
        var comparativeCash = reportRepository.cashChanges(companyId, comparativeFrom, comparativeTo, unitId, businessId);

        var allSources = discoveryService.discover(companyId, from, to, settings.functionalCurrency());
        var scopedSources = discoveryService.inScope(companyId, allSources, unitId, businessId);
        var findings = qualityFindings(companyId, from, to, settings, currentClosing, unitId, businessId, allSources, scopedSources);
        int postedEntries = reportRepository.countPostedEntries(companyId, from, to, unitId, businessId);
        if (postedEntries == 0 && currentClosing.isEmpty()) {
            findings.add(new QualityFinding("NO_ACCOUNTING_ACTIVITY", "BLOCKING", "Sin actividad contabilizada",
                "No existen asientos publicados para el alcance y periodo seleccionados.",
                "Sincroniza las operaciones o revisa los filtros.", "ledger", 0));
        }

        var trialBalance = reportRepository.trialBalance(companyId, from, to, unitId, businessId).stream()
            .map(row -> new TrialBalanceRow(row.accountId(), row.accountCode(), row.accountName(),
                row.accountType(), row.debit(), row.credit(), row.balance(), row.journalCount()))
            .toList();
        var coverage = sourceCoverage(companyId, scopedSources, findings);
        int pending = coverage.stream().mapToInt(SourceCoverage::blocked).sum();
        int blocking = (int) findings.stream().filter(item -> "BLOCKING".equals(item.severity())).count();
        int warnings = (int) findings.stream().filter(item -> "WARNING".equals(item.severity())).count();
        boolean ready = blocking == 0;
        String periodKey = YearMonth.from(to).toString();
        String periodStatus = reportRepository.periodStatus(companyId, periodKey).orElse("NOT_CREATED");
        String reportStatus = ready ? ("CLOSED".equals(periodStatus) ? "CLOSED" : "READY") : "PRELIMINARY";
        int eligible = coverage.stream().mapToInt(SourceCoverage::eligible).sum();
        int postedSources = coverage.stream().mapToInt(SourceCoverage::posted).sum();
        int coveragePercent = eligible == 0 ? (postedEntries > 0 ? 100 : 0)
            : Math.min(100, (int) Math.round(postedSources * 100.0 / eligible));

        var profit = profitMetrics(currentPeriod);
        var balance = balanceMetrics(currentClosing);
        var cash = cashMetrics(currentCash);
        var headline = new Headline(profit.revenue(), profit.grossProfit(), profit.operatingProfit(),
            profit.netProfit(), balance.assets(), balance.liabilities(), balance.equity(), cash.netChange());
        var profile = new FinancialPresentationProfile(countryResolver.resolve(companyId), settings.reportingFramework());
        var statements = List.of(
            profitStatement(currentPeriod, comparativePeriod),
            financialPositionStatement(currentClosing, comparativeClosing),
            cashFlowStatement(currentCash, comparativeCash, openingClosing, currentClosing,
                reportRepository.closingTotals(companyId, comparativeFrom.minusDays(1), unitId, businessId), comparativeClosing),
            equityStatement(openingClosing, currentClosing, comparativeClosing, currentPeriod, comparativePeriod,
                reportRepository.closingTotals(companyId, comparativeFrom.minusDays(1), unitId, businessId))
        ).stream().map(profile::present).toList();
        var context = new ReportContext(from, to, comparativeFrom, comparativeTo, unitId, businessId,
            settings.reportingFramework(), settings.frameworkEffectiveDate(), settings.functionalCurrency(),
            settings.presentationCurrency(), profile.country(), periodKey, periodStatus, Instant.now());
        var readiness = new ReportReadiness(reportStatus, ready, blocking, warnings, postedEntries, pending,
            coveragePercent, readinessMessage(reportStatus, blocking, warnings));
        return new ReportResponse(context, readiness, headline, reportRepository.organizationScope(companyId, unitId, businessId), statements, trialBalance, coverage,
            List.copyOf(findings), profile.notes());
    }

    @Transactional
    PeriodActionResponse closePeriod(long companyId, long userId, String periodKey) {
        // Same order as source posting and POS returns: company, then period/shift.
        ledgerRepository.lockCompanySources(companyId);
        YearMonth month = parsePeriodKey(periodKey);
        if (!month.atEndOfMonth().isBefore(LocalDate.now(timezones.resolve(companyId)))) {
            throw new IllegalArgumentException("El período debe haber terminado antes de cerrarlo.");
        }
        ledgerRepository.lockOpenPeriodForClose(companyId, periodKey);
        var report = report(companyId, month.atDay(1), month.atEndOfMonth(), null, null);
        if (!report.readiness().decisionReady()) {
            throw new IllegalStateException("The period has blocking accounting findings and cannot be closed.");
        }
        ledgerRepository.closePeriod(companyId, userId, periodKey);
        return new PeriodActionResponse(periodKey, "CLOSED", Instant.now(),
            "Periodo cerrado; los asientos publicados permanecen inmutables.");
    }

    @Transactional
    PeriodActionResponse reopenPeriod(long companyId, long userId, String periodKey, String reason) {
        parsePeriodKey(periodKey);
        String normalized = reason == null ? "" : reason.trim();
        if (normalized.length() < 10 || normalized.length() > 500) {
            throw new IllegalArgumentException("A reopen reason between 10 and 500 characters is required.");
        }
        ledgerRepository.reopenPeriod(companyId, userId, periodKey, normalized);
        return new PeriodActionResponse(periodKey, "OPEN", Instant.now(),
            "Periodo reabierto con motivo auditado.");
    }

    private List<QualityFinding> qualityFindings(
        long companyId,
        LocalDate from,
        LocalDate to,
        FinancialLedgerRepository.AccountingSettings settings,
        Map<String, BigDecimal> closing,
        Long unitId,
        Long businessId,
        AccountingPostingModels.Discovery allSources,
        AccountingPostingModels.Discovery discovery
    ) {
        var result = new ArrayList<QualityFinding>();
        reversals.pending(companyId, from, to, unitId, businessId).stream().map(FinancialSynchronizationService::toFinding).forEach(result::add);
        discovery.issues().stream().map(FinancialSynchronizationService::toFinding).forEach(result::add);
        ledgerRepository.missingPostedSources(companyId, from, to, allSources).stream()
            .filter(issue -> discoveryService.relevant(companyId, issue, unitId, businessId))
            .map(FinancialSynchronizationService::toFinding).forEach(result::add);
        for (var candidate : discovery.candidates()) {
            var existing = ledgerRepository.findEntry(companyId, candidate.sourceEventKey());
            if (existing.isEmpty()) {
                result.add(new QualityFinding("UNPOSTED_SOURCE_EVENT", "BLOCKING", "Operación pendiente",
                    "Una operación elegible aún no está en el mayor: " + candidate.description(),
                    "Ejecuta Sincronizar operaciones.", candidate.sourceModule(), 1));
            } else if (!existing.get().fingerprint().equals(candidate.sourceFingerprint())) {
                result.add(new QualityFinding("SOURCE_CHANGED_AFTER_POSTING", "BLOCKING", "Operación modificada",
                    "La fuente cambió después de contabilizarse: " + candidate.description(),
                    "Revierte el asiento y publica la corrección.", candidate.sourceModule(), 1));
            }
        }
        int imbalances = reportRepository.countUnbalancedEntries(companyId, from, to);
        if (imbalances > 0) {
            result.add(new QualityFinding("UNBALANCED_JOURNAL", "BLOCKING", "Mayor fuera de balance",
                imbalances + " asientos no cumplen débito = crédito.",
                "Bloquea el cierre y revisa la integridad del mayor.", "ledger", imbalances));
        }

        var balance = balanceMetrics(closing);
        for (var account : List.of("INVENTORY", "ACCOUNTS_RECEIVABLE", "ACCOUNTS_PAYABLE")) {
            if (value(closing, account).compareTo(TOLERANCE.negate()) < 0) {
                result.add(new QualityFinding("NEGATIVE_CONTROL_BALANCE", "BLOCKING", "Saldo de control negativo",
                    "La cuenta " + account + " presenta un saldo que requiere conciliación.",
                    "Revisa aperturas, pagos y movimientos faltantes antes de cerrar.", "ledger", 1));
            }
        }
        BigDecimal equationDifference = balance.assets().subtract(balance.liabilities()).subtract(balance.equity()).abs();
        if (equationDifference.compareTo(TOLERANCE) > 0) {
            result.add(new QualityFinding("ACCOUNTING_EQUATION_MISMATCH", "BLOCKING", "Ecuación contable sin conciliar",
                "Activos menos pasivos y patrimonio difieren por " + equationDifference + " " + settings.functionalCurrency() + ".",
                "Revisa saldos de apertura, clasificaciones y asientos de cierre.", "ledger", 1));
        }

        result.addAll(reconciliation.reconcile(companyId, to, unitId, businessId));
        return mergeFindings(result);
    }

    private List<SourceCoverage> sourceCoverage(
        long companyId,
        AccountingPostingModels.Discovery discovery,
        List<QualityFinding> findings
    ) {
        var modules = List.of("sales", "expenses", "receivables", "payroll", "inventory");
        var result = new ArrayList<SourceCoverage>();
        for (String module : modules) {
            int eligible = discovery.eligibleByModule().getOrDefault(module, 0);
            int posted = (int) discovery.candidates().stream().filter(candidate -> module.equals(candidate.sourceModule()))
                .filter(candidate -> ledgerRepository.findEntry(companyId, candidate.sourceEventKey())
                    .filter(entry -> "POSTED".equals(entry.status()) && candidate.sourceFingerprint().equals(entry.fingerprint())).isPresent()).count();
            int blocked = findings.stream()
                .filter(item -> module.equals(item.sourceModule())
                    && "BLOCKING".equals(item.severity())
                    && SOURCE_EVENT_BLOCKER_CODES.contains(item.code()))
                .mapToInt(item -> Math.max(1, item.affectedRecords())).sum();
            int percent = eligible == 0 ? 100 : Math.min(100, (int) Math.round(posted * 100.0 / eligible));
            result.add(new SourceCoverage(module, eligible, posted, blocked, percent,
                blocked > 0 ? "BLOCKED" : (posted < eligible ? "PENDING" : "READY")));
        }
        return result;
    }

    private static FinancialStatement profitStatement(Map<String, BigDecimal> current, Map<String, BigDecimal> comparative) {
        var now = profitMetrics(current);
        var before = profitMetrics(comparative);
        var lines = List.of(
            statementLine("REVENUE", "Ingresos por actividades ordinarias", 0, false, now.revenue(), before.revenue()),
            statementLine("COST_OF_SALES", "Costo de ventas", 0, false, now.costOfSales(), before.costOfSales()),
            statementLine("GROSS_PROFIT", "Utilidad bruta", 0, true, now.grossProfit(), before.grossProfit()),
            statementLine("OPERATING_EXPENSES", "Gastos operativos", 0, false, now.operatingExpenses(), before.operatingExpenses()),
            statementLine("OTHER_INCOME", "Otros ingresos", 0, false, now.otherIncome(), before.otherIncome()),
            statementLine("OPERATING_PROFIT", "Utilidad operativa", 0, true, now.operatingProfit(), before.operatingProfit()),
            statementLine("FINANCE_EXPENSE", "Costos financieros", 0, false, now.financeExpense(), before.financeExpense()),
            statementLine("INCOME_TAX", "Impuesto a las ganancias", 0, false, now.incomeTax(), before.incomeTax()),
            statementLine("NET_PROFIT", "Utilidad neta", 0, true, now.netProfit(), before.netProfit())
        );
        return new FinancialStatement("profit-loss", "Estado de resultados", "Desempeño del periodo y comparativo equivalente.",
            "IFRS for SMEs §5 / IFRS 18", lines, true);
    }

    private static FinancialStatement financialPositionStatement(
        Map<String, BigDecimal> current,
        Map<String, BigDecimal> comparative
    ) {
        var now = balanceMetrics(current);
        var before = balanceMetrics(comparative);
        var lines = List.of(
            statementLine("CASH", "Efectivo y equivalentes", 1, false, value(current, "CASH"), value(comparative, "CASH")),
            statementLine("RECEIVABLES", "Cuentas por cobrar", 1, false, value(current, "ACCOUNTS_RECEIVABLE"), value(comparative, "ACCOUNTS_RECEIVABLE")),
            statementLine("INVENTORY", "Inventarios", 1, false, value(current, "INVENTORY"), value(comparative, "INVENTORY")),
            statementLine("PURCHASE_TAX_PENDING", "Impuestos de compras pendientes de clasificación", 1, false,
                value(current, "PURCHASE_TAX_PENDING"), value(comparative, "PURCHASE_TAX_PENDING")),
            statementLine("PPE", "Propiedad, planta y equipo neto", 1, false, now.propertyPlantEquipment(), before.propertyPlantEquipment()),
            statementLine("TOTAL_ASSETS", "Total activos", 0, true, now.assets(), before.assets()),
            statementLine("PAYABLES", "Cuentas por pagar", 1, false, value(current, "ACCOUNTS_PAYABLE"), value(comparative, "ACCOUNTS_PAYABLE")),
            statementLine("PAYROLL_LIABILITIES", "Pasivos de nómina", 1, false, now.payrollLiabilities(), before.payrollLiabilities()),
            statementLine("TAXES_PAYABLE", "Impuestos por pagar", 1, false, value(current, "TAXES_PAYABLE"), value(comparative, "TAXES_PAYABLE")),
            statementLine("TOTAL_LIABILITIES", "Total pasivos", 0, true, now.liabilities(), before.liabilities()),
            statementLine("BASE_EQUITY", "Capital y resultados acumulados", 1, false, now.baseEquity(), before.baseEquity()),
            statementLine("ACCUMULATED_RESULT", "Resultado acumulado del mayor", 1, false, now.accumulatedResult(), before.accumulatedResult()),
            statementLine("TOTAL_EQUITY", "Total patrimonio", 0, true, now.equity(), before.equity()),
            statementLine("LIABILITIES_EQUITY", "Pasivos y patrimonio", 0, true,
                now.liabilities().add(now.equity()), before.liabilities().add(before.equity()))
        );
        boolean balanced = now.assets().subtract(now.liabilities()).subtract(now.equity()).abs().compareTo(TOLERANCE) <= 0;
        return new FinancialStatement("financial-position", "Estado de situación financiera",
            "Recursos, obligaciones y patrimonio al cierre.", "IFRS for SMEs §4 / IAS 1", lines, balanced);
    }

    private static FinancialStatement cashFlowStatement(
        Map<String, BigDecimal> current, Map<String, BigDecimal> comparative,
        Map<String, BigDecimal> opening, Map<String, BigDecimal> closing,
        Map<String, BigDecimal> comparativeOpening, Map<String, BigDecimal> comparativeClosing
    ) {
        var now = cashMetrics(current);
        var before = cashMetrics(comparative);
        var lines = List.of(
            statementLine("OPENING_CASH", "Efectivo inicial", 0, true, value(opening, "CASH"), value(comparativeOpening, "CASH")),
            statementLine("OPENING_ADJUSTMENTS", "Saldos de apertura incorporados", 1, false, value(current, "OPENING"), value(comparative, "OPENING")),
            statementLine("CUSTOMER_COLLECTIONS", "Cobros de clientes", 1, false, now.customerCollections(), before.customerCollections()),
            statementLine("SUPPLIER_PAYMENTS", "Pagos a proveedores y gastos", 1, false, now.supplierPayments(), before.supplierPayments()),
            statementLine("PAYROLL_PAYMENTS", "Pagos de nómina", 1, false, now.payrollPayments(), before.payrollPayments()),
            statementLine("OTHER_OPERATING_CASH", "Otros movimientos de operación", 1, false, now.otherOperating(), before.otherOperating()),
            statementLine("OPERATING_CASH", "Flujo neto de operación", 0, true, now.operating(), before.operating()),
            statementLine("INVESTING_CASH", "Flujo neto de inversión", 0, true, now.investing(), before.investing()),
            statementLine("FINANCING_CASH", "Flujo neto de financiamiento", 0, true, now.financing(), before.financing()),
            statementLine("NET_CASH_CHANGE", "Cambio neto en efectivo", 0, true, now.netChange(), before.netChange()),
            statementLine("CLOSING_CASH", "Efectivo final", 0, true, value(closing, "CASH"), value(comparativeClosing, "CASH"))
        );
        return new FinancialStatement("cash-flow", "Estado de flujos de efectivo",
            "Clasificación de movimientos registrados en cuentas de efectivo.", "IFRS for SMEs §7 / IAS 7", lines,
            value(opening, "CASH").add(value(current, "OPENING")).add(now.netChange()).subtract(value(closing, "CASH")).abs().compareTo(TOLERANCE) <= 0);
    }

    private static FinancialStatement equityStatement(
        Map<String, BigDecimal> opening,
        Map<String, BigDecimal> closing,
        Map<String, BigDecimal> comparativeClosing,
        Map<String, BigDecimal> period,
        Map<String, BigDecimal> comparativePeriod,
        Map<String, BigDecimal> comparativeOpening
    ) {
        var start = balanceMetrics(opening);
        var end = balanceMetrics(closing);
        var compare = balanceMetrics(comparativeClosing);
        var compareStart = balanceMetrics(comparativeOpening);
        var currentProfit = profitMetrics(period).netProfit();
        var comparativeProfit = profitMetrics(comparativePeriod).netProfit();
        var lines = List.of(
            statementLine("OPENING_EQUITY", "Patrimonio inicial", 0, false, start.equity(), compareStart.equity()),
            statementLine("PERIOD_RESULT", "Resultado del periodo", 1, false, currentProfit, comparativeProfit),
            statementLine("OTHER_EQUITY_CHANGES", "Aportaciones y otros movimientos", 1, false,
                end.equity().subtract(start.equity()).subtract(currentProfit),
                compare.equity().subtract(compareStart.equity()).subtract(comparativeProfit)),
            statementLine("CLOSING_EQUITY", "Patrimonio final", 0, true, end.equity(), compare.equity())
        );
        return new FinancialStatement("changes-equity", "Estado de cambios en el patrimonio",
            "Puente entre el patrimonio inicial y final.", "IFRS for SMEs §6 / IAS 1", lines, true);
    }

    static ProfitMetrics profitMetrics(Map<String, BigDecimal> totals) {
        BigDecimal revenue = value(totals, "REVENUE");
        BigDecimal exchangeGain = value(totals, "REALIZED_EXCHANGE_GAIN");
        BigDecimal otherIncome = value(totals, "TYPE:REVENUE").subtract(revenue).subtract(exchangeGain);
        BigDecimal cogs = value(totals, "COST_OF_SALES");
        BigDecimal financeCosts = value(totals, "FINANCE_EXPENSE").add(value(totals, "REALIZED_EXCHANGE_LOSS"));
        BigDecimal finance = financeCosts.subtract(exchangeGain);
        BigDecimal tax = value(totals, "INCOME_TAX_EXPENSE");
        BigDecimal expenses = value(totals, "TYPE:EXPENSE");
        BigDecimal operatingExpenses = expenses.subtract(cogs).subtract(financeCosts).subtract(tax);
        BigDecimal gross = revenue.subtract(cogs);
        BigDecimal operating = gross.add(otherIncome).subtract(operatingExpenses);
        BigDecimal net = operating.subtract(finance).subtract(tax);
        return new ProfitMetrics(money(revenue), money(otherIncome), money(cogs), money(operatingExpenses),
            money(gross), money(operating), money(finance), money(tax), money(net));
    }

    private static BalanceMetrics balanceMetrics(Map<String, BigDecimal> totals) {
        BigDecimal assets = value(totals, "TYPE:ASSET");
        BigDecimal liabilities = value(totals, "TYPE:LIABILITY");
        BigDecimal baseEquity = value(totals, "TYPE:EQUITY");
        BigDecimal result = value(totals, "TYPE:REVENUE").subtract(value(totals, "TYPE:EXPENSE"))
            .add(value(totals, "TYPE:OCI"));
        BigDecimal equity = baseEquity.add(result);
        BigDecimal ppe = value(totals, "PROPERTY_PLANT_EQUIPMENT")
            .subtract(value(totals, "ACCUMULATED_DEPRECIATION"));
        BigDecimal payroll = value(totals, "PAYROLL_PAYABLE").add(value(totals, "PAYROLL_WITHHOLDINGS"));
        return new BalanceMetrics(money(assets), money(liabilities), money(baseEquity), money(result),
            money(equity), money(ppe), money(payroll));
    }

    private static CashMetrics cashMetrics(Map<String, BigDecimal> cash) {
        BigDecimal collections = value(cash, "CUSTOMER_COLLECTIONS");
        BigDecimal supplier = value(cash, "EXPENSE_PAYMENT");
        BigDecimal payroll = value(cash, "PAYROLL_PAYMENT");
        BigDecimal other = value(cash, "OTHER_OPERATING");
        BigDecimal operating = collections.add(supplier).add(payroll).add(other);
        BigDecimal investing = value(cash, "INVESTING"), financing = value(cash, "FINANCING");
        return new CashMetrics(money(collections), money(supplier), money(payroll), money(other), money(operating),
            money(investing), money(financing), money(operating.add(investing).add(financing)));
    }

    private static StatementLine statementLine(
        String code,
        String label,
        int level,
        boolean subtotal,
        BigDecimal current,
        BigDecimal comparative
    ) {
        BigDecimal variance = money(current.subtract(comparative));
        BigDecimal percent = comparative.abs().compareTo(TOLERANCE) <= 0 ? ZERO
            : variance.divide(comparative.abs(), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        String tone = variance.signum() > 0 ? "UP" : variance.signum() < 0 ? "DOWN" : "FLAT";
        return new StatementLine(code, label, level, subtotal, money(current), money(comparative),
            variance, money(percent), tone);
    }

    private static void addReconciliation(
        List<QualityFinding> findings,
        String code,
        String title,
        String module,
        BigDecimal subledger,
        BigDecimal ledger
    ) {
        BigDecimal difference = subledger.subtract(ledger).abs();
        if (difference.compareTo(TOLERANCE) > 0) {
            findings.add(new QualityFinding(code, "BLOCKING", title,
                "El auxiliar reporta " + subledger + " y el mayor " + ledger + "; diferencia " + difference + ".",
                "Registra saldos de apertura o corrige operaciones pendientes antes del cierre.", module, 1));
        }
    }

    private static List<QualityFinding> mergeFindings(List<QualityFinding> source) {
        var merged = new LinkedHashMap<String, QualityFinding>();
        for (var item : source) {
            String key = item.code() + "|" + item.severity() + "|" + item.sourceModule();
            merged.merge(key, item, (left, right) -> new QualityFinding(left.code(), left.severity(), left.title(),
                left.detail(), left.action(), left.sourceModule(), left.affectedRecords() + right.affectedRecords()));
        }
        return new ArrayList<>(merged.values());
    }

    void validateScope(long companyId, Long unitId, Long businessId) {
        if (businessId != null && unitId == null) {
            throw new IllegalArgumentException("unitId is required when businessId is selected.");
        }
        if (unitId != null) {
            Integer count = reportRepositoryScopeCount("units", companyId, unitId, null);
            if (count != 1) {
                throw new IllegalArgumentException("unitId is outside the authenticated company.");
            }
        }
        if (businessId != null) {
            Integer count = reportRepositoryScopeCount("businesses", companyId, businessId, unitId);
            if (count != 1) {
                throw new IllegalArgumentException("businessId is outside the selected company and unit.");
            }
        }
    }

    private int reportRepositoryScopeCount(String table, long companyId, long id, Long unitId) {
        return reportRepository.scopeCount(table, companyId, id, unitId);
    }

    private static YearMonth parsePeriodKey(String periodKey) {
        try {
            return YearMonth.parse(periodKey);
        } catch (Exception ex) {
            throw new IllegalArgumentException("periodKey must use YYYY-MM.");
        }
    }

    private static String readinessMessage(String status, int blocking, int warnings) {
        if ("CLOSED".equals(status)) {
            return "Periodo cerrado y protegido contra nuevas contabilizaciones.";
        }
        if ("READY".equals(status)) {
            return warnings > 0
                ? "El reporte está balanceado; conserva advertencias informativas para revisión."
                : "El reporte está balanceado y listo para revisión.";
        }
        return "Resuelve " + blocking + " hallazgos bloqueantes antes de usar las cifras como definitivas.";
    }

    static BigDecimal value(Map<String, BigDecimal> values, String key) {
        return money(values.getOrDefault(key, ZERO));
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }

    record ProfitMetrics(
        BigDecimal revenue,
        BigDecimal otherIncome,
        BigDecimal costOfSales,
        BigDecimal operatingExpenses,
        BigDecimal grossProfit,
        BigDecimal operatingProfit,
        BigDecimal financeExpense,
        BigDecimal incomeTax,
        BigDecimal netProfit
    ) {
    }

    private record BalanceMetrics(
        BigDecimal assets,
        BigDecimal liabilities,
        BigDecimal baseEquity,
        BigDecimal accumulatedResult,
        BigDecimal equity,
        BigDecimal propertyPlantEquipment,
        BigDecimal payrollLiabilities
    ) {
    }

    private record CashMetrics(
        BigDecimal customerCollections,
        BigDecimal supplierPayments,
        BigDecimal payrollPayments,
        BigDecimal otherOperating,
        BigDecimal operating,
        BigDecimal investing,
        BigDecimal financing,
        BigDecimal netChange
    ) {
    }
}
