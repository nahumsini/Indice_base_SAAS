package com.indice.erp.kpis.executive;

import java.math.BigDecimal;
import java.util.List;

public final class ExecutiveDecisionMatrixContracts {

    private ExecutiveDecisionMatrixContracts() {
    }

    public record Dashboard(
            String contractVersion,
            String preferredCurrency,
            Range range,
            BusinessHealthMatrix businessHealth,
            ProductProfitabilityMatrix productProfitability,
            InventoryIntelligenceMatrix inventoryIntelligence) {
    }

    public record Range(String from, String to) {
    }

    public record MatrixQuality(
            boolean decisionReady,
            boolean partial,
            List<String> issues,
            String generatedFrom,
            String note) {
    }

    public record BusinessHealthMatrix(
            BigDecimal highExecutionThreshold,
            BigDecimal highMarginThreshold,
            List<BusinessHealthItem> items,
            MatrixQuality dataQuality) {
    }

    public record BusinessHealthItem(
            String itemId,
            Long unitId,
            String unitName,
            Long businessId,
            String businessName,
            BigDecimal revenue,
            BigDecimal operatingProfit,
            BigDecimal operatingMarginPercent,
            BigDecimal executionScore,
            BigDecimal taskCompletionRate,
            BigDecimal attendanceRate,
            int overdueTasks,
            BigDecimal overdueReceivables,
            String quadrant,
            boolean decisionReady) {
    }

    public record ProductProfitabilityMatrix(
            BigDecimal highVelocityThresholdPerDay,
            BigDecimal highMarginThresholdPercent,
            List<ProductProfitabilityItem> items,
            MatrixQuality dataQuality) {
    }

    public record ProductProfitabilityItem(
            long productId,
            String productName,
            String sku,
            String category,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal contributionMargin,
            BigDecimal contributionMarginPercent,
            BigDecimal unitsSold,
            BigDecimal salesVelocityPerDay,
            BigDecimal availableQuantity,
            String stockStatus,
            String quadrant,
            boolean decisionReady) {
    }

    public record InventoryIntelligenceMatrix(
            BigDecimal lowCoverageThresholdDays,
            BigDecimal highCoverageThresholdDays,
            List<InventoryIntelligenceItem> items,
            MatrixQuality dataQuality) {
    }

    public record InventoryIntelligenceItem(
            long productId,
            String productName,
            String sku,
            String category,
            BigDecimal revenue,
            BigDecimal unitsSold,
            BigDecimal salesVelocityPerDay,
            BigDecimal availableQuantity,
            BigDecimal minimumQuantity,
            BigDecimal stockCoverageDays,
            String stockStatus,
            String quadrant,
            boolean decisionReady) {
    }
}
