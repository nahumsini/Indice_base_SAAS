package com.indice.erp.processTasks.processes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalPreviewRequest;
import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalRunRequest;
import com.indice.erp.processTasks.ProcessTaskDocumentSequenceService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "app.email.enabled=false",
        "app.entitlements.projection-enabled=false"
})
class SharedProcessMigrationIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ProcessesService processesService;

    @Autowired
    private ProcessRunsService processRunsService;

    @Autowired
    private ProcessMaterializationJob processMaterializationJob;

    @Autowired
    private ProcessTasksService processTasksService;

    @Autowired
    private ProcessTaskDocumentSequenceService documentSequenceService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void sharedProcessSchemaIsAvailableAfterFlywayStartup() {
        assertEquals(1, tableCount("process_versions"));
        assertEquals(1, tableCount("process_task_templates"));
        assertEquals(1, tableCount("process_runs"));
        assertEquals(1, tableCount("process_task_document_sequences"));
        assertEquals(1, columnCount("process_tasks", "process_run_id"));
        assertEquals(1, columnCount("process_tasks", "evidence_required"));
        assertEquals(1, columnCount("processes", "materialization_retry_at"));
        assertEquals(1, columnCount("processes", "materialization_last_error"));
    }

    @Test
    void documentSequencesAllocateUniqueFoliosUnderConcurrency() throws Exception {
        var companyId = jdbcTemplate.queryForObject("SELECT id FROM companies ORDER BY id LIMIT 1", Long.class);
        var transaction = new TransactionTemplate(transactionManager);
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(6);
        var futures = new ArrayList<java.util.concurrent.Future<String>>();
        try {
            for (int index = 0; index < 12; index++) {
                futures.add(executor.submit(() -> {
                    if (!start.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("Concurrent sequence test did not start in time.");
                    }
                    return transaction.execute(status -> documentSequenceService.nextTaskFolio(companyId));
                }));
            }
            start.countDown();
            var folios = new ArrayList<String>();
            for (var future : futures) {
                folios.add(future.get(20, TimeUnit.SECONDS));
            }
            assertThat(folios).hasSize(12).doesNotHaveDuplicates();
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void recurringSchedulerIsolatesFailuresAndSkipsDefinitionsWhoseWindowIsAlreadyCovered() {
        var companyId = jdbcTemplate.queryForObject("SELECT id FROM companies ORDER BY id LIMIT 1", Long.class);
        var coordinator = createCollaborator(companyId, "Scheduler coordinator");
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var failingProcessId = 0L;
        var healthyProcessId = 0L;
        try {
            failingProcessId = createRecurringProcess(companyId, coordinator, "Failing scheduler process " + suffix);
            healthyProcessId = createRecurringProcess(companyId, coordinator, "Healthy scheduler process " + suffix);

            jdbcTemplate.update(
                    """
                        UPDATE processes
                        SET current_version = 999999,
                            generated_until_date = NULL,
                            materialization_retry_at = NULL,
                            materialization_failure_count = 0,
                            materialization_last_error = NULL
                        WHERE company_id = ? AND id = ?
                        """,
                    companyId,
                    failingProcessId);
            jdbcTemplate.update(
                    """
                        UPDATE processes
                        SET generated_until_date = NULL,
                            materialization_retry_at = NULL,
                            materialization_failure_count = 3,
                            materialization_last_error = 'previous failure'
                        WHERE company_id = ? AND id = ?
                        """,
                    companyId,
                    healthyProcessId);

            processMaterializationJob.materializeDueProcesses();

            var failingState = jdbcTemplate.queryForMap(
                    """
                        SELECT materialization_failure_count, materialization_retry_at, materialization_last_error
                        FROM processes WHERE company_id = ? AND id = ?
                        """,
                    companyId,
                    failingProcessId);
            assertThat(((Number) failingState.get("materialization_failure_count")).intValue()).isEqualTo(1);
            assertThat(failingState.get("materialization_retry_at")).isNotNull();
            assertThat(failingState.get("materialization_last_error").toString()).contains("Active process not found");

            var healthyState = jdbcTemplate.queryForMap(
                    """
                        SELECT generated_until_date, materialization_failure_count,
                               materialization_retry_at, materialization_last_error
                        FROM processes WHERE company_id = ? AND id = ?
                        """,
                    companyId,
                    healthyProcessId);
            assertThat(healthyState.get("generated_until_date")).isNotNull();
            assertThat(((Number) healthyState.get("materialization_failure_count")).intValue()).isZero();
            assertThat(healthyState.get("materialization_retry_at")).isNull();
            assertThat(healthyState.get("materialization_last_error")).isNull();

            var sentinel = Timestamp.valueOf("2000-01-01 00:00:00");
            jdbcTemplate.update(
                    "UPDATE processes SET last_materialized_at = ? WHERE company_id = ? AND id = ?",
                    sentinel,
                    companyId,
                    healthyProcessId);
            processMaterializationJob.materializeDueProcesses();
            assertThat(jdbcTemplate.queryForObject(
                    "SELECT last_materialized_at FROM processes WHERE company_id = ? AND id = ?",
                    Timestamp.class,
                    companyId,
                    healthyProcessId)).isEqualTo(sentinel);
        } finally {
            if (failingProcessId > 0) {
                jdbcTemplate.update(
                        "UPDATE processes SET deleted_at = CURRENT_TIMESTAMP WHERE company_id = ? AND id = ?",
                        companyId,
                        failingProcessId);
            }
            if (healthyProcessId > 0) {
                jdbcTemplate.update(
                        "UPDATE processes SET deleted_at = CURRENT_TIMESTAMP WHERE company_id = ? AND id = ?",
                        companyId,
                        healthyProcessId);
            }
        }
    }

    @Test
    void concurrentRetriesOfAnOccasionalActivationCreateOnlyOneRun() throws Exception {
        var companyId = jdbcTemplate.queryForObject("SELECT id FROM companies ORDER BY id LIMIT 1", Long.class);
        var coordinator = createCollaborator(companyId, "Idempotency coordinator");
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var processId = createIndividualProcess(
                companyId,
                coordinator,
                "Idempotent occasional process " + suffix,
                "occasional");
        var request = new OccasionalRunRequest(
                processId,
                "Idempotency reference " + suffix,
                LocalDate.now(),
                null,
                false);
        var idempotencyKey = "process-run-concurrency-" + UUID.randomUUID();
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> {
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Concurrent activation test did not start in time.");
                }
                return processRunsService.createOccasionalRun(
                        companyId,
                        coordinator.userId(),
                        request,
                        idempotencyKey);
            });
            var second = executor.submit(() -> {
                if (!start.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Concurrent activation test did not start in time.");
                }
                return processRunsService.createOccasionalRun(
                        companyId,
                        coordinator.userId(),
                        request,
                        idempotencyKey);
            });
            start.countDown();

            var firstRun = first.get(20, TimeUnit.SECONDS);
            var secondRun = second.get(20, TimeUnit.SECONDS);
            assertThat(secondRun.id()).isEqualTo(firstRun.id());
            assertThat(jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM process_runs WHERE company_id = ? AND process_id = ?",
                    Integer.class,
                    companyId,
                    processId)).isEqualTo(1);
            assertThat(jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM process_tasks WHERE company_id = ? AND process_run_id = ? AND deleted_at IS NULL",
                    Integer.class,
                    companyId,
                    firstRun.id())).isEqualTo(1);
        } finally {
            executor.shutdownNow();
            jdbcTemplate.update(
                    "UPDATE processes SET deleted_at = CURRENT_TIMESTAMP WHERE company_id = ? AND id = ?",
                    companyId,
                    processId);
        }
    }

    @Test
    @Transactional
    void occasionalDefinitionRejectsAssigneeOutsideTaskScopeBeforeItCanBeActivated() {
        var companyId = jdbcTemplate.queryForObject("SELECT id FROM companies ORDER BY id LIMIT 1", Long.class);
        var collaborator = createCollaborator(companyId, "Scoped collaborator");
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        jdbcTemplate.update("INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')", companyId, "Scoped A " + suffix);
        var unitA = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = ? AND name = ?", Long.class, companyId, "Scoped A " + suffix);
        jdbcTemplate.update("INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')", companyId, "Scoped B " + suffix);
        var unitB = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = ? AND name = ?", Long.class, companyId, "Scoped B " + suffix);
        jdbcTemplate.update(
                """
                    INSERT INTO user_work_profiles
                        (company_id, user_company_id, user_id, user_code, position, department, unit_id, status)
                    VALUES (?, ?, ?, ?, 'Operator', 'Operations', ?, 'active')
                    """,
                companyId,
                collaborator.userCompanyId(),
                collaborator.userId(),
                "PROC-SCOPE-" + suffix,
                unitA);

        var task = new LinkedHashMap<>(taskTemplate(
                "Out-of-scope task",
                1,
                0,
                0,
                false,
                List.of(collaborator.userCompanyId())));
        task.put("unitId", unitB);

        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", "Scoped occasional process " + suffix);
        payload.put("description", "This definition must fail before activation.");
        payload.put("frequency", "weekly");
        payload.put("priority", "medium");
        payload.put("responsibleUserCompanyId", collaborator.userCompanyId());
        payload.put("coordinatorUserCompanyId", collaborator.userCompanyId());
        payload.put("distributionMode", "individual");
        payload.put("activationMode", "occasional");
        payload.put("organizationMode", "parallel");
        payload.put("includeWeekends", true);
        payload.put("taskTemplates", List.of(task));

        assertThatThrownBy(() -> processesService.createProcess(
                companyId,
                collaborator.userId(),
                "Scoped collaborator",
                payload))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot receive tasks for this scope");
    }

    @Test
    @Transactional
    void taskWithAnotherUnitDoesNotInheritAnIncompatibleDefaultBusiness() {
        var companyId = jdbcTemplate.queryForObject("SELECT id FROM companies ORDER BY id LIMIT 1", Long.class);
        var coordinator = createCollaborator(companyId, "Cross-unit coordinator");
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        jdbcTemplate.update("INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')", companyId, "Unit A " + suffix);
        var unitA = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = ? AND name = ?", Long.class, companyId, "Unit A " + suffix);
        jdbcTemplate.update("INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')", companyId, "Unit B " + suffix);
        var unitB = jdbcTemplate.queryForObject("SELECT id FROM units WHERE company_id = ? AND name = ?", Long.class, companyId, "Unit B " + suffix);
        jdbcTemplate.update(
                "INSERT INTO businesses (company_id, unit_id, name, status) VALUES (?, ?, ?, 'active')",
                companyId,
                unitA,
                "Business A " + suffix);
        var businessA = jdbcTemplate.queryForObject(
                "SELECT id FROM businesses WHERE company_id = ? AND name = ?",
                Long.class,
                companyId,
                "Business A " + suffix);

        var task = new LinkedHashMap<>(taskTemplate(
                "Cross-unit task",
                1,
                0,
                0,
                false,
                List.of(coordinator.userCompanyId())));
        task.put("unitId", unitB);

        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", "Cross-unit process " + suffix);
        payload.put("description", "The task belongs to another unit without forcing the process business.");
        payload.put("frequency", "weekly");
        payload.put("priority", "medium");
        payload.put("responsibleUserCompanyId", coordinator.userCompanyId());
        payload.put("coordinatorUserCompanyId", coordinator.userCompanyId());
        payload.put("distributionMode", "individual");
        payload.put("activationMode", "occasional");
        payload.put("organizationMode", "parallel");
        payload.put("includeWeekends", true);
        payload.put("unitId", unitA);
        payload.put("businessId", businessA);
        payload.put("taskTemplates", List.of(task));

        var process = processesService.createProcess(companyId, coordinator.userId(), "Coordinator", payload);
        var processId = ((Number) process.get("id")).longValue();
        var scope = jdbcTemplate.queryForMap(
                """
                        SELECT template.unit_id, template.business_id
                        FROM process_task_templates template
                        JOIN processes process ON process.id = template.process_id
                        JOIN process_versions version ON version.id = template.process_version_id
                        WHERE template.company_id = ? AND process.id = ? AND version.version_number = process.current_version
                        """,
                companyId,
                processId);

        assertThat(((Number) scope.get("unit_id")).longValue()).isEqualTo(unitB);
        assertThat(scope.get("business_id")).isNull();
    }

    @Test
    @Transactional
    void occasionalSharedRunCreatesRealTasksAndClosesWithIncidents() {
        var companyId = jdbcTemplate.queryForObject("SELECT id FROM companies ORDER BY id LIMIT 1", Long.class);
        var coordinator = createCollaborator(companyId, "Coordinator");
        var teammate = createCollaborator(companyId, "Teammate");

        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", "Property onboarding");
        payload.put("description", "Coordinate the onboarding of a new rental property.");
        payload.put("frequency", "weekly");
        payload.put("priority", "high");
        payload.put("responsibleUserCompanyId", coordinator.userCompanyId());
        payload.put("coordinatorUserCompanyId", coordinator.userCompanyId());
        payload.put("distributionMode", "shared");
        payload.put("activationMode", "occasional");
        payload.put("organizationMode", "staged");
        payload.put("includeWeekends", false);
        payload.put("isActive", true);
        payload.put("taskTemplates", List.of(
                taskTemplate("Publish Airbnb listing", 1, 0, 1, true,
                        List.of(coordinator.userCompanyId(), teammate.userCompanyId())),
                taskTemplate("Inspect the property", 2, 1, 2, false,
                        List.of(teammate.userCompanyId()))));

        var process = processesService.createProcess(
                companyId,
                coordinator.userId(),
                "Coordinator",
                payload);
        var processId = ((Number) process.get("id")).longValue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM process_tasks WHERE company_id = ? AND process_id = ?",
                Integer.class,
                companyId,
                processId)).isZero();

        var start = LocalDate.of(2026, 9, 4);
        var preview = processRunsService.previewOccasionalRun(
                companyId,
                new OccasionalPreviewRequest(processId, "Depa 303 Linda Vista", start));
        assertThat(preview.tasks()).hasSize(2);
        assertThat(preview.tasks().get(0).scheduledDate()).isEqualTo(start);
        assertThat(preview.tasks().get(0).dueDate()).isEqualTo(LocalDate.of(2026, 9, 7));
        assertThat(preview.tasks().get(1).scheduledDate()).isEqualTo(LocalDate.of(2026, 9, 7));
        assertThat(preview.tasks().get(1).dueDate()).isEqualTo(LocalDate.of(2026, 9, 9));

        var request = new OccasionalRunRequest(
                processId,
                "Depa 303 Linda Vista",
                start,
                "First integration",
                false);
        var run = processRunsService.createOccasionalRun(companyId, coordinator.userId(), request, "shared-run-test");
        assertThat(run.totalTasks()).isEqualTo(2);
        assertThat(run.tasks().get(0).assignees()).containsExactlyInAnyOrder("Coordinator", "Teammate");
        assertThat(run.tasks().get(0).evidenceRequired()).isTrue();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT completion_policy FROM process_tasks WHERE company_id = ? AND id = ?",
                String.class,
                companyId,
                run.tasks().get(0).id())).isEqualTo("any_assignee");

        assertThatThrownBy(() -> processTasksService.completeTask(
                companyId,
                coordinator.userId(),
                run.tasks().get(0).id(),
                Map.of("completionNotes", "Done")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("evidence attachment");
        jdbcTemplate.update(
                """
                        INSERT INTO process_task_attachments
                        (company_id, task_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
                        VALUES (?, ?, 'evidence.jpg', 'image/jpeg', 100, ?, ?)
                        """,
                companyId,
                run.tasks().get(0).id(),
                "tests/process-runs/" + UUID.randomUUID(),
                coordinator.userId());
        processTasksService.completeTask(
                companyId,
                coordinator.userId(),
                run.tasks().get(0).id(),
                Map.of("completionNotes", "Done"));
        processTasksService.cancelTask(companyId, coordinator.userId(), run.tasks().get(1).id());

        var finalized = processRunsService.getRun(companyId, run.id());
        assertThat(finalized.status()).isEqualTo("finalized_with_incidents");
        assertThat(finalized.finalizedAt()).isNotNull();
        assertThat(processRunsService.createOccasionalRun(
                companyId,
                coordinator.userId(),
                request,
                "shared-run-test").id()).isEqualTo(run.id());

        jdbcTemplate.update("UPDATE user_companies SET status = 'inactive' WHERE id = ?", teammate.userCompanyId());
        var attentionRun = processRunsService.createOccasionalRun(
                companyId,
                coordinator.userId(),
                new OccasionalRunRequest(processId, "Depa 304 Linda Vista", start, null, false),
                "shared-run-attention-test");
        assertThat(attentionRun.requiresAttention()).isTrue();
        assertThat(attentionRun.tasks().get(1).assignees()).isEmpty();
        assertThat(processRunsService.previewOccasionalRun(
                companyId,
                new OccasionalPreviewRequest(processId, "  DEPA 303   LINDA VISTA ", start)).duplicateReference()).isTrue();
    }

    private Collaborator createCollaborator(long companyId, String name) {
        var email = "process-run-" + UUID.randomUUID() + "@example.test";
        jdbcTemplate.update(
                "INSERT INTO users (email, password_hash, full_name) VALUES (?, 'test-hash', ?)",
                email,
                name);
        var userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbcTemplate.update(
                "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'user', 'active', 'all')",
                userId,
                companyId);
        var userCompanyId = jdbcTemplate.queryForObject(
                "SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?",
                Long.class,
                companyId,
                userId);
        return new Collaborator(userId, userCompanyId);
    }

    private long createRecurringProcess(long companyId, Collaborator coordinator, String title) {
        return createIndividualProcess(companyId, coordinator, title, "recurring");
    }

    private long createIndividualProcess(
            long companyId,
            Collaborator coordinator,
            String title,
            String activationMode) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", title);
        payload.put("description", "Process engine integration test.");
        payload.put("frequency", "weekly");
        payload.put("priority", "medium");
        payload.put("responsibleUserCompanyId", coordinator.userCompanyId());
        payload.put("coordinatorUserCompanyId", coordinator.userCompanyId());
        payload.put("distributionMode", "individual");
        payload.put("activationMode", activationMode);
        payload.put("organizationMode", "parallel");
        payload.put("includeWeekends", true);
        payload.put("startDate", LocalDate.now().toString());
        payload.put("generationWindowDays", 45);
        payload.put("taskTemplates", List.of(taskTemplate(
                title + " task",
                1,
                0,
                1,
                false,
                List.of(coordinator.userCompanyId()))));
        var process = processesService.createProcess(companyId, coordinator.userId(), "Scheduler coordinator", payload);
        return ((Number) process.get("id")).longValue();
    }

    private Map<String, Object> taskTemplate(
            String title,
            int stage,
            int scheduledOffsetDays,
            int deadlineOffsetDays,
            boolean evidenceRequired,
            List<Long> assigneeIds) {
        var template = new LinkedHashMap<String, Object>();
        template.put("title", title);
        template.put("description", title + " instructions");
        template.put("priority", "high");
        template.put("stage", stage);
        template.put("scheduledOffsetDays", scheduledOffsetDays);
        template.put("deadlineOffsetDays", deadlineOffsetDays);
        template.put("evidenceRequired", evidenceRequired);
        template.put("assigneeUserCompanyIds", assigneeIds);
        return template;
    }

    private record Collaborator(long userId, long userCompanyId) {
    }

    private int tableCount(String tableName) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
                Integer.class,
                tableName);
        return count == null ? 0 : count;
    }

    private int columnCount(String tableName, String columnName) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                Integer.class,
                tableName,
                columnName);
        return count == null ? 0 : count;
    }
}
