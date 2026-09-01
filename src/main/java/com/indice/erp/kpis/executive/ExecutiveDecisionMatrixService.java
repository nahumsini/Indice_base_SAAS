package com.indice.erp.kpis.executive;

import static com.indice.erp.kpis.executive.ExecutiveDecisionMatrixContracts.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ExecutiveDecisionMatrixService {

    private static final BigDecimal HIGH_EXECUTION = new BigDecimal("70.00");
    private static final BigDecimal HIGH_MARGIN = new BigDecimal("10.00");
    private static final BigDecimal HIGH_PRODUCT_MARGIN = new BigDecimal("20.00");
    private static final BigDecimal LOW_COVERAGE_DAYS = new BigDecimal("14.00");
    private static final BigDecimal HIGH_COVERAGE_DAYS = new BigDecimal("60.00");

    public Dashboard build(
            ExecutiveKpiScope scope,
            List<Map<String, Object>> organizationRows,
            ExecutiveProductPortfolioContracts.Portfolio portfolio,
            List<String> nativeCurrencies) {
        var safeRows = organizationRows == null ? List.<Map<String, Object>>of() : organizationRows;
        var safeCurrencies = nativeCurrencies == null ? List.<String>of() : nativeCurrencies;
        var safePortfolio = portfolio == null ? emptyPortfolio(scope) : portfolio;
        return new Dashboard(
                "1.0",
                scope.preferredCurrency(),
                new Range(scope.from().toString(), scope.to().toString()),
                businessHealth(safeRows, safeCurrencies),
                productProfitability(scope, safePortfolio),
                inventoryIntelligence(scope, safePortfolio));
    }

    private BusinessHealthMatrix businessHealth(
            List<Map<String, Object>> rows,
            List<String> nativeCurrencies) {
        var singleCurrency = nativeCurrencies.stream().distinct().count() <= 1;
        var items = rows.stream().map(row -> {
            var totalTasks = integer(row.get("totalTasks"));
            var attendanceRecords = integer(row.get("attendanceRecords"));
            var taskCompletion = decimal(row.get("taskCompletionRate"));
            var attendance = decimal(row.get("attendanceRate"));
            var overdueTasks = integer(row.get("overdueTasks"));
            var backlogScore = totalTasks <= 0
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(Math.max(0, 100 - percent(overdueTasks, totalTasks)));
            var execution = executionScore(taskCompletion, attendance, backlogScore, totalTasks, attendanceRecords);
            var revenue = decimal(row.get("salesTotal"));
            var margin = decimal(row.get("operatingMargin"));
            var ready = revenue.compareTo(BigDecimal.ZERO) > 0 && totalTasks > 0;
            return new BusinessHealthItem(
                    itemId(row),
                    nullableLong(row.get("unitId")),
                    text(row.get("unitName"), "Sin unidad"),
                    nullableLong(row.get("businessId")),
                    text(row.get("businessName"), "Sin negocio"),
                    money(revenue),
                    money(decimal(row.get("operatingProfit"))),
                    scale(margin),
                    scale(execution),
                    scale(taskCompletion),
                    scale(attendance),
                    overdueTasks,
                    money(decimal(row.get("overdueReceivables"))),
                    healthQuadrant(execution, margin, ready),
                    ready);
        }).sorted(Comparator.comparing(BusinessHealthItem::revenue).reversed()
                .thenComparing(BusinessHealthItem::businessName)).toList();

        var issues = new ArrayList<String>();
        if (rows.isEmpty()) issues.add("No hay unidades o negocios disponibles en el alcance.");
        if (!singleCurrency) issues.add("La lectura monetaria por unidad mezcla monedas de origen y requiere consolidación.");
        var unavailable = items.stream().filter(item -> !item.decisionReady()).count();
        if (unavailable > 0) issues.add(unavailable + " unidades o negocios no tienen ventas y tareas suficientes para clasificarse.");
        var readyCount = items.size() - unavailable;
        return new BusinessHealthMatrix(
                HIGH_EXECUTION,
                HIGH_MARGIN,
                items,
                new MatrixQuality(
                        readyCount > 0 && issues.isEmpty(),
                        readyCount < items.size() || !issues.isEmpty(),
                        List.copyOf(issues),
                        "sales_records + finance_expenses + process_tasks + attendance/repeatable-read",
                        "Matriz interna: rentabilidad operativa y ejecución observada; no usa referencias externas."));
    }

    private ProductProfitabilityMatrix productProfitability(
            ExecutiveKpiScope scope,
            ExecutiveProductPortfolioContracts.Portfolio portfolio) {
        var days = periodDays(scope);
        var eligibleVelocity = portfolio.items().stream()
                .filter(item -> item.costAvailable() && item.currentRevenue().compareTo(BigDecimal.ZERO) > 0)
                .map(item -> perDay(item.currentUnits(), days))
                .filter(value -> value.compareTo(BigDecimal.ZERO) > 0)
                .sorted()
                .toList();
        var highVelocity = median(eligibleVelocity);
        var items = portfolio.items().stream().map(item -> {
            var velocity = perDay(item.currentUnits(), days);
            var ready = item.costAvailable()
                    && item.currentRevenue().compareTo(BigDecimal.ZERO) > 0
                    && item.contributionMarginPercent() != null;
            return new ProductProfitabilityItem(
                    item.productId(), item.productName(), item.sku(), item.category(),
                    money(item.currentRevenue()), nullableMoney(item.currentCost()),
                    nullableMoney(item.contributionMargin()), nullableScale(item.contributionMarginPercent()),
                    scale(item.currentUnits()), velocity, nullableScale(item.availableQuantity()), item.stockStatus(),
                    profitabilityQuadrant(velocity, item.contributionMarginPercent(), highVelocity, ready), ready);
        }).sorted(Comparator.comparing(ProductProfitabilityItem::revenue).reversed()
                .thenComparing(ProductProfitabilityItem::productName)).toList();

        var missingCost = items.stream().filter(item -> !item.decisionReady()).count();
        var issues = new ArrayList<String>();
        if (items.isEmpty()) issues.add("No hay productos vendidos atribuibles en el periodo.");
        if (missingCost > 0) issues.add(missingCost + " productos no tienen costo completo en sus renglones de venta.");
        if (portfolio.dataQuality().partial()) issues.add("El portafolio de origen contiene exclusiones o evidencia parcial.");
        var readyCount = items.size() - missingCost;
        return new ProductProfitabilityMatrix(
                highVelocity,
                HIGH_PRODUCT_MARGIN,
                items,
                new MatrixQuality(
                        readyCount > 0 && issues.isEmpty(),
                        readyCount < items.size() || !issues.isEmpty(),
                        List.copyOf(issues),
                        "sales_records.sale_lines_json unitCost + quantity + net revenue/repeatable-read",
                        "El margen es contribución estimada con el costo capturado en la venta; no sustituye contabilidad de costos."));
    }

    private InventoryIntelligenceMatrix inventoryIntelligence(
            ExecutiveKpiScope scope,
            ExecutiveProductPortfolioContracts.Portfolio portfolio) {
        var days = periodDays(scope);
        var items = portfolio.items().stream().map(item -> {
            var velocity = perDay(item.currentUnits(), days);
            var tracked = item.availableQuantity() != null
                    && !"not_tracked".equals(item.stockStatus())
                    && !"unavailable".equals(item.stockStatus());
            var coverage = tracked && velocity.compareTo(BigDecimal.ZERO) > 0
                    ? item.availableQuantity().max(BigDecimal.ZERO).divide(velocity, 2, RoundingMode.HALF_UP)
                    : null;
            return new InventoryIntelligenceItem(
                    item.productId(), item.productName(), item.sku(), item.category(), money(item.currentRevenue()),
                    scale(item.currentUnits()), velocity, nullableScale(item.availableQuantity()),
                    nullableScale(item.minimumQuantity()), coverage, item.stockStatus(),
                    inventoryQuadrant(item.availableQuantity(), velocity, coverage, tracked), tracked);
        }).sorted(Comparator.comparing(InventoryIntelligenceItem::revenue).reversed()
                .thenComparing(InventoryIntelligenceItem::productName)).toList();

        var unavailable = items.stream().filter(item -> !item.decisionReady()).count();
        var issues = new ArrayList<String>();
        if (items.isEmpty()) issues.add("No hay productos vendidos atribuibles para cruzar con inventario.");
        if (unavailable > 0) issues.add(unavailable + " productos no tienen inventario rastreable y válido.");
        if (portfolio.dataQuality().partial()) issues.add("El portafolio de origen contiene exclusiones o evidencia parcial.");
        var readyCount = items.size() - unavailable;
        return new InventoryIntelligenceMatrix(
                LOW_COVERAGE_DAYS,
                HIGH_COVERAGE_DAYS,
                items,
                new MatrixQuality(
                        readyCount > 0 && issues.isEmpty(),
                        readyCount < items.size() || !issues.isEmpty(),
                        List.copyOf(issues),
                        "sales_records.sale_lines_json + sales_inventory_balances/repeatable-read",
                        "La cobertura usa la velocidad promedio del periodo y el saldo actual; es una orientación operativa."));
    }

    private BigDecimal executionScore(
            BigDecimal taskCompletion,
            BigDecimal attendance,
            BigDecimal backlog,
            int totalTasks,
            int attendanceRecords) {
        if (totalTasks > 0 && attendanceRecords > 0) {
            return taskCompletion.multiply(new BigDecimal("0.65"))
                    .add(backlog.multiply(new BigDecimal("0.15")))
                    .add(attendance.multiply(new BigDecimal("0.20")));
        }
        if (totalTasks > 0) {
            return taskCompletion.multiply(new BigDecimal("0.80"))
                    .add(backlog.multiply(new BigDecimal("0.20")));
        }
        return attendanceRecords > 0 ? attendance : BigDecimal.ZERO;
    }

    private String healthQuadrant(BigDecimal execution, BigDecimal margin, boolean ready) {
        if (!ready) return "unclassified";
        var highExecution = execution.compareTo(HIGH_EXECUTION) >= 0;
        var highMargin = margin.compareTo(HIGH_MARGIN) >= 0;
        if (highExecution && highMargin) return "engine";
        if (highExecution) return "contained_potential";
        if (highMargin) return "fragile_growth";
        return "priority_intervention";
    }

    private String profitabilityQuadrant(
            BigDecimal velocity,
            BigDecimal margin,
            BigDecimal highVelocity,
            boolean ready) {
        if (!ready || margin == null) return "unclassified";
        var fast = velocity.compareTo(highVelocity) >= 0;
        var profitable = margin.compareTo(HIGH_PRODUCT_MARGIN) >= 0;
        if (fast && profitable) return "winner";
        if (fast) return "sacrificed_volume";
        if (profitable) return "hidden_gem";
        return "catalog_drain";
    }

    private String inventoryQuadrant(
            BigDecimal available,
            BigDecimal velocity,
            BigDecimal coverage,
            boolean tracked) {
        if (!tracked || available == null) return "unclassified";
        if (available.compareTo(BigDecimal.ZERO) <= 0 && velocity.compareTo(BigDecimal.ZERO) > 0) return "stockout_risk";
        if (velocity.compareTo(BigDecimal.ZERO) <= 0 && available.compareTo(BigDecimal.ZERO) > 0) return "stagnant";
        if (coverage == null) return "unclassified";
        if (coverage.compareTo(LOW_COVERAGE_DAYS) < 0) return "stockout_risk";
        if (coverage.compareTo(HIGH_COVERAGE_DAYS) > 0) return "overstock";
        return "balanced";
    }

    private int periodDays(ExecutiveKpiScope scope) {
        return Math.max(1, (int) ChronoUnit.DAYS.between(scope.from(), scope.to()) + 1);
    }

    private BigDecimal perDay(BigDecimal units, int days) {
        return scale((units == null ? BigDecimal.ZERO : units)
                .divide(BigDecimal.valueOf(days), 4, RoundingMode.HALF_UP));
    }

    private BigDecimal median(List<BigDecimal> values) {
        if (values.isEmpty()) return BigDecimal.ONE.setScale(2);
        var middle = values.size() / 2;
        if (values.size() % 2 == 1) return scale(values.get(middle));
        return scale(values.get(middle - 1).add(values.get(middle))
                .divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP));
    }

    private String itemId(Map<String, Object> row) {
        return String.valueOf(row.get("unitId")) + "|" + String.valueOf(row.get("businessId"));
    }

    private BigDecimal decimal(Object value) {
        return value instanceof Number number ? BigDecimal.valueOf(number.doubleValue()) : BigDecimal.ZERO;
    }

    private int integer(Object value) {
        return value instanceof Number number ? number.intValue() : 0;
    }

    private Long nullableLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private String text(Object value, String fallback) {
        var resolved = value == null ? "" : String.valueOf(value).trim();
        return resolved.isEmpty() ? fallback : resolved;
    }

    private double percent(double value, double total) {
        return total <= 0 ? 0 : (value * 100.0) / total;
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal nullableMoney(BigDecimal value) {
        return value == null ? null : money(value);
    }

    private BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal nullableScale(BigDecimal value) {
        return value == null ? null : scale(value);
    }

    private ExecutiveProductPortfolioContracts.Portfolio emptyPortfolio(ExecutiveKpiScope scope) {
        return new ExecutiveProductPortfolioContracts.Portfolio(
                "1.0",
                new ExecutiveProductPortfolioContracts.Methodology(
                        "unavailable", "1.0", "", "", BigDecimal.ZERO, BigDecimal.ZERO,
                        BigDecimal.ZERO, BigDecimal.ZERO, 0, false),
                scope.preferredCurrency(),
                new ExecutiveProductPortfolioContracts.Range(scope.from().toString(), scope.to().toString()),
                new ExecutiveProductPortfolioContracts.Range(scope.from().toString(), scope.to().toString()),
                BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, 0, 0, false, List.of(), List.of(),
                new ExecutiveProductPortfolioContracts.DataQuality(
                        false, true, List.of("Portafolio no disponible."), List.of(),
                        0, 0, 0, 0, "unavailable", scope.snapshotDate().toString(), "Sin evidencia."));
    }
}
