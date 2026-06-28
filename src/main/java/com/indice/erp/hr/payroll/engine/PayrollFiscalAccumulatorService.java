package com.indice.erp.hr.payroll.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class PayrollFiscalAccumulatorService {

    private static final List<String> INCLUDED_RUN_STATUSES = List.of("processed", "approved", "paid");

    private final JdbcTemplate jdbcTemplate;

    public PayrollFiscalAccumulatorService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PayrollCalculationContext.FiscalAccumulatorSnapshot loadSnapshot(
        long companyId,
        long userCompanyId,
        String country,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        Long currentRunId
    ) {
        var resolvedPeriodEnd = periodEndDate == null ? LocalDate.now() : periodEndDate;
        var resolvedPeriodStart = periodStartDate == null ? resolvedPeriodEnd : periodStartDate;
        var normalizedCountry = normalizeCountry(country);
        var fiscalYear = resolvedPeriodEnd.getYear();
        var yearStartDate = LocalDate.of(fiscalYear, 1, 1);
        var queryArgs = accumulatorArgs(companyId, userCompanyId, normalizedCountry, yearStartDate, resolvedPeriodStart, currentRunId);
        var totals = loadTotals(queryArgs);
        var taxableBase = loadTaxableBase(queryArgs, totals.grossAmount());
        var itemRows = loadItemRows(queryArgs);
        var lineItemAmounts = new LinkedHashMap<String, BigDecimal>();
        var employeeDeductions = new LinkedHashMap<String, BigDecimal>();
        var employerContributions = new LinkedHashMap<String, BigDecimal>();

        for (var row : itemRows) {
            lineItemAmounts.merge(row.code(), row.amount(), BigDecimal::add);
            if ("deduction".equals(row.category())) {
                employeeDeductions.merge(row.code(), row.amount(), BigDecimal::add);
            }
            if ("employer_contribution".equals(row.category()) || "provision".equals(row.category())) {
                employerContributions.merge(row.code(), row.amount(), BigDecimal::add);
            }
        }

        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("source", "payroll_run_lines");
        metadata.put("includedStatuses", INCLUDED_RUN_STATUSES);
        metadata.put("currentRunExcluded", currentRunId != null);
        metadata.put("currentRunId", currentRunId);
        metadata.put("cutoffDate", resolvedPeriodStart.toString());
        metadata.put("taxableBaseSource", taxableBase.source());

        return new PayrollCalculationContext.FiscalAccumulatorSnapshot(
            normalizedCountry,
            fiscalYear,
            yearStartDate,
            resolvedPeriodStart,
            resolvedPeriodEnd,
            totals.grossAmount(),
            taxableBase.amount(),
            totals.deductionsAmount(),
            totals.employerContributionsAmount(),
            totals.netAmount(),
            lineItemAmounts,
            employeeDeductions,
            employerContributions,
            metadata
        );
    }

    private AccumulatorTotals loadTotals(Object[] queryArgs) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(SUM(l.gross_amount), 0) AS gross_amount,
                       COALESCE(SUM(l.deductions_amount), 0) AS deductions_amount,
                       COALESCE(SUM(l.employer_contributions_amount), 0) AS employer_contributions_amount,
                       COALESCE(SUM(l.net_amount), 0) AS net_amount
                FROM payroll_run_lines l
                JOIN payroll_runs r ON r.id = l.run_id AND r.company_id = l.company_id
                WHERE l.company_id = ?
                  AND l.user_company_id = ?
                  AND COALESCE(l.country_code_snapshot, '') = ?
                  AND l.include_in_fiscal = 1
                  AND r.status IN ('processed', 'approved', 'paid')
                  AND r.period_start_date >= ?
                  AND r.period_end_date < ?
                  AND (? IS NULL OR l.run_id <> ?)
                """,
            (rs, rowNum) -> new AccumulatorTotals(
                money(rs.getBigDecimal("gross_amount")),
                money(rs.getBigDecimal("deductions_amount")),
                money(rs.getBigDecimal("employer_contributions_amount")),
                money(rs.getBigDecimal("net_amount"))
            ),
            queryArgs
        );
        return rows.isEmpty()
            ? new AccumulatorTotals(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO)
            : rows.getFirst();
    }

    private TaxableBaseTotal loadTaxableBase(Object[] queryArgs, BigDecimal grossFallback) {
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(SUM(CASE WHEN i.category = 'earning' AND i.taxable = 1 THEN i.amount ELSE 0 END), 0) AS taxable_earnings,
                       COALESCE(SUM(CASE WHEN i.code = 'ABSENCE_DEDUCTION' THEN i.amount ELSE 0 END), 0) AS absence_deductions
                FROM payroll_run_line_items i
                JOIN payroll_run_lines l ON l.id = i.run_line_id
                JOIN payroll_runs r ON r.id = l.run_id AND r.company_id = l.company_id
                WHERE l.company_id = ?
                  AND l.user_company_id = ?
                  AND COALESCE(l.country_code_snapshot, '') = ?
                  AND l.include_in_fiscal = 1
                  AND r.status IN ('processed', 'approved', 'paid')
                  AND r.period_start_date >= ?
                  AND r.period_end_date < ?
                  AND (? IS NULL OR l.run_id <> ?)
                """,
            (rs, rowNum) -> {
                var taxableEarnings = money(rs.getBigDecimal("taxable_earnings"));
                var absenceDeductions = money(rs.getBigDecimal("absence_deductions"));
                var amount = taxableEarnings.subtract(absenceDeductions).max(BigDecimal.ZERO);
                if (amount.compareTo(BigDecimal.ZERO) <= 0 && grossFallback.compareTo(BigDecimal.ZERO) > 0) {
                    return new TaxableBaseTotal(grossFallback, "gross_amount_fallback");
                }
                return new TaxableBaseTotal(amount, "taxable_earning_items_minus_absence_deductions");
            },
            queryArgs
        );
        return rows.isEmpty() ? new TaxableBaseTotal(grossFallback, "gross_amount_fallback") : rows.getFirst();
    }

    private List<ItemAmountRow> loadItemRows(Object[] queryArgs) {
        return jdbcTemplate.query(
            """
                SELECT COALESCE(i.code, '') AS code,
                       COALESCE(i.category, '') AS category,
                       COALESCE(SUM(i.amount), 0) AS amount
                FROM payroll_run_line_items i
                JOIN payroll_run_lines l ON l.id = i.run_line_id
                JOIN payroll_runs r ON r.id = l.run_id AND r.company_id = l.company_id
                WHERE l.company_id = ?
                  AND l.user_company_id = ?
                  AND COALESCE(l.country_code_snapshot, '') = ?
                  AND l.include_in_fiscal = 1
                  AND r.status IN ('processed', 'approved', 'paid')
                  AND r.period_start_date >= ?
                  AND r.period_end_date < ?
                  AND (? IS NULL OR l.run_id <> ?)
                GROUP BY COALESCE(i.code, ''), COALESCE(i.category, '')
                """,
            (rs, rowNum) -> new ItemAmountRow(
                normalizeCode(rs.getString("code")),
                safe(rs.getString("category")),
                money(rs.getBigDecimal("amount"))
            ),
            queryArgs
        );
    }

    private Object[] accumulatorArgs(
        long companyId,
        long userCompanyId,
        String country,
        LocalDate yearStartDate,
        LocalDate periodStartDate,
        Long currentRunId
    ) {
        var args = new ArrayList<Object>();
        args.add(companyId);
        args.add(userCompanyId);
        args.add(country);
        args.add(yearStartDate);
        args.add(periodStartDate);
        args.add(currentRunId);
        args.add(currentRunId);
        return args.toArray();
    }

    private String normalizeCountry(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        return normalized.isBlank() ? "UNSUPPORTED" : normalized;
    }

    private String normalizeCode(String value) {
        return safe(value).toUpperCase(Locale.ROOT);
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private record AccumulatorTotals(
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount
    ) {
    }

    private record TaxableBaseTotal(BigDecimal amount, String source) {
    }

    private record ItemAmountRow(String code, String category, BigDecimal amount) {
    }
}
