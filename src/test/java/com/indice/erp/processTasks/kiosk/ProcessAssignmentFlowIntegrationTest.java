package com.indice.erp.processTasks.kiosk;

import com.indice.erp.processTasks.agenda.AgendaService;
import com.indice.erp.processTasks.processes.ProcessesService;
import com.indice.erp.processTasks.processes.ProcessRunsService;
import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalRunRequest;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentCatalogService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = {"app.email.enabled=false", "app.entitlements.projection-enabled=false"})
@Transactional
class ProcessAssignmentFlowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ProcessesService processes;
    @Autowired ProcessRunsService runs;
    @Autowired ProcessTasksService tasks;
    @Autowired AgendaService agenda;
    @Autowired ProcessTaskAssignmentCatalogService catalog;
    @Autowired ProcessTaskKioskQueryService kioskTasks;
    @Autowired ProcessTaskKioskIdentityService identities;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;

    @Test
    @SuppressWarnings("unchecked")
    void profileIdentitySurvivesProcessGenerationAgendaKioskAndCompletion() {
        var companyName = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", companyName);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, companyName);
        var person = person(company, "Account name", "Profile assignee");
        var other = person(company, "Other account", "Other assignee");
        assertThat(catalog.list(company, person[0]).items()).anySatisfy(option -> {
            assertThat(option.userCompanyId()).isEqualTo(person[1]);
            assertThat(option.name()).isEqualTo("Profile assignee");
        });
        var definition = processes.createProcess(company, person[0], "Profile assignee", Map.of(
            "title", "Assignment flow " + UUID.randomUUID(), "description", "Isolated regression",
            "coordinatorUserCompanyId", person[1], "responsibleUserCompanyId", person[1],
            "distributionMode", "shared", "activationMode", "occasional", "organizationMode", "parallel",
            "taskTemplates", List.of(template("Assigned task", person[1]), template("Other task", other[1]))));
        var processId = ((Number) definition.get("id")).longValue();
        var run = runs.createOccasionalRun(company, person[0],
            new OccasionalRunRequest(processId, "Regression run", LocalDate.now(), null, false), UUID.randomUUID().toString());
        var taskId = run.tasks().getFirst().id();
        assertThat(run.tasks().getFirst().assignees()).containsExactly("Profile assignee");
        assertThat(tasks.getTask(company, taskId)).containsEntry("assignedUserCompanyId", person[1])
            .containsEntry("assignedName", "Profile assignee");
        // Historical free text cannot override the linked assignee's current identity.
        jdbc.update("UPDATE process_tasks SET assigned_name = 'Stale label' WHERE company_id = ? AND id = ?", company, taskId);
        var items = (List<Map<String, Object>>) agenda.listAgendaTasks(company, person[0],
            LocalDate.now().toString(), LocalDate.now().plusDays(2).toString()).get("items");
        assertThat(items).anySatisfy(row -> assertThat(row).containsEntry("taskId", taskId)
            .containsEntry("assignedName", "Profile assignee"));
        jdbc.update("INSERT INTO user_access_profiles (company_id, user_company_id, user_id) VALUES (?, ?, ?)", company, person[1], person[0]);
        long profile = jdbc.queryForObject("SELECT id FROM user_access_profiles WHERE company_id=? AND user_company_id=?", Long.class, company, person[1]);
        String pin = "472819"; // Synthetic credential; this transaction is rolled back.
        jdbc.update("INSERT INTO user_access_methods (company_id, access_profile_id, method_type, secret_hash) VALUES (?, ?, 'pin', ?)", company, profile, passwords.encode(pin));
        var employee = identities.resolveEmployeeByPin(company, pin);
        assertThat(employee.userCompanyId()).isEqualTo(person[1]);
        assertThat(employee.fullName()).isEqualTo("Profile assignee");
        var kiosk = new ProcessTaskKioskRow(1, company, null, null, null, null, "test", "Test", "active",
            "ACTIVE", null, "test", "test", false, null, null, null);
        assertThat(kioskTasks.listTasks(kiosk, employee)).singleElement().satisfies(row -> assertThat(row)
            .containsEntry("id", taskId).containsEntry("assigned_name", "Profile assignee"));
        assertThatThrownBy(() -> kioskTasks.visibleTask(kiosk, identities.loadEmployee(company, other[1]), taskId))
            .isInstanceOf(java.util.NoSuchElementException.class);
        tasks.completeTask(company, person[0], taskId, Map.of("completionNotes", "Regression completed"));
        assertThat(kioskTasks.visibleTask(kiosk, employee, taskId)).containsEntry("status", "completed");
        assertThat(jdbc.queryForObject("SELECT assigned_user_company_id FROM process_tasks WHERE company_id = ? AND id = ?",
            Long.class, company, taskId)).isEqualTo(person[1]);
    }

    private Map<String, Object> template(String title, long assignee) {
        return Map.of("title", title, "description", "Test", "stage", 1, "scheduledOffsetDays", 0,
            "deadlineOffsetDays", 1, "assigneeUserCompanyIds", List.of(assignee));
    }
    private long[] person(long company, String accountName, String profileName) {
        var email = UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'test', ?)", email, accountName);
        long user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO user_profiles (user_id, full_name) VALUES (?, ?)", user, profileName);
        jdbc.update("INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'user', 'active', 'all')", user, company);
        long membership = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?", Long.class, company, user);
        return new long[]{user, membership};
    }
}
