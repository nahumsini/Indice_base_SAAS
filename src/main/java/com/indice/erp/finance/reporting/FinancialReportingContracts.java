package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class FinancialReportingContracts {

    public record ReportResponse(
        ReportContext context,
        ReportReadiness readiness,
        Headline headline,
        OrganizationScope organization,
        List<FinancialStatement> statements,
        List<TrialBalanceRow> trialBalance,
        List<SourceCoverage> sourceCoverage,
        List<QualityFinding> findings
    ) {
    }

    public record OrganizationScope(List<UnitOption> units) {
    }

    public record UnitOption(Long id, String name, List<BusinessOption> businesses) {
    }

    public record BusinessOption(Long id, String name) {
    }

    public record ReportContext(
        LocalDate from,
        LocalDate to,
        LocalDate comparativeFrom,
        LocalDate comparativeTo,
        Long unitId,
        Long businessId,
        String reportingFramework,
        LocalDate frameworkEffectiveDate,
        String functionalCurrency,
        String presentationCurrency,
        String periodKey,
        String periodStatus,
        Instant generatedAt
    ) {
    }

    public record ReportReadiness(
        String status,
        boolean decisionReady,
        int blockingFindings,
        int warnings,
        int postedEntries,
        int pendingSourceEvents,
        int coveragePercent,
        String message
    ) {
    }

    public record Headline(
        BigDecimal revenue,
        BigDecimal grossProfit,
        BigDecimal operatingProfit,
        BigDecimal netProfit,
        BigDecimal totalAssets,
        BigDecimal totalLiabilities,
        BigDecimal totalEquity,
        BigDecimal netCashChange
    ) {
    }

    public record FinancialStatement(
        String id,
        String title,
        String subtitle,
        String standardReference,
        List<StatementLine> lines,
        boolean internallyConsistent
    ) {
    }

    public record StatementLine(
        String code,
        String label,
        int level,
        boolean subtotal,
        BigDecimal current,
        BigDecimal comparative,
        BigDecimal variance,
        BigDecimal variancePercent,
        String tone
    ) {
    }

    public record TrialBalanceRow(
        Long accountId,
        String accountCode,
        String accountName,
        String accountType,
        BigDecimal debit,
        BigDecimal credit,
        BigDecimal balance,
        int journalCount
    ) {
    }

    public record SourceCoverage(
        String module,
        int eligible,
        int posted,
        int blocked,
        int coveragePercent,
        String status
    ) {
    }

    public record QualityFinding(
        String code,
        String severity,
        String title,
        String detail,
        String action,
        String sourceModule,
        int affectedRecords
    ) {
    }

    public record SynchronizeRequest(LocalDate from, LocalDate to) {
    }

    public record SynchronizeResponse(
        long syncRunId,
        String status,
        int discovered,
        int posted,
        int alreadyPosted,
        int blocked,
        List<QualityFinding> findings,
        Instant completedAt
    ) {
    }

    public record ReopenPeriodRequest(String reason) {
    }

    public record PeriodActionResponse(
        String periodKey,
        String status,
        Instant changedAt,
        String message
    ) {
    }

    private FinancialReportingContracts() {
    }
}
