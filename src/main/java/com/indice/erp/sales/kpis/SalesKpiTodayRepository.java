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

    List<KpiMoneyAmount> salesAmounts(long companyId, LocalDate saleDate) {
        return jdbcTemplate.query(
            """
                SELECT total_amount, currency
                FROM sales_records
                WHERE company_id = ?
                  AND sale_date = ?
                  AND deleted_at IS NULL
                ORDER BY id
                """,
            (rs, rowNum) -> new KpiMoneyAmount(
                rs.getBigDecimal("total_amount"),
                rs.getString("currency")
            ),
            companyId,
            saleDate
        );
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
