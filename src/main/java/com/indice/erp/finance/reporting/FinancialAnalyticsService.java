package com.indice.erp.finance.reporting;

import static com.indice.erp.finance.reporting.FinancialAnalyticsContracts.*;

import com.indice.erp.finance.reporting.FinancialAnalyticsRepository.DrilldownFilter;
import com.indice.erp.finance.reporting.FinancialReportingContracts.ReportResponse;
import com.indice.erp.finance.reporting.FinancialReportingContracts.StatementLine;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
class FinancialAnalyticsService {

    private static final BigDecimal ZERO = new BigDecimal("0.0000");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private final FinancialReportingService reportingService;
    private final FinancialAnalyticsRepository analyticsRepository;

    FinancialAnalyticsService(
        FinancialReportingService reportingService,
        FinancialAnalyticsRepository analyticsRepository
    ) {
        this.reportingService = reportingService;
        this.analyticsRepository = analyticsRepository;
    }

    AnalyticsResponse analytics(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId,
        int trendMonths
    ) {
        FinancialSynchronizationService.validateRange(from, to);
        if (trendMonths < 3 || trendMonths > 24) {
            throw new IllegalArgumentException("months must be between 3 and 24.");
        }
        ReportResponse report = reportingService.report(companyId, from, to, unitId, businessId);
        var currentSections = analyticsRepository.closingSectionTotals(companyId, to, unitId, businessId);
        var comparativeSections = analyticsRepository.closingSectionTotals(
            companyId, report.context().comparativeTo(), unitId, businessId);

        BigDecimal revenue = line(report, "REVENUE").current();
        BigDecimal comparativeRevenue = line(report, "REVENUE").comparative();
        BigDecimal grossProfit = line(report, "GROSS_PROFIT").current();
        BigDecimal comparativeGrossProfit = line(report, "GROSS_PROFIT").comparative();
        BigDecimal operatingProfit = line(report, "OPERATING_PROFIT").current();
        BigDecimal comparativeOperatingProfit = line(report, "OPERATING_PROFIT").comparative();
        BigDecimal netProfit = line(report, "NET_PROFIT").current();
        BigDecimal comparativeNetProfit = line(report, "NET_PROFIT").comparative();
        BigDecimal closingCash = line(report, "CASH").current();
        BigDecimal comparativeCash = line(report, "CASH").comparative();
        BigDecimal workingCapital = workingCapital(currentSections);
        BigDecimal comparativeWorkingCapital = workingCapital(comparativeSections);
        BigDecimal currentRatio = ratio(currentSections.get("CURRENT_ASSETS"), currentSections.get("CURRENT_LIABILITIES"));
        BigDecimal comparativeCurrentRatio = ratio(
            comparativeSections.get("CURRENT_ASSETS"), comparativeSections.get("CURRENT_LIABILITIES"));
        BigDecimal netMargin = percentage(netProfit, revenue);
        BigDecimal comparativeNetMargin = percentage(comparativeNetProfit, comparativeRevenue);

        var kpis = List.of(
            kpi("REVENUE", revenue, comparativeRevenue, "MONEY"),
            kpi("GROSS_PROFIT", grossProfit, comparativeGrossProfit, "MONEY"),
            kpi("OPERATING_PROFIT", operatingProfit, comparativeOperatingProfit, "MONEY"),
            kpi("NET_MARGIN", netMargin, comparativeNetMargin, "PERCENT"),
            kpi("CLOSING_CASH", closingCash, comparativeCash, "MONEY"),
            kpi("WORKING_CAPITAL", workingCapital, comparativeWorkingCapital, "MONEY"),
            kpi("CURRENT_RATIO", currentRatio, comparativeCurrentRatio, "RATIO"),
            new FinancialKpi("ACCOUNTING_COVERAGE", decimal(report.readiness().coveragePercent()), null, null,
                "PERCENT", "AVAILABLE", "NOT_CONFIGURED")
        );

        var trendStart = YearMonth.from(to).minusMonths(trendMonths - 1L).atDay(1);
        var totalsByMonth = new LinkedHashMap<String, Map<String, BigDecimal>>();
        analyticsRepository.monthlyPeriodTotals(companyId, trendStart, to, unitId, businessId)
            .forEach(row -> totalsByMonth.put(row.periodKey(), row.totals()));
        var trend = new ArrayList<MonthlyTrendPoint>();
        YearMonth cursor = YearMonth.from(trendStart);
        YearMonth lastMonth = YearMonth.from(to);
        while (!cursor.isAfter(lastMonth)) {
            var profit = FinancialReportingService.profitMetrics(
                totalsByMonth.getOrDefault(cursor.toString(), Map.of()));
            trend.add(new MonthlyTrendPoint(cursor.toString(), profit.revenue(), profit.grossProfit(),
                profit.operatingProfit(), profit.netProfit()));
            cursor = cursor.plusMonths(1);
        }

        var organization = analyticsRepository.organizationPeriodTotals(companyId, from, to, unitId, businessId)
            .stream().map(row -> {
                var profit = FinancialReportingService.profitMetrics(row.totals());
                return new OrganizationComparison(row.unitId(), row.unitName(), profit.revenue(),
                    profit.grossProfit(), profit.operatingProfit(), profit.netProfit());
            }).toList();

        var insights = insights(report, revenue, comparativeRevenue, operatingProfit, workingCapital);
        return new AnalyticsResponse(
            new AnalyticsContext(from, to, report.context().presentationCurrency(), trendMonths, Instant.now()),
            kpis,
            profitBridge(report),
            cashBridge(report),
            List.copyOf(trend),
            organization,
            insights
        );
    }

