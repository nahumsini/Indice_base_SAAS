package com.indice.erp.hr.payroll;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.doReturn;

@SpringBootTest
@Transactional
class HrPayrollSummaryScopeIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired HrPayrollService service;
    @MockitoSpyBean HrPayrollScopeAccess access;

    @Test
    void summariesCurrenciesWarningsAndDetailsShareTheAuthorizedLineScope() {
        long company = company();
        long run = run(company);
        long actorId = line(company, run, 4, 9, "MX", "MXN", "1000", "900", "MEXICO");
        line(company, run, 4, 11, "MX", "MXN", "2000", "1800", "MEXICO");
        line(company, run, 5, 10, "CA", "CAD", "8000", "7000", "GENERIC_UNSUPPORTED_COUNTRY");
        long otherCompany = company();
        long foreignRun = run(otherCompany);
        line(otherCompany, foreignRun, 4, 9, "MX", "MXN", "99000", "99000", "MEXICO");
        var user = new AuthSessionUser(actorId, company, "Synthetic payroll reviewer", "manager");

        doReturn(HrOperationalScope.businessOffice(4L, 9L)).when(access).resolve(user);
        assertVisible(user, run, 1, Map.of("MXN", new BigDecimal("900.00")), Map.of("MXN", new BigDecimal("1000.00")), 0);
        doReturn(HrOperationalScope.unitHeadquarters(4L)).when(access).resolve(user);
        assertVisible(user, run, 2, Map.of("MXN", new BigDecimal("2700.00")), Map.of("MXN", new BigDecimal("3000.00")), 0);
        doReturn(HrOperationalScope.corporateOffice()).when(access).resolve(user);
        assertVisible(user, run, 3, Map.of("MXN", new BigDecimal("2700.00"), "CAD", new BigDecimal("7000.00")), Map.of("MXN", new BigDecimal("3000.00"), "CAD", new BigDecimal("8000.00")), 1);
        assertThrows(NoSuchElementException.class, () -> service.getRunDetail(user, foreignRun));
        doReturn(HrOperationalScope.unassigned()).when(access).resolve(user);
        assertTrue(((List<?>) service.listRuns(user, Map.of()).get("items")).isEmpty());
        assertTrue(((Map<?, ?>) ((Map<?, ?>) service.overview(user).get("summary")).get("net_totals_by_currency")).isEmpty());
    }

    private void assertVisible(AuthSessionUser user, long run, int users, Map<String, BigDecimal> expected, Map<String, BigDecimal> expectedGross, int warnings) {
        var overview = service.overview(user);
        assertEquals(expected, ((Map<?, ?>) overview.get("summary")).get("net_totals_by_currency"));
        assertEquals(expectedGross, ((Map<?, ?>) overview.get("summary")).get("gross_totals_by_currency"));
        var recent = (Map<?, ?>) ((List<?>) overview.get("recent_runs")).getFirst();
        var listed = (Map<?, ?>) ((List<?>) service.listRuns(user, Map.of()).get("items")).getFirst();
        var detail = service.getRunDetail(user, run);
        var reporting = service.listGovernmentReportingSnapshots(user, run, null);
        for (var summary : List.of(recent, listed, (Map<?, ?>) detail.get("run"), (Map<?, ?>) reporting.get("run"))) {
            assertEquals(users, summary.get("users_count"));
            assertEquals(expected, summary.get("native_totals_by_currency"));
            assertEquals(warnings, summary.get("unsupported_country_count"));
            assertEquals(warnings, summary.get("fiscal_review_count"));
            assertEquals(warnings == 0, summary.get("statutory_compliance"));
            assertEquals(expected.size() == 1 ? "MXN" : null, summary.get("currency_code"));
            if (expected.size() == 1) assertFalse(String.valueOf(summary.get("jurisdiction_label")).contains("CA"));
        }
        assertEquals(users, ((List<?>) detail.get("lines")).size());
    }

    @Test
    void legacyFiscalLineWithoutSourceOrProfileStillRequiresReview() {
        long company = company(), run = run(company);
        long actorId = line(company, run, 4, 9, "MX", "MXN", "1000", "900", "MEXICO");
        jdbc.update("UPDATE payroll_run_lines SET calculation_source = NULL, calculation_inputs_json = NULL WHERE company_id = ? AND run_id = ?", company, run);
        var user = new AuthSessionUser(actorId, company, "Synthetic payroll reviewer", "manager");
        doReturn(HrOperationalScope.corporateOffice()).when(access).resolve(user);
        var summary = (Map<?, ?>) service.getRunDetail(user, run).get("run");
        assertEquals(1, summary.get("fiscal_review_count"));
        assertEquals(false, summary.get("statutory_compliance"));
    }

    private long company() {
        String name = "Payroll scope " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
    }

    private long run(long company) {
        jdbc.update("INSERT INTO payroll_runs (company_id, grouping_mode, pay_period, period_start_date, period_end_date, status) VALUES (?, 'single', 'monthly', '2099-03-01', '2099-03-31', 'draft')", company);
        return jdbc.queryForObject("SELECT id FROM payroll_runs WHERE company_id = ?", Long.class, company);
    }

    private long line(long company, long run, long unit, long business, String country, String currency, String gross, String net, String source) {
        String email = "payroll-scope-" + UUID.randomUUID() + "@example.invalid";
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'synthetic-unused', 'Synthetic payroll employee')", email);
        long user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status) VALUES (?, ?, 'user', 'active')", company, user);
        long member = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?", Long.class, company, user);
        jdbc.update("""
            INSERT INTO payroll_run_lines (company_id, run_id, user_company_id, user_id, user_name_snapshot,
              pay_period_snapshot, salary_type_snapshot, country_code_snapshot, currency_code_snapshot,
              unit_id_snapshot, business_id_snapshot, gross_amount, net_amount, calculation_source)
            VALUES (?, ?, ?, ?, 'Synthetic employee', 'monthly', 'fixed', ?, ?, ?, ?, ?, ?, ?)
            """, company, run, member, user, country, currency, unit, business, new BigDecimal(gross), new BigDecimal(net), source);
        jdbc.update("UPDATE payroll_runs SET users_count = users_count + 1, gross_amount = gross_amount + ?, net_amount = net_amount + ? WHERE company_id = ? AND id = ?", new BigDecimal(gross), new BigDecimal(net), company, run);
        if ("MEXICO".equals(source)) {
            // A reviewed fiscal snapshot; legacy lines without a profile remain review-required.
            jdbc.update("UPDATE payroll_run_lines SET calculation_inputs_json = ? WHERE company_id = ? AND run_id = ? AND user_company_id = ?",
                "{\"countryProfile\":{\"metadata\":{\"mexicoProfileRevision\":1}}}", company, run, member);
        }
        return user;
    }
}
