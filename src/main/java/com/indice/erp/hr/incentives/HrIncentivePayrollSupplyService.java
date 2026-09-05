package com.indice.erp.hr.incentives;

import com.indice.erp.hr.payroll.engine.PayrollCalculationContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrIncentivePayrollSupplyService {

    private final JdbcTemplate jdbcTemplate;
    private final HrIncentiveKpiConnector kpiConnector;

    @Autowired
    public HrIncentivePayrollSupplyService(
        JdbcTemplate jdbcTemplate,
        ObjectProvider<HrIncentiveKpiConnector> kpiConnectorProvider
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.kpiConnector = kpiConnectorProvider.getIfAvailable(() -> request -> Optional.empty());
    }

    // Used by focused unit tests that do not start the Spring container.
    public HrIncentivePayrollSupplyService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.kpiConnector = request -> Optional.empty();
    }

    public List<PayrollCalculationContext.ManualAdjustment> loadApprovedAdjustments(
        long companyId,
        long userCompanyId,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String payrollCurrency
    ) {
        return loadApplications(
            companyId,
            userCompanyId,
            null,
            periodStartDate,
            periodEndDate,
            payrollCurrency,
            "approved"
        ).stream()
            // KPI incentives wait for the final KPI connector and are never
            // interpreted as fixed manual amounts.
            .filter(application -> "manual".equals(application.incentiveType()))
            .filter(application -> !"petty_cash_shortage".equals(application.sourceType()))
            .map(this::toResolvedAdjustment)
            .flatMap(Optional::stream)
            .map(ResolvedAdjustment::adjustment)
            .toList();
    }

    public List<Map<String, Object>> listPayrollLineIncentives(
        long companyId,
        long userCompanyId,
        long payrollRunLineId,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String payrollCurrency
    ) {
        return loadApplications(
            companyId,
            userCompanyId,
            payrollRunLineId,
            periodStartDate,
            periodEndDate,
            payrollCurrency,
            null
        ).stream().map(application -> {
            var resolved = toResolvedAdjustment(application);
            var appliedToLine = "applied".equals(application.status())
                && application.payrollRunLineId() != null
                && application.payrollRunLineId() == payrollRunLineId;
            var kpiPending = "kpi".equals(application.incentiveType()) && resolved.isEmpty();
            var body = new LinkedHashMap<String, Object>();
            body.put("application_id", application.applicationId());
            body.put("incentive_id", application.incentiveId());
            body.put("incentive_code", application.incentiveCode());
            body.put("name", application.name());
            body.put("description", application.description());
            body.put("incentive_type", application.incentiveType());
            body.put("payroll_category", application.payrollCategory());
            body.put("source_type", application.sourceType());
            body.put("amount", resolved.map(value -> value.adjustment().amount()).orElse(application.amount()));
            body.put("currency_code", application.currencyCode());
            body.put("application_status", application.status());
            body.put("source_reference_type", application.sourceReferenceType());
            body.put("source_reference_id", application.sourceReferenceId());
            body.put("applied_to_line", appliedToLine);
            body.put("connector_status", kpiPending ? "awaiting_kpi_connector" : "ready");
            body.put("can_apply", "approved".equals(application.status()) && !kpiPending);
            return (Map<String, Object>) body;
        }).toList();
    }

    @Transactional
    public ResolvedAdjustment claimApprovedApplication(
        long companyId,
        long applicationId,
        long userCompanyId,
        long payrollRunId,
        long payrollRunLineId,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String payrollCurrency
    ) {
        var applications = loadApplications(
            companyId,
            userCompanyId,
            payrollRunLineId,
            periodStartDate,
            periodEndDate,
            payrollCurrency,
            null
        ).stream().filter(application -> application.applicationId() == applicationId).toList();
        if (applications.isEmpty()) {
            throw new NoSuchElementException("Payroll incentive application not found.");
        }

        var application = applications.getFirst();
        if ("applied".equals(application.status())
            && application.payrollRunLineId() != null
            && application.payrollRunLineId() == payrollRunLineId) {
            return toResolvedAdjustment(application)
                .orElseThrow(() -> new IllegalArgumentException("The KPI incentive is waiting for the final KPI connector."));
        }
        if (!"approved".equals(application.status())) {
            throw new IllegalArgumentException("The incentive is no longer available for this payroll run.");
        }

        var resolved = toResolvedAdjustment(application)
            .orElseThrow(() -> new IllegalArgumentException("The KPI incentive is waiting for the final KPI connector."));
        var updated = jdbcTemplate.update(
            """
                UPDATE hr_incentive_applications
                SET status = 'applied',
                    amount = ?,
                    payroll_run_id = ?,
                    payroll_run_line_id = ?,
                    applied_at = CURRENT_TIMESTAMP
                WHERE id = ?
                  AND company_id = ?
                  AND user_company_id = ?
                  AND status = 'approved'
                """,
            resolved.adjustment().amount(),
            payrollRunId,
            payrollRunLineId,
            applicationId,
            companyId,
            userCompanyId
        );
        if (updated == 0) {
            throw new IllegalArgumentException("The incentive was already applied or is no longer available.");
        }
        markSalesCommissionsPaid(companyId, application.incentiveId());
        return resolved;
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
                UPDATE hr_incentive_applications a
                SET a.status = 'applied',
                    a.payroll_run_id = ?,
                    a.payroll_run_line_id = ?,
                    a.applied_at = CURRENT_TIMESTAMP
                WHERE a.company_id = ?
                  AND a.user_company_id = ?
                  AND a.status = 'approved'
                  AND a.period_start_date <= ?
                  AND a.period_end_date >= ?
                  AND UPPER(a.currency_code) = UPPER(?)
                  AND EXISTS (
                      SELECT 1
                      FROM hr_incentives i
                      WHERE i.id = a.incentive_id
                        AND i.company_id = a.company_id
                        AND i.incentive_type = 'manual'
                        AND COALESCE(a.source_type, 'incentive') <> 'petty_cash_shortage'
                  )
                """,
            payrollRunId,
            payrollRunLineId,
            companyId,
            userCompanyId,
            periodEndDate,
            periodStartDate,
            payrollCurrency
        );
        jdbcTemplate.update("""
            UPDATE sales_records s
            JOIN sales_commission_cut_items ci ON ci.sale_id = s.id AND ci.company_id = s.company_id
            JOIN hr_incentive_applications a ON a.incentive_id = ci.hr_incentive_id AND a.company_id = ci.company_id
            SET s.commission_status = 'paid'
            WHERE a.payroll_run_line_id = ? AND a.company_id = ? AND a.status = 'applied'
            """, payrollRunLineId, companyId);
    }

    private void markSalesCommissionsPaid(long companyId, long incentiveId) {
        jdbcTemplate.update("""
            UPDATE sales_records s
            JOIN sales_commission_cut_items ci ON ci.sale_id = s.id AND ci.company_id = s.company_id
            SET s.commission_status = 'paid'
            WHERE ci.company_id = ? AND ci.hr_incentive_id = ?
            """, companyId, incentiveId);
    }

    private List<IncentiveApplicationRow> loadApplications(
        long companyId,
        long userCompanyId,
        Long payrollRunLineId,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String payrollCurrency,
        String requiredStatus
    ) {
        var sql = new StringBuilder(
            """
                SELECT a.id,
                       a.incentive_id,
                       i.incentive_code,
                       i.name,
                       i.description,
                       i.incentive_type,
                       a.payroll_category,
                       a.amount,
                       a.tax_treatment,
                       a.taxable,
                       a.affects_social_security,
                       a.affects_employer_cost,
                       a.currency_code,
                       a.source_type,
                       a.source_reference_type,
                       a.source_reference_id,
                       a.status,
                       a.payroll_run_id,
                       a.payroll_run_line_id
                FROM hr_incentive_applications a
                JOIN hr_incentives i ON i.id = a.incentive_id AND i.company_id = a.company_id
                WHERE a.company_id = ?
                  AND a.user_company_id = ?
                  AND a.period_start_date <= ?
                  AND a.period_end_date >= ?
                  AND UPPER(a.currency_code) = UPPER(?)
                """
        );
        var parameters = new ArrayList<Object>(List.of(
            companyId,
            userCompanyId,
            periodEndDate,
            periodStartDate,
            payrollCurrency
        ));
        if (requiredStatus != null) {
            sql.append(" AND a.status = ?");
            parameters.add(requiredStatus);
        } else {
            sql.append(" AND (a.status = 'approved' OR (a.status = 'applied' AND a.payroll_run_line_id = ?))");
            parameters.add(payrollRunLineId);
        }
        sql.append(" ORDER BY a.period_start_date ASC, a.id ASC");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new IncentiveApplicationRow(
            companyId,
            userCompanyId,
            rs.getLong("id"),
            rs.getLong("incentive_id"),
            rs.getString("incentive_code"),
            rs.getString("name"),
            rs.getString("description"),
            blankTo(rs.getString("incentive_type"), "manual"),
            blankTo(rs.getString("payroll_category"), "earning"),
            scale(rs.getBigDecimal("amount")),
            blankTo(rs.getString("tax_treatment"), "taxable_compensation"),
            rs.getBoolean("taxable"),
            rs.getBoolean("affects_social_security"),
            rs.getBoolean("affects_employer_cost"),
            blankTo(rs.getString("currency_code"), payrollCurrency),
            blankTo(rs.getString("source_type"), "incentive"),
            rs.getString("source_reference_type"),
            rs.getString("source_reference_id"),
            rs.getString("status"),
            nullableLong(rs, "payroll_run_id"),
            nullableLong(rs, "payroll_run_line_id"),
            periodStartDate,
            periodEndDate
        ), parameters.toArray());
    }

    private Optional<ResolvedAdjustment> toResolvedAdjustment(IncentiveApplicationRow application) {
        var amount = application.amount();
        String evidenceReference = null;
        if ("kpi".equals(application.incentiveType())) {
            var resolved = kpiConnector.resolve(new HrIncentiveKpiConnector.KpiIncentiveRequest(
                application.companyId(),
                application.incentiveId(),
                application.applicationId(),
                application.userCompanyId(),
                application.sourceReferenceType(),
                application.sourceReferenceId(),
                application.periodStartDate(),
                application.periodEndDate(),
                application.currencyCode()
            ));
            if (resolved.isEmpty()) return Optional.empty();
            amount = scale(resolved.get().amount());
            evidenceReference = resolved.get().evidenceReference();
        }

        var externalFundDeduction = "external_deduction".equals(application.incentiveType())
            && "petty_cash_shortage".equals(application.sourceType());
        var adjustment = new PayrollCalculationContext.ManualAdjustment(
            "INCENTIVE_" + application.applicationId(),
            application.payrollCategory(),
            blankTo(application.name(), application.incentiveCode()),
            amount,
            application.taxTreatment(),
            application.taxable(),
            application.affectsSocialSecurity(),
            application.affectsEmployerCost(),
            externalFundDeduction ? "Recuperación de faltante de fondo" : "Incentivo de nómina",
            application.currencyCode(),
            "incentive"
        );
        return Optional.of(new ResolvedAdjustment(
            application.applicationId(),
            application.incentiveId(),
            adjustment,
            evidenceReference
        ));
    }

    private BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private Long nullableLong(ResultSet resultSet, String column) throws SQLException {
        var value = resultSet.getLong(column);
        return resultSet.wasNull() ? null : value;
    }

    public record ResolvedAdjustment(
        long applicationId,
        long incentiveId,
        PayrollCalculationContext.ManualAdjustment adjustment,
        String evidenceReference
    ) {
    }

    private record IncentiveApplicationRow(
        long companyId,
        long userCompanyId,
        long applicationId,
        long incentiveId,
        String incentiveCode,
        String name,
        String description,
        String incentiveType,
        String payrollCategory,
        BigDecimal amount,
        String taxTreatment,
        boolean taxable,
        boolean affectsSocialSecurity,
        boolean affectsEmployerCost,
        String currencyCode,
        String sourceType,
        String sourceReferenceType,
        String sourceReferenceId,
        String status,
        Long payrollRunId,
        Long payrollRunLineId,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
    }
}