    DrilldownResponse drilldown(
        long companyId,
        LocalDate from,
        LocalDate to,
        Long unitId,
        Long businessId,
        String subjectType,
        String subjectId,
        int page,
        int pageSize,
        String sortBy,
        String sortDirection
    ) {
        FinancialSynchronizationService.validateRange(from, to);
        if (page < 0) throw new IllegalArgumentException("page must be zero or greater.");
        if (pageSize < 10 || pageSize > 200) {
            throw new IllegalArgumentException("pageSize must be between 10 and 200.");
        }
        ReportResponse report = reportingService.report(companyId, from, to, unitId, businessId);
        DrilldownFilter filter = resolveFilter(report, subjectType, subjectId);
        var result = analyticsRepository.drilldown(companyId, from, to, unitId, businessId, filter,
            page, pageSize, sortBy, sortDirection);
        var summary = result.summary();
        int pages = summary.rowCount() == 0 ? 0 : (int) Math.ceil(summary.rowCount() / (double) pageSize);
        return new DrilldownResponse(
            new DrilldownContext(from, to, unitId, businessId, report.context().presentationCurrency(), Instant.now()),
            new DrilldownSubject(subjectType, subjectId, filter.label()),
            new DrilldownSummary(summary.debit(), summary.credit(), summary.netAmount(),
                summary.journalCount(), summary.accountCount()),
            result.rows().stream().map(row -> new DrilldownRow(
                row.lineId(), row.journalEntryId(), row.entryNumber(), row.entryDate(), row.entryDescription(),
                row.sourceModule(), row.sourceType(), row.sourceId(), row.accountId(), row.accountCode(),
                row.accountName(), row.debit(), row.credit(), row.netAmount(), row.unitId(), row.unitName(),
                row.businessId(), row.businessName(), row.sourceDocumentReference())).toList(),
            page, pageSize, summary.rowCount(), pages
        );
    }

    private static List<BridgePoint> profitBridge(ReportResponse report) {
        BigDecimal revenue = line(report, "REVENUE").current();
        BigDecimal cost = line(report, "COST_OF_SALES").current().negate();
        BigDecimal expenses = line(report, "OPERATING_EXPENSES").current().negate();
        BigDecimal otherIncome = line(report, "OTHER_INCOME").current();
        BigDecimal finance = line(report, "FINANCE_EXPENSE").current().negate();
        BigDecimal tax = line(report, "INCOME_TAX").current().negate();
        BigDecimal cumulative = ZERO;
        var result = new ArrayList<BridgePoint>();
        for (var component : List.of(
            Map.entry("REVENUE", revenue), Map.entry("COST_OF_SALES", cost),
            Map.entry("OPERATING_EXPENSES", expenses), Map.entry("OTHER_INCOME", otherIncome),
            Map.entry("FINANCE_EXPENSE", finance), Map.entry("INCOME_TAX", tax)
        )) {
            cumulative = money(cumulative.add(component.getValue()));
            result.add(new BridgePoint(component.getKey(), money(component.getValue()), cumulative, "CHANGE"));
        }
        result.add(new BridgePoint("NET_PROFIT", line(report, "NET_PROFIT").current(),
            line(report, "NET_PROFIT").current(), "TOTAL"));
        return List.copyOf(result);
    }

