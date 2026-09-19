package com.indice.erp.processTasks.kpis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {"app.email.enabled=false", "app.entitlements.projection-enabled=false"})
@Transactional
class ProcessTaskKpiMeasurementsIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ProcessTaskKpisService service;
    @MockBean ProcessTaskAssignmentScopeService scope;
    long company;
    LocalDate today = LocalDate.now();
    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        company = company();
        when(scope.taskVisibilityFilter(anyLong(), anyLong(), anyString(), anyString()))
                .thenReturn(new ProcessTaskAssignmentScopeService.TaskVisibilityFilter("1 = 1", List.of()));
    }
    long company() {
        String name = "KPI fixture " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
    }
    void task(long tenant, String folio, String status, LocalDate due, LocalDate closed) {
        jdbc.update("""
            INSERT INTO process_tasks (company_id, folio, title, status, priority, due_date, agenda_date,
                created_at, completed_at, evidence_required)
            VALUES (?, ?, ?, ?, 'high', ?, ?, ?, ?, true)
            """, tenant, folio, folio, status, due, due, today.minusDays(10).atStartOfDay(), closed == null ? null : closed.atTime(12, 0));
    }
    Map<String, Object> dashboard(String search) {
        return service.getDashboard(company, 0, today.minusDays(10).toString(), today.toString(), true, false,
                null, null, null, null, "team", "all", search);
    }
    @Test void realSqlPreservesLegacyContractsAndAddsDeadlineEvidenceAndEventMeasurements() {
        task(company, "on-time", "completed", today.minusDays(1), today.minusDays(1));
        task(company, "late-close", "completed", today.minusDays(3), today.minusDays(1));
        task(company, "paused", "paused", today.minusDays(4), null);
        task(company, "active", "in_progress", today.minusDays(2), null);
        task(company(), "other-company", "pending", today.minusDays(8), null);
        var body = dashboard("");
        var measurements = (ProcessTaskKpiMeasurements) body.get("measurements");
        assertThat(measurements.summary().tasks()).isEqualTo(4);
        assertThat(measurements.summary().lateOpenTasks()).isEqualTo(2);
        assertThat(measurements.summary().onTimeRate()).isEqualTo(50.0);
        assertThat(measurements.summary().missingRequiredEvidence()).isEqualTo(4);
        assertThat(measurements.summary().pendingAuditTasks()).isEqualTo(2);
        assertThat(((Map<?, ?>)body.get("summary")).get("overdueTasks")).isEqualTo(0);
        assertThat(measurements.activity().stream().mapToInt(ProcessTaskKpiMeasurements.Activity::closedTasks).sum()).isEqualTo(2);
    }
    @Test void measurementQueryHonorsTheSameVisibilityAndSearchAsTheDashboard() {
        task(company, "visible", "pending", today.minusDays(1), null);
        task(company, "restricted", "pending", today.minusDays(1), null);
        task(company(), "visible", "pending", today.minusDays(1), null);
        when(scope.taskVisibilityFilter(eq(company), anyLong(), anyString(), anyString()))
                .thenReturn(new ProcessTaskAssignmentScopeService.TaskVisibilityFilter("pt.folio = ?", List.of("visible")));
        assertThat(((ProcessTaskKpiMeasurements)dashboard("").get("measurements")).summary().tasks()).isEqualTo(1);
        assertThat(((ProcessTaskKpiMeasurements)dashboard("restricted").get("measurements")).summary().tasks()).isZero();
    }
}
