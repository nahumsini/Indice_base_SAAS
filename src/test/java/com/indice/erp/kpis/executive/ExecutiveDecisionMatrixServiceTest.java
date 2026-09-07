package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ExecutiveDecisionMatrixServiceTest {

    private ExecutiveDecisionMatrixService service;
    private ExecutiveKpiScope scope;

    @BeforeEach
    void setUp() {
        service = new ExecutiveDecisionMatrixService();
        scope = new ExecutiveKpiScope(
                1L, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31),
                "custom", null, null, "", "all", "MXN", LocalDate.of(2026, 8, 31));
    }

    @Test
    void classifiesBusinessHealthFromMarginAndExecution() {
        var rows = List.of(
                organizationRow(1L, "Motor", 30, 90),
                organizationRow(2L, "Potencial", 5, 90),
                organizationRow(3L, "Frágil", 30, 40),
                organizationRow(4L, "Intervención", 5, 40));

        var result = service.build(scope, rows, portfolio(List.of()), List.of("MXN"));

        assertThat(result.contractVersion()).isEqualTo("1.0");
        assertThat(result.businessHealth().items())
                .extracting(ExecutiveDecisionMatrixContracts.BusinessHealthItem::quadrant)
                .containsExactlyInAnyOrder(
                        "engine", "contained_potential", "fragile_growth", "priority_intervention");
        assertThat(result.businessHealth().dataQuality().decisionReady()).isTrue();
    }

    @Test
    void classifiesProfitabilityAndInventoryWithoutInventingMissingCost() {
        var products = List.of(
                product(1L, "Ganador", 310, 1000, 40, 20, true),
                product(2L, "Volumen", 310, 1000, 10, 20, true),
                product(3L, "Joya", 31, 1000, 40, 100, true),
                product(4L, "Sin costo", 31, 1000, null, 100, false));

        var result = service.build(scope, List.of(), portfolio(products), List.of("MXN"));

        assertThat(result.productProfitability().items())
                .filteredOn(ExecutiveDecisionMatrixContracts.ProductProfitabilityItem::decisionReady)
                .extracting(ExecutiveDecisionMatrixContracts.ProductProfitabilityItem::quadrant)
                .contains("winner", "sacrificed_volume", "hidden_gem");
        assertThat(result.productProfitability().items())
                .filteredOn(item -> item.productId() == 4L)
                .singleElement()
                .satisfies(item -> assertThat(item.quadrant()).isEqualTo("unclassified"));
        assertThat(result.inventoryIntelligence().items())
                .extracting(ExecutiveDecisionMatrixContracts.InventoryIntelligenceItem::quadrant)
                .contains("stockout_risk", "overstock");
    }

    private Map<String, Object> organizationRow(long id, String name, double margin, double completion) {
        var row = new LinkedHashMap<String, Object>();
        row.put("unitId", id);
        row.put("unitName", "Unidad " + id);
        row.put("businessId", id);
        row.put("businessName", name);
        row.put("salesTotal", 1160.0);
        row.put("recognizedRevenue", 1000.0);
        row.put("profitReady", true);
        row.put("operatingProfit", margin * 10);
        row.put("operatingMargin", margin);
        row.put("totalTasks", 10);
        row.put("closedTasks", (int) Math.round(completion / 10));
        row.put("overdueTasks", completion >= 70 ? 0 : 6);
        row.put("taskCompletionRate", completion);
        row.put("attendanceRecords", 10);
        row.put("attendanceRate", completion);
        row.put("overdueReceivables", 0.0);
        return row;
    }

    private ExecutiveProductPortfolioContracts.Product product(
            long id,
            String name,
            double units,
            double revenue,
            Integer marginPercent,
            double available,
            boolean costAvailable) {
        var margin = marginPercent == null ? null : BigDecimal.valueOf(revenue * marginPercent / 100.0);
        var cost = margin == null ? null : BigDecimal.valueOf(revenue).subtract(margin);
        return new ExecutiveProductPortfolioContracts.Product(
                id, name, "SKU-" + id, "Categoría", "star",
                BigDecimal.valueOf(revenue), BigDecimal.valueOf(revenue / 2), new BigDecimal("100"),
                new BigDecimal("25"), new BigDecimal("100"), BigDecimal.valueOf(units), BigDecimal.ZERO,
                2, 1, cost, margin, marginPercent == null ? null : BigDecimal.valueOf(marginPercent), costAvailable,
                "healthy", BigDecimal.valueOf(available), BigDecimal.TEN, 1, false);
    }

    private ExecutiveProductPortfolioContracts.Portfolio portfolio(
            List<ExecutiveProductPortfolioContracts.Product> products) {
        return new ExecutiveProductPortfolioContracts.Portfolio(
                "1.0",
                new ExecutiveProductPortfolioContracts.Methodology(
                        "test", "1.0", "share", "growth", new BigDecimal("50"), BigDecimal.ZERO,
                        new BigDecimal("-100"), new BigDecimal("100"), 40, false),
                "MXN",
                new ExecutiveProductPortfolioContracts.Range("2026-08-01", "2026-08-31"),
                new ExecutiveProductPortfolioContracts.Range("2026-07-01", "2026-07-31"),
                BigDecimal.valueOf(products.stream().mapToDouble(item -> item.currentRevenue().doubleValue()).sum()),
                BigDecimal.ZERO,
                products.size(), products.size(), 0, products.size(), false,
                new ArrayList<>(), products,
                new ExecutiveProductPortfolioContracts.DataQuality(
                        true, false, List.of(), List.of(), 0, 0, 0, 0,
                        "test", "2026-08-31", "test"));
    }
}