    private static List<BridgePoint> cashBridge(ReportResponse report) {
        BigDecimal opening = line(report, "OPENING_CASH").current();
        BigDecimal incorporatedOpening = line(report, "OPENING_ADJUSTMENTS").current();
        BigDecimal operating = line(report, "OPERATING_CASH").current();
        BigDecimal investing = line(report, "INVESTING_CASH").current();
        BigDecimal financing = line(report, "FINANCING_CASH").current();
        BigDecimal afterOperating = opening.add(incorporatedOpening).add(operating);
        BigDecimal afterInvesting = afterOperating.add(investing);
        return List.of(
            new BridgePoint("OPENING_CASH", opening, opening, "TOTAL"),
            new BridgePoint("OPENING_ADJUSTMENTS", incorporatedOpening, money(opening.add(incorporatedOpening)), "CHANGE"),
            new BridgePoint("OPERATING_CASH", operating, money(afterOperating), "CHANGE"),
            new BridgePoint("INVESTING_CASH", investing, money(afterInvesting), "CHANGE"),
            new BridgePoint("FINANCING_CASH", financing, money(afterInvesting.add(financing)), "CHANGE"),
            new BridgePoint("CLOSING_CASH", line(report, "CASH").current(), line(report, "CASH").current(), "TOTAL")
        );
    }

    private static List<ExecutiveInsight> insights(
        ReportResponse report,
        BigDecimal revenue,
        BigDecimal comparativeRevenue,
        BigDecimal operatingProfit,
        BigDecimal workingCapital
    ) {
        var result = new ArrayList<ExecutiveInsight>();
        if (!report.readiness().decisionReady()) {
            result.add(new ExecutiveInsight("ACCOUNTING_BLOCKERS", "BLOCKING", "BLOCKING_FINDINGS",
                decimal(report.readiness().blockingFindings()), "OPEN_CLOSE_QUALITY"));
        }
        if (workingCapital.signum() < 0 && result.size() < 3) {
            result.add(new ExecutiveInsight("NEGATIVE_WORKING_CAPITAL", "WARNING", "WORKING_CAPITAL",
                workingCapital, "OPEN_FINANCIAL_POSITION"));
        }
        if (operatingProfit.signum() < 0 && result.size() < 3) {
            result.add(new ExecutiveInsight("NEGATIVE_OPERATING_PROFIT", "WARNING", "OPERATING_PROFIT",
                operatingProfit, "OPEN_PROFIT_LOSS"));
        }
        if (revenue.compareTo(comparativeRevenue) < 0 && result.size() < 3) {
            result.add(new ExecutiveInsight("REVENUE_CONTRACTION", "INFO", "REVENUE",
                percentage(revenue.subtract(comparativeRevenue), comparativeRevenue.abs()), "OPEN_REVENUE_DETAIL"));
        }
        if (result.isEmpty()) {
            result.add(new ExecutiveInsight("NO_AUTOMATIC_EXCEPTION", "INFO", "ACCOUNTING_COVERAGE",
                decimal(report.readiness().coveragePercent()), "REVIEW_STATEMENTS"));
        }
        return List.copyOf(result);
    }

