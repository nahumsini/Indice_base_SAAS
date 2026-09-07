package com.indice.erp.kpis.currency;

import static org.assertj.core.api.Assertions.assertThat;
import com.indice.erp.hr.HrOperationalScope;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(BasicModuleKpiCurrencyRepository.class)
class KpiMonetaryScopeIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired BasicModuleKpiCurrencyRepository repository;

    @Test void everyMonetaryOwnerAppliesOrganizationalScopeEvenWithoutClientIds() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        jdbc.update("INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')", company, key);
        long unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO businesses (company_id, unit_id, name, status) VALUES (?, ?, ?, 'active')", company, unit, key);
        long business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id = ?", Long.class, company);
        var today = LocalDate.of(2026, 9, 6);
        for (var scope : List.of(HrOperationalScope.unitHeadquarters(unit), HrOperationalScope.businessOffice(unit, business))) {
            for (var metric : BasicModuleKpiMetric.values()) {
                assertThat(repository.load(metric, company, null, null, List.of(), false, today, ZoneId.of("America/Toronto"), scope))
                    .as(metric + " " + scope.type()).isEmpty();
            }
        }
        jdbc.update("""
            INSERT INTO finance_expenses (company_id, folio, concept, expense_type, subtotal_amount, total_amount,
              balance_amount, currency_code, expense_date, status, payment_status, unit_id, business_id)
            VALUES (?, ?, 'Outside scope', 'VARIABLE', 100, 100, 100, 'MXN', '2026-09-06', 'APPROVED', 'UNPAID', NULL, NULL)
            """, company, key);
        long expense = jdbc.queryForObject("SELECT id FROM finance_expenses WHERE company_id = ?", Long.class, company);
        assertThat(repository.load(BasicModuleKpiMetric.EXPENSE_ACTUAL, company, null, null, List.of(expense), true,
            today, ZoneId.of("America/Toronto"), HrOperationalScope.businessOffice(unit, business))).isEmpty();
        assertThat(repository.load(BasicModuleKpiMetric.EXPENSE_ACTUAL, company, null, null, List.of(expense), true,
            today, ZoneId.of("America/Toronto"), HrOperationalScope.corporateOffice())).hasSize(1);
    }
}
