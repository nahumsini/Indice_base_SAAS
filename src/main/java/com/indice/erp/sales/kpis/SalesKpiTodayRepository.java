package com.indice.erp.sales.kpis;

import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SalesKpiTodayRepository {

    private final JdbcTemplate jdbcTemplate;

    SalesKpiTodayRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<KpiMoneyAmount> salesAmounts(long companyId, LocalDate saleDate, com.indice.erp.hr.HrOperationalScope scope) {
        var args = new java.util.ArrayList<Object>(); args.add(companyId); args.add(saleDate);
        String restriction;
        if (scope == null || scope.type() == com.indice.erp.hr.HrOperationalScope.Type.UNASSIGNED) restriction = " AND 1 = 0";
        else { restriction = scope.assignmentPredicate("unit_id", "business_id", "company_id"); args.addAll(scope.assignmentParameters()); }
        return jdbcTemplate.query("""
            SELECT total_amount, currency FROM sales_records WHERE company_id = ? AND sale_date = ?
              AND deleted_at IS NULL AND LOWER(commercial_status) NOT IN ('cancelled', 'canceled', 'rejected', 'voided')
            """ + restriction + " ORDER BY id", (rs, row) -> new KpiMoneyAmount(rs.getBigDecimal("total_amount"), rs.getString("currency")), args.toArray());
    }

    Optional<String> companySettingsJson(long companyId) {
        return jdbcTemplate.query(
            "SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("settings_json"),
            companyId
        ).stream().filter(value -> value != null && !value.isBlank()).findFirst();
    }

    List<String> operationalTimezones(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT timezone
                FROM units
                WHERE company_id = ? AND timezone IS NOT NULL AND TRIM(timezone) <> ''
                UNION
                SELECT timezone
                FROM businesses
                WHERE company_id = ? AND timezone IS NOT NULL AND TRIM(timezone) <> ''
                """,
            (rs, rowNum) -> rs.getString("timezone"),
            companyId,
            companyId
        );
    }
}