    private static DrilldownFilter resolveFilter(ReportResponse report, String subjectType, String subjectId) {
        if (subjectType == null || subjectId == null || subjectId.isBlank() || subjectId.length() > 80) {
            throw new IllegalArgumentException("subjectType and subjectId are required.");
        }
        if ("ACCOUNT".equals(subjectType)) {
            long accountId;
            try {
                accountId = Long.parseLong(subjectId);
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("ACCOUNT subjectId must be a positive account id.");
            }
            if (accountId <= 0) throw new IllegalArgumentException("ACCOUNT subjectId must be a positive account id.");
            var account = report.trialBalance().stream().filter(row -> row.accountId().equals(accountId)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("The account is outside the selected scope or has no posted activity."));
            return new DrilldownFilter(accountId, List.of(), List.of(), account.accountCode() + " · " + account.accountName());
        }
        if (!"STATEMENT_LINE".equals(subjectType)) {
            throw new IllegalArgumentException("subjectType must be STATEMENT_LINE or ACCOUNT.");
        }
        var statementLine = report.statements().stream().flatMap(statement -> statement.lines().stream())
            .filter(line -> line.code().equals(subjectId)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown statement line for the selected report."));
        return statementFilter(subjectId, statementLine.label());
    }

    private static DrilldownFilter statementFilter(String code, String label) {
        List<String> operating = List.of("OPERATING_EXPENSES", "PAYROLL_EXPENSE",
            "EMPLOYER_CONTRIBUTIONS_EXPENSE", "DEPRECIATION_EXPENSE");
        return switch (code) {
            case "REVENUE", "COST_OF_SALES", "OTHER_INCOME", "FINANCE_EXPENSE",
                 "CASH", "ACCOUNTS_RECEIVABLE", "INVENTORY", "PROPERTY_PLANT_EQUIPMENT",
                 "ACCUMULATED_DEPRECIATION", "ACCOUNTS_PAYABLE", "PAYROLL_PAYABLE",
                 "PAYROLL_WITHHOLDINGS", "TAXES_PAYABLE" -> filter(List.of(code), List.of(), label);
            case "RECEIVABLES" -> filter(List.of("ACCOUNTS_RECEIVABLE"), List.of(), label);
            case "PPE" -> filter(List.of("PROPERTY_PLANT_EQUIPMENT", "ACCUMULATED_DEPRECIATION"), List.of(), label);
            case "PAYABLES" -> filter(List.of("ACCOUNTS_PAYABLE"), List.of(), label);
            case "PAYROLL_LIABILITIES" -> filter(List.of("PAYROLL_PAYABLE", "PAYROLL_WITHHOLDINGS"), List.of(), label);
            case "INCOME_TAX" -> filter(List.of("INCOME_TAX_EXPENSE"), List.of(), label);
            case "OPERATING_EXPENSES" -> filter(operating, List.of(), label);
            case "GROSS_PROFIT" -> filter(List.of("REVENUE", "COST_OF_SALES"), List.of(), label);
            case "OPERATING_PROFIT" -> filter(join(List.of("REVENUE", "COST_OF_SALES", "OTHER_INCOME"), operating), List.of(), label);
            case "NET_PROFIT", "PERIOD_RESULT" -> filter(
                join(List.of("REVENUE", "COST_OF_SALES", "OTHER_INCOME", "FINANCE_EXPENSE", "INCOME_TAX_EXPENSE"), operating),
                List.of(), label);
            case "TOTAL_ASSETS" -> filter(List.of(), List.of("ASSET"), label);
            case "TOTAL_LIABILITIES" -> filter(List.of(), List.of("LIABILITY"), label);
            case "BASE_EQUITY", "OPENING_EQUITY" -> filter(List.of(), List.of("EQUITY"), label);
            case "ACCUMULATED_RESULT" -> filter(List.of(), List.of("REVENUE", "EXPENSE", "OCI"), label);
            case "TOTAL_EQUITY", "CLOSING_EQUITY", "OTHER_EQUITY_CHANGES" ->
                filter(List.of(), List.of("EQUITY", "REVENUE", "EXPENSE", "OCI"), label);
            case "LIABILITIES_EQUITY" ->
                filter(List.of(), List.of("LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "OCI"), label);
            case "CUSTOMER_COLLECTIONS", "SUPPLIER_PAYMENTS", "PAYROLL_PAYMENTS", "OPERATING_CASH",
                 "INVESTING_CASH", "FINANCING_CASH", "NET_CASH_CHANGE" -> filter(List.of("CASH"), List.of(), label);
            default -> throw new IllegalArgumentException("This statement line does not expose accounting detail.");
        };
    }

    private static DrilldownFilter filter(List<String> systemCodes, List<String> accountTypes, String label) {
        return new DrilldownFilter(null, systemCodes, accountTypes, label);
    }

    private static List<String> join(List<String> first, List<String> second) {
        var result = new ArrayList<>(first);
        result.addAll(second);
        return List.copyOf(result);
    }

    private static StatementLine line(ReportResponse report, String code) {
        return report.statements().stream().flatMap(statement -> statement.lines().stream())
            .filter(item -> item.code().equals(code)).findFirst()
            .orElseThrow(() -> new IllegalStateException("Required financial statement line is unavailable: " + code));
    }

    private static BigDecimal workingCapital(Map<String, BigDecimal> sections) {
        return money(value(sections, "CURRENT_ASSETS").subtract(value(sections, "CURRENT_LIABILITIES")));
    }

    private static FinancialKpi kpi(String id, BigDecimal current, BigDecimal comparative, String valueType) {
        if (current == null) {
            return new FinancialKpi(id, null, comparative == null ? null : money(comparative), null,
                valueType, "NOT_AVAILABLE", "NOT_CONFIGURED");
        }
        return new FinancialKpi(id, money(current), comparative == null ? null : money(comparative),
            changePercent(current, comparative), valueType, "AVAILABLE", "NOT_CONFIGURED");
    }

    private static BigDecimal changePercent(BigDecimal current, BigDecimal comparative) {
        if (comparative == null || comparative.abs().compareTo(new BigDecimal("0.0001")) <= 0) return null;
        return percentage(current.subtract(comparative), comparative.abs());
    }

    private static BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.abs().compareTo(new BigDecimal("0.0001")) <= 0) return ZERO;
        return numerator.divide(denominator, 6, RoundingMode.HALF_UP).multiply(HUNDRED).setScale(4, RoundingMode.HALF_UP);
    }

    private static BigDecimal ratio(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.abs().compareTo(new BigDecimal("0.0001")) <= 0) return null;
        return value(Map.of("value", numerator == null ? ZERO : numerator), "value")
            .divide(denominator.abs(), 4, RoundingMode.HALF_UP);
    }

    private static BigDecimal value(Map<String, BigDecimal> values, String key) {
        return money(values.getOrDefault(key, ZERO));
    }

    private static BigDecimal decimal(int value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }
}
