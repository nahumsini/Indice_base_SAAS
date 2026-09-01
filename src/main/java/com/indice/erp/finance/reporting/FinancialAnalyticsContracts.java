package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class FinancialAnalyticsContracts {

    public record AnalyticsResponse(
        AnalyticsContext context,
        List<FinancialKpi> kpis,
        List<BridgePoint> profitBridge,
        List<BridgePoint> cashBridge,
        List<MonthlyTrendPoint> monthlyTrend,
        List<OrganizationComparison> organizationComparison,
        List<ExecutiveInsight> insights
    ) {
    }

    public record AnalyticsContext(
        LocalDate from,
        LocalDate to,
        String presentationCurrency,
        int trendMonths,
        Instant generatedAt
    ) {
    }

    public record FinancialKpi(
        String id,
        BigDecimal value,
        BigDecimal comparativeValue,
        BigDecimal changePercent,
        String valueType,
        String availability,
        String targetStatus
    ) {
    }

    public record BridgePoint(
        String code,
        BigDecimal amount,
        BigDecimal cumulativeAmount,
        String kind
    ) {
    }

    public record MonthlyTrendPoint(
        String periodKey,
        BigDecimal revenue,
        BigDecimal grossProfit,
        BigDecimal operatingProfit,
        BigDecimal netProfit
    ) {
    }

    public record OrganizationComparison(
        Long unitId,
        String unitName,
        BigDecimal revenue,
        BigDecimal grossProfit,
        BigDecimal operatingProfit,
        BigDecimal netProfit
    ) {
    }

    public record ExecutiveInsight(
        String code,
        String severity,
        String primaryMetricId,
        BigDecimal primaryValue,
        String actionCode
    ) {
    }

    public record DrilldownResponse(
        DrilldownContext context,
        DrilldownSubject subject,
        DrilldownSummary summary,
        List<DrilldownRow> rows,
        int page,
        int pageSize,
        long totalRows,
        int totalPages
    ) {
    }

    public record DrilldownContext(
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId,
        String presentationCurrency,
        Instant generatedAt
    ) {
    }

    public record DrilldownSubject(String type, String id, String label) {
    }

    public record DrilldownSummary(
        BigDecimal debit,
        BigDecimal credit,
        BigDecimal netAmount,
        int journalCount,
        int accountCount
    ) {
    }

    public record DrilldownRow(
        long lineId,
        long journalEntryId,
        String entryNumber,
        LocalDate entryDate,
        String entryDescription,
        String sourceModule,
        String sourceType,
        String sourceId,
        long accountId,
        String accountCode,
        String accountName,
        BigDecimal debit,
        BigDecimal credit,
        BigDecimal netAmount,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String sourceDocumentReference
    ) {
    }

    private FinancialAnalyticsContracts() {
    }
}
