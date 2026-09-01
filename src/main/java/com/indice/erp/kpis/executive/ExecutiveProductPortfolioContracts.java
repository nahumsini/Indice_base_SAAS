package com.indice.erp.kpis.executive;

import java.math.BigDecimal;
import java.util.List;

public final class ExecutiveProductPortfolioContracts {

    private ExecutiveProductPortfolioContracts() {
    }

    public record Portfolio(
            String contractVersion,
            Methodology methodology,
            String preferredCurrency,
            Range currentRange,
            Range comparisonRange,
            BigDecimal totalRevenue,
            BigDecimal previousTotalRevenue,
            int eligibleProducts,
            int classifiedProducts,
            int unclassifiedProducts,
            int displayedProducts,
            boolean truncated,
            List<QuadrantSummary> quadrants,
            List<Product> items,
            DataQuality dataQuality) {
    }

    public record Methodology(
            String id,
            String version,
            String shareBasis,
            String growthBasis,
            BigDecimal highRelativeShareThresholdPercent,
            BigDecimal highGrowthThresholdPercent,
            BigDecimal displayGrowthFloorPercent,
            BigDecimal displayGrowthCeilingPercent,
            int maximumDisplayedProducts,
            boolean externalMarketDataIncluded) {
    }

    public record Range(String from, String to) {
    }

    public record QuadrantSummary(
            String quadrant,
            int productCount,
            BigDecimal revenue,
            BigDecimal revenueSharePercent) {
    }

    public record Product(
            long productId,
            String productName,
            String sku,
            String category,
            String quadrant,
            BigDecimal currentRevenue,
            BigDecimal previousRevenue,
            BigDecimal growthPercent,
            BigDecimal portfolioSharePercent,
            BigDecimal relativeCategorySharePercent,
            BigDecimal currentUnits,
            BigDecimal previousUnits,
            int currentSaleCount,
            int previousSaleCount,
            BigDecimal currentCost,
            BigDecimal contributionMargin,
            BigDecimal contributionMarginPercent,
            boolean costAvailable,
            String stockStatus,
            BigDecimal availableQuantity,
            BigDecimal minimumQuantity,
            int stockLocations,
            boolean partial) {
    }

    public record DataQuality(
            boolean decisionReady,
            boolean partial,
            List<String> issues,
            List<String> excludedCurrencies,
            int currentSalesWithoutLines,
            int previousSalesWithoutLines,
            int invalidLineRows,
            int unlinkedProductRows,
            String generatedFrom,
            String snapshotDate,
            String note) {
    }
}
