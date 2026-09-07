package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.indice.erp.auth.AuthSessionUser;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@Transactional
class AutomatedReportIntegrationTest {
    @Autowired AutomatedReportService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired FinancialLedgerRepository ledger;
    AuthSessionUser user;
    @BeforeEach void setup() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        long id = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'superadmin', 'active', 'all')", company, id);
        jdbc.update("INSERT INTO company_module_entitlements (company_id, module_slug, status) VALUES (?, 'kpis', 'active')", company);
        user = new AuthSessionUser(id, company, "Synthetic report owner", "superadmin");
        ledger.ensureSettings(company, id); ledger.ensureStandardAccounts(company, id);
    }
    AutomatedReportService.RuleRequest request(String status) {
        return new AutomatedReportService.RuleRequest("Actual accounting snapshot", "Synthetic report evidence", "ACCOUNTING", "MONTHLY", status, null, null, "CAD", 0);
    }
    @Test void reportIsPersistentIdempotentAndScopedToCreatorAndCompany() {
        var rule = service.save(user, null, request("draft"));
        assertThat(rule.nextRun()).isNull();
        assertThat(service.list(user)).hasSize(1);
        var result = service.generate(user, rule.id(), "run-" + UUID.randomUUID());
        assertThat(result.snapshot().path("context").path("functionalCurrency").asText()).isEqualTo("MXN");
        assertThat(result.snapshot().path("preparationNotes").size()).isPositive();
        assertThat(service.download(user, rule.id(), result.id()).snapshot()).isEqualTo(result.snapshot());
        String key = "retry-" + UUID.randomUUID();
        var first = service.generate(user, rule.id(), key);
        assertThat(service.generate(user, rule.id(), key).id()).isEqualTo(first.id());
        assertThat(service.list(user).getFirst().latestRunId()).isEqualTo(first.id());
        assertThatThrownBy(() -> service.download(new AuthSessionUser(user.userId() + 10000, user.companyId(), "Other", "superadmin"), rule.id(), result.id()))
            .isInstanceOf(ResponseStatusException.class);
        jdbc.update("UPDATE company_module_entitlements SET status = 'inactive' WHERE company_id = ? AND module_slug = 'kpis'", user.companyId());
        assertThatThrownBy(() -> service.download(user, rule.id(), result.id())).isInstanceOf(ResponseStatusException.class);
    }
    @Test void dueScheduleRunsOnceAndAdvancesItsNextExecution() {
        var rule = service.save(user, null, request("ready"));
        jdbc.update("UPDATE kpi_automated_report_rules SET next_run_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 MINUTE) WHERE company_id = ? AND id = ?", user.companyId(), rule.id());
        var due = service.dueRules().stream().filter(item -> item.company() == user.companyId()).findFirst().orElseThrow();
        service.runScheduled(due);
        service.runScheduled(due);
        var updated = service.list(user).getFirst();
        assertThat(updated.nextRun()).isAfter(java.time.Instant.now());
        assertThat(updated.latestRunId()).isNotNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM kpi_automated_report_runs WHERE company_id = ? AND rule_id = ?", Integer.class, user.companyId(), rule.id())).isEqualTo(1);
        var snapshot = service.download(user, rule.id(), updated.latestRunId());
        var previous = java.time.YearMonth.now(java.time.ZoneId.of("America/Mexico_City")).minusMonths(1);
        assertThat(snapshot.from()).isEqualTo(previous.atDay(1));
        assertThat(snapshot.to()).isEqualTo(previous.atEndOfMonth());
    }

    @Test void scheduleRequiresOptInAndRevokedMembershipCannotExecute() {
        var rule = service.save(user, null, request("ready"));
        assertThat(rule.nextRun()).isAfter(java.time.Instant.now());
        jdbc.update("UPDATE kpi_automated_report_rules SET next_run_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 MINUTE) WHERE company_id = ? AND id = ?", user.companyId(), rule.id());
        var due = service.dueRules().stream().filter(item -> item.company() == user.companyId()).findFirst().orElseThrow();
        jdbc.update("UPDATE user_companies SET status = 'inactive' WHERE company_id = ? AND user_id = ?", user.companyId(), user.userId());
        assertThatThrownBy(() -> service.runScheduled(due)).isInstanceOf(ResponseStatusException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM kpi_automated_report_runs WHERE company_id = ?", Integer.class, user.companyId())).isZero();
    }
}
