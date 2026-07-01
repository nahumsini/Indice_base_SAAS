package com.indice.erp.hr.incentives;

import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrIncentivePayrollSupplyService {

    private final JdbcTemplate jdbcTemplate;

    public HrIncentivePayrollSupplyService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<PayrollCalculationContext.ManualAdjustment> loadApprovedAdjustments(
        long companyId,
        long userCompanyId,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String payrollCurrency
    ) {
        return jdbcTemplate.query(
            """
                SELECT a.id,
                       i.incentive_code,
                       i.name,
                       a.payroll_category,
                       a.amount,
                       a.tax_treatment,
                       a.taxable,
                       a.affects_social_security,
                       a.affects_employer_cost,
                       a.currency_code
                FROM hr_incentive_applications a
                JOIN hr_incentives i ON i.id = a.incentive_id
                WHERE a.company_id = ?
                  AND a.user_company_id = ?
                  AND a.status = 'approved'
                  AND a.period_start_date <= ?
                  AND a.period_end_date >= ?
                  AND UPPER(a.currency_code) = UPPER(?)
                ORDER BY a.period_start_date ASC, a.id ASC
                """,
            (rs, rowNum) -> new PayrollCalculationContext.ManualAdjustment(
                "INCENTIVE_" + rs.getLong("id"),
                blankTo(rs.getString("payroll_category"), "earning"),
                blankTo(rs.getString("name"), rs.getString("incentive_code")),
                scale(rs.getBigDecimal("amount")),
                blankTo(rs.getString("tax_treatment"), "taxable_compensation"),
                rs.getBoolean("taxable"),
                rs.getBoolean("affects_social_security"),
                rs.getBoolean("affects_employer_cost"),
                "Incentivo de nómina",
                blankTo(rs.getString("currency_code"), payrollCurrency),
                "incentive"
            ),
            companyId,
            userCompanyId,
            periodEndDate,
            periodStartDate,
            payrollCurrency
        );
    }

    @Transactional
    public void markApplicationsApplied(
        long companyId,
        long userCompanyId,
        long payrollRunId,
        long payrollRunLineId,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String payrollCurrency
    ) {
        jdbcTemplate.update(
            """
                UPDATE hr_incentive_applications
                SET status = 'applied',
                    payroll_run_id = ?,
                    payroll_run_line_id = ?,
                    applied_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND status = 'approved'
                  AND period_start_date <= ?
                  AND period_end_date >= ?
                  AND UPPER(currency_code) = UPPER(?)
                """,
            payrollRunId,
            payrollRunLineId,
            companyId,
            userCompanyId,
            periodEndDate,
            periodStartDate,
            payrollCurrency
        );
    }

    private BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
