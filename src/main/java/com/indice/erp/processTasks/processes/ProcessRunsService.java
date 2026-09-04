package com.indice.erp.processTasks.processes;

import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.notifications.AppNotificationService;
import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalPreviewRequest;
import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalPreviewResponse;
import com.indice.erp.processTasks.processes.ProcessRunContracts.OccasionalRunRequest;
import com.indice.erp.processTasks.processes.ProcessRunContracts.PreviewTask;
import com.indice.erp.processTasks.processes.ProcessRunContracts.ProcessOption;
import com.indice.erp.processTasks.processes.ProcessRunContracts.ProcessOptionsResponse;
import com.indice.erp.processTasks.processes.ProcessRunContracts.ProcessRunTask;
import com.indice.erp.processTasks.processes.ProcessRunContracts.ProcessRunView;
import com.indice.erp.processTasks.processes.ProcessRunContracts.ProcessRunsResponse;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessRunsService {

    private static final int MAX_REFERENCE_LENGTH = 220;
    private final JdbcTemplate jdbcTemplate;
    private final ProcessTasksService processTasksService;
    private final AppNotificationService notifications;

    public ProcessRunsService(
            JdbcTemplate jdbcTemplate,
            ProcessTasksService processTasksService,
            AppNotificationService notifications) {
        this.jdbcTemplate = jdbcTemplate;
        this.processTasksService = processTasksService;
        this.notifications = notifications;
    }

    public ProcessOptionsResponse listOccasionalProcesses(long companyId) {
        var items = jdbcTemplate.query(
                """
                    SELECT process.id, process.folio, process.title, process.distribution_mode,
                           process.organization_mode, process.current_version, COUNT(template.id) AS task_count
                    FROM processes process
                    JOIN process_versions version
                      ON version.company_id = process.company_id
                     AND version.process_id = process.id
                     AND version.version_number = process.current_version
                    LEFT JOIN process_task_templates template
                      ON template.company_id = version.company_id
                     AND template.process_version_id = version.id
                    WHERE process.company_id = ?
                      AND process.deleted_at IS NULL
                      AND process.is_active = TRUE
                      AND process.activation_mode = 'occasional'
                    GROUP BY process.id, process.folio, process.title, process.distribution_mode,
                             process.organization_mode, process.current_version
                    ORDER BY process.title, process.id
                    """,
                (rs, rowNum) -> new ProcessOption(
                        rs.getLong("id"),
                        rs.getString("folio"),
                        rs.getString("title"),
                        rs.getString("distribution_mode"),
                        rs.getString("organization_mode"),
                        rs.getInt("current_version"),
                        rs.getInt("task_count")),
                companyId);
        return new ProcessOptionsResponse(items, items.size());
    }

    public OccasionalPreviewResponse previewOccasionalRun(long companyId, OccasionalPreviewRequest request) {
        var reference = requiredReference(request.reference());
        var startDate = request.startDate() != null ? request.startDate() : LocalDate.now();
        var definition = loadDefinition(companyId, request.processId(), "occasional", false);
        var templates = loadTemplates(definition);
        var duplicateCount = duplicateReferenceCount(companyId, request.processId(), normalizeReference(reference));
        return new OccasionalPreviewResponse(
                definition.processId(),
                definition.versionNumber(),
                reference,
                startDate,
                duplicateCount > 0,
                duplicateCount,
                previewTasks(definition, templates, startDate));
    }

    @Transactional
    public ProcessRunView createOccasionalRun(
            long companyId,
            long actorUserId,
            OccasionalRunRequest request,
            String idempotencyKey) {
        var reference = requiredReference(request.reference());
        var normalizedReference = normalizeReference(reference);
        var startDate = request.startDate() != null ? request.startDate() : LocalDate.now();
        var safeIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);

        var definition = loadDefinition(companyId, request.processId(), "occasional", true);
        if (safeIdempotencyKey != null) {
            var existing = findRunByIdempotency(companyId, safeIdempotencyKey);
            if (existing != null) {
                return replayIdempotentRun(
                        companyId,
                        existing,
                        request.processId(),
                        normalizedReference,
                        startDate);
            }
        }
        var duplicateCount = duplicateReferenceCount(companyId, request.processId(), normalizedReference);
        if (duplicateCount > 0 && !request.allowDuplicateReference()) {
            throw new DuplicateProcessReferenceException(duplicateCount);
        }
        return createRun(
                definition,
                actorUserId,
                "occasional",
                reference,
                normalizedReference,
                request.notes(),
                startDate,
                null,
                safeIdempotencyKey);
    }

    @Transactional
    public ProcessRunView ensureRecurringRun(long companyId, long processId, LocalDate occurrenceDate) {
        var definition = loadDefinition(companyId, processId, "recurring", true);
        var existing = findRecurringRun(companyId, processId, occurrenceDate);
        if (existing != null) {
            return getRun(companyId, existing);
        }

        var reference = definition.folio() + " · " + occurrenceDate;
        try {
            return createRun(
                    definition,
                    0L,
                    "recurring",
                    reference,
                    normalizeReference(reference),
                    null,
                    occurrenceDate,
                    occurrenceDate,
                    null);
        } catch (DuplicateKeyException duplicate) {
            var concurrentRun = findRecurringRun(companyId, processId, occurrenceDate);
            if (concurrentRun != null) {
                return getRun(companyId, concurrentRun);
            }
            throw duplicate;
        }
    }

    public ProcessRunsResponse listRuns(long companyId, long processId) {
        requireProcess(companyId, processId);
        var total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM process_runs WHERE company_id = ? AND process_id = ?",
                Integer.class,
                companyId,
                processId);
        var ids = jdbcTemplate.query(
                """
                    SELECT id
                    FROM process_runs
                    WHERE company_id = ? AND process_id = ?
                    ORDER BY created_at DESC, id DESC
                    LIMIT 200
                    """,
                (rs, rowNum) -> rs.getLong("id"),
                companyId,
                processId);
        var items = ids.stream().map(id -> getRun(companyId, id)).toList();
        return new ProcessRunsResponse(items, total == null ? 0 : total);
    }

    public ProcessRunView getRun(long companyId, long runId) {
        var runs = jdbcTemplate.query(
                """
                    SELECT run.id, run.process_id, version.version_number, run.folio, run.activation_mode,
                           run.reference, run.notes, run.start_date, run.status, run.requires_attention,
                           run.created_at, run.finalized_at,
                           COALESCE(NULLIF(TRIM(coordinator.full_name), ''), NULLIF(TRIM(coordinator.email), ''), NULL) AS coordinator_name,
                           SUM(CASE WHEN task.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
                           SUM(CASE WHEN task.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_tasks,
                           SUM(CASE
                             WHEN task.due_date < CURRENT_DATE AND task.status NOT IN ('completed', 'cancelled')
                             THEN 1 ELSE 0
                           END) > 0 AS current_has_delays,
                           COUNT(task.id) AS total_tasks
                    FROM process_runs run
                    JOIN process_versions version ON version.id = run.process_version_id AND version.company_id = run.company_id
                    LEFT JOIN user_companies coordinator_company
                      ON coordinator_company.id = run.coordinator_user_company_id
                     AND coordinator_company.company_id = run.company_id
                    LEFT JOIN users coordinator ON coordinator.id = coordinator_company.user_id
                    LEFT JOIN process_tasks task
                      ON task.company_id = run.company_id
                     AND task.process_run_id = run.id
                     AND task.deleted_at IS NULL
                    WHERE run.company_id = ? AND run.id = ?
                    GROUP BY run.id, run.process_id, version.version_number, run.folio, run.activation_mode,
                             run.reference, run.notes, run.start_date, run.status, run.requires_attention,
                             run.created_at, run.finalized_at, coordinator_name
                    """,
                (rs, rowNum) -> new RunRow(
                        rs.getLong("id"),
                        rs.getLong("process_id"),
                        rs.getInt("version_number"),
                        rs.getString("folio"),
                        rs.getString("activation_mode"),
                        rs.getString("reference"),
                        rs.getString("notes"),
                        rs.getDate("start_date").toLocalDate(),
                        rs.getString("coordinator_name"),
                        rs.getString("status"),
                        rs.getBoolean("requires_attention"),
                        rs.getBoolean("current_has_delays"),
                        rs.getInt("completed_tasks"),
                        rs.getInt("cancelled_tasks"),
                        rs.getInt("total_tasks"),
                        rs.getTimestamp("created_at").toLocalDateTime().toString(),
                        rs.getTimestamp("finalized_at") == null ? null : rs.getTimestamp("finalized_at").toLocalDateTime().toString()),
                companyId,
                runId);
        if (runs.isEmpty()) {
            throw new NoSuchElementException("Process run not found.");
        }
        var row = runs.getFirst();
        return new ProcessRunView(
                row.id(), row.processId(), row.version(), row.folio(), row.activationMode(), row.reference(), row.notes(),
                row.startDate(), row.coordinator(), row.status(), row.requiresAttention(), row.hasDelays(),
                row.completedTasks(), row.cancelledTasks(), row.totalTasks(), row.createdAt(), row.finalizedAt(),
                loadRunTasks(companyId, runId));
    }

    private ProcessRunView createRun(
            Definition definition,
            long actorUserId,
            String activationMode,
            String reference,
            String normalizedReference,
            String notes,
            LocalDate startDate,
            LocalDate occurrenceDate,
            String idempotencyKey) {
        var templates = loadTemplates(definition);
        validateTemplateCount(definition.distributionMode(), templates.size());
        var nextRunNumber = nextRunNumber(definition.companyId(), definition.processId());
        var folio = "RUN-" + Year.now().getValue() + "-" + definition.processId() + "-" + nextRunNumber;
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                        INSERT INTO process_runs
                        (company_id, process_id, process_version_id, folio, run_number, activation_mode,
                         reference, reference_normalized, notes, start_date, occurrence_date,
                         coordinator_user_company_id, status, idempotency_key, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                        """,
                    new String[] { "id" });
            statement.setLong(1, definition.companyId());
            statement.setLong(2, definition.processId());
            statement.setLong(3, definition.versionId());
            statement.setString(4, folio);
            statement.setInt(5, nextRunNumber);
            statement.setString(6, activationMode);
            statement.setString(7, reference);
            statement.setString(8, normalizedReference);
            statement.setString(9, clean(notes));
            statement.setDate(10, java.sql.Date.valueOf(startDate));
            if (occurrenceDate == null) statement.setNull(11, java.sql.Types.DATE);
            else statement.setDate(11, java.sql.Date.valueOf(occurrenceDate));
            if (definition.coordinatorUserCompanyId() == null) statement.setNull(12, java.sql.Types.BIGINT);
            else statement.setLong(12, definition.coordinatorUserCompanyId());
            statement.setString(13, idempotencyKey);
            if (actorUserId <= 0) statement.setNull(14, java.sql.Types.BIGINT);
            else statement.setLong(14, actorUserId);
            return statement;
        }, keyHolder);
        var runId = Objects.requireNonNull(keyHolder.getKey()).longValue();

        var requiresAttention = false;
        for (var template : templates) {
            var assignments = loadTemplateAssignees(definition.companyId(), template.id());
            var activeAssignments = assignments.stream().filter(TemplateAssignee::active).toList();
            if (activeAssignments.size() != assignments.size()) {
                requiresAttention = true;
            }
            var scheduledDate = addConfiguredDays(startDate, template.scheduledOffsetDays(), definition.includeWeekends());
            var dueDate = addConfiguredDays(scheduledDate, template.deadlineOffsetDays(), definition.includeWeekends());
            var taskPayload = new LinkedHashMap<String, Object>();
            taskPayload.put("processId", definition.processId());
            taskPayload.put("title", template.title());
            taskPayload.put("description", template.description());
            taskPayload.put("notes", template.notes());
            taskPayload.put("status", "pending");
            taskPayload.put("priority", template.priority());
            taskPayload.put("startDate", scheduledDate.toString());
            taskPayload.put("dueDate", dueDate.toString());
            taskPayload.put("unitId", template.unitId());
            taskPayload.put("businessId", template.businessId());
            taskPayload.put("completionPercent", 0);
            if (!activeAssignments.isEmpty()) {
                taskPayload.put("assignedUserCompanyId", activeAssignments.getFirst().userCompanyId());
                taskPayload.put("assignedName", activeAssignments.getFirst().name());
                taskPayload.put("assigneeUserCompanyIds", activeAssignments.stream().map(TemplateAssignee::userCompanyId).toList());
            }
            // Generated tasks are system-created. The activating user remains recorded on the run;
            // using the engine identity also keeps a template with only inactive assignees unassigned.
            var createdTask = processTasksService.createTask(definition.companyId(), 0L, taskPayload);
            var taskId = ((Number) createdTask.get("id")).longValue();
            jdbcTemplate.update(
                    """
                        UPDATE process_tasks
                        SET process_run_id = ?, process_task_template_id = ?, evidence_required = ?, completion_policy = ?
                        WHERE company_id = ? AND id = ?
                        """,
                    runId,
                    template.id(),
                    template.evidenceRequired(),
                    activeAssignments.size() > 1 ? "any_assignee" : "lead",
                    definition.companyId(),
                    taskId);
        }

        if (requiresAttention) {
            jdbcTemplate.update(
                    "UPDATE process_runs SET requires_attention = TRUE WHERE company_id = ? AND id = ?",
                    definition.companyId(),
                    runId);
        }
        notifyCoordinator(definition, runId, folio, reference, requiresAttention);
        return getRun(definition.companyId(), runId);
    }

    private void notifyCoordinator(Definition definition, long runId, String folio, String reference, boolean attention) {
        if (definition.coordinatorUserCompanyId() == null) return;
        notifications.publish(new AppNotificationEvent(
                definition.companyId(), definition.coordinatorUserCompanyId(), "processes", "process_run", runId,
                "process_run_created", "process-run-created-" + runId,
                "Process run created: " + definition.title(),
                folio + " · " + reference,
                "/processes-tasks/processes"));
        if (attention) {
            notifications.publish(new AppNotificationEvent(
                    definition.companyId(), definition.coordinatorUserCompanyId(), "processes", "process_run", runId,
                    "process_run_attention", "process-run-attention-" + runId,
                    "Process run requires attention",
                    "One or more configured assignees are inactive; their tasks were created unassigned.",
                    "/processes-tasks/processes"));
        }
    }

    private Definition loadDefinition(long companyId, long processId, String expectedActivationMode, boolean lock) {
        var rows = jdbcTemplate.query(
                """
                    SELECT process.company_id, process.id, process.folio, process.title, process.distribution_mode,
                           process.activation_mode, process.organization_mode, process.include_weekends,
                           process.coordinator_user_company_id, process.current_version,
                           version.id AS version_id
                    FROM processes process
                    JOIN process_versions version
                      ON version.company_id = process.company_id
                     AND version.process_id = process.id
                     AND version.version_number = process.current_version
                    WHERE process.company_id = ? AND process.id = ?
                      AND process.deleted_at IS NULL AND process.is_active = TRUE
                    """ + (lock ? " FOR UPDATE" : ""),
                (rs, rowNum) -> new Definition(
                        rs.getLong("company_id"), rs.getLong("id"), rs.getString("folio"), rs.getString("title"),
                        rs.getString("distribution_mode"), rs.getString("activation_mode"), rs.getString("organization_mode"),
                        rs.getBoolean("include_weekends"), rs.getObject("coordinator_user_company_id", Long.class),
                        rs.getInt("current_version"), rs.getLong("version_id")),
                companyId,
                processId);
        if (rows.isEmpty()) throw new NoSuchElementException("Active process not found.");
        var definition = rows.getFirst();
        if (!expectedActivationMode.equals(definition.activationMode())) {
            throw new IllegalArgumentException("Process activation mode must be " + expectedActivationMode + ".");
        }
        return definition;
    }

    private List<Template> loadTemplates(Definition definition) {
        return jdbcTemplate.query(
                """
                    SELECT id, position_number, stage_number, title, description, notes, priority,
                           unit_id, business_id, scheduled_offset_days, deadline_offset_days, evidence_required
                    FROM process_task_templates
                    WHERE company_id = ? AND process_id = ? AND process_version_id = ?
                    ORDER BY position_number, id
                    """,
                (rs, rowNum) -> new Template(
                        rs.getLong("id"), rs.getInt("position_number"), rs.getInt("stage_number"),
                        rs.getString("title"), rs.getString("description"), rs.getString("notes"),
                        rs.getString("priority"), rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class),
                        rs.getInt("scheduled_offset_days"), rs.getInt("deadline_offset_days"), rs.getBoolean("evidence_required")),
                definition.companyId(), definition.processId(), definition.versionId());
    }

    private List<TemplateAssignee> loadTemplateAssignees(long companyId, long templateId) {
        return jdbcTemplate.query(
                """
                    SELECT assignee.user_company_id,
                           LOWER(COALESCE(user_company.status, 'active')) IN ('active', 'activo') AS is_active,
                           COALESCE(NULLIF(TRIM(user_account.full_name), ''), NULLIF(TRIM(user_account.email), ''), CONCAT('User #', assignee.user_company_id)) AS display_name
                    FROM process_task_template_assignees assignee
                    JOIN user_companies user_company
                      ON user_company.id = assignee.user_company_id AND user_company.company_id = assignee.company_id
                    JOIN users user_account ON user_account.id = user_company.user_id
                    WHERE assignee.company_id = ? AND assignee.template_id = ?
                    ORDER BY assignee.position_number, assignee.id
                    """,
                (rs, rowNum) -> new TemplateAssignee(
                        rs.getLong("user_company_id"), rs.getBoolean("is_active"), rs.getString("display_name")),
                companyId,
                templateId);
    }

    private List<PreviewTask> previewTasks(Definition definition, List<Template> templates, LocalDate startDate) {
        return templates.stream().map(template -> {
            var scheduled = addConfiguredDays(startDate, template.scheduledOffsetDays(), definition.includeWeekends());
            var due = addConfiguredDays(scheduled, template.deadlineOffsetDays(), definition.includeWeekends());
            var assignees = loadTemplateAssignees(definition.companyId(), template.id()).stream()
                    .map(assignee -> assignee.active() ? assignee.name() : assignee.name() + " (inactive)")
                    .toList();
            return new PreviewTask(template.id(), template.position(), template.stage(), template.title(), template.priority(),
                    scheduled, due, template.evidenceRequired(), assignees);
        }).toList();
    }

    private List<ProcessRunTask> loadRunTasks(long companyId, long runId) {
        var rows = jdbcTemplate.query(
                """
                    SELECT task.id, task.folio, task.title, task.status, task.priority,
                           COALESCE(template.stage_number, 1) AS stage_number,
                           task.start_date, task.due_date, task.evidence_required,
                           (SELECT COUNT(*) FROM process_task_attachments attachment
                            WHERE attachment.company_id = task.company_id AND attachment.task_id = task.id
                              AND attachment.deleted_at IS NULL) AS attachment_count
                    FROM process_tasks task
                    LEFT JOIN process_task_templates template
                      ON template.id = task.process_task_template_id AND template.company_id = task.company_id
                    WHERE task.company_id = ? AND task.process_run_id = ? AND task.deleted_at IS NULL
                    ORDER BY COALESCE(template.position_number, task.id), task.id
                    """,
                (rs, rowNum) -> new TaskRow(
                        rs.getLong("id"), rs.getString("folio"), rs.getString("title"), rs.getString("status"),
                        rs.getString("priority"), rs.getInt("stage_number"),
                        rs.getDate("start_date") == null ? null : rs.getDate("start_date").toLocalDate(),
                        rs.getDate("due_date") == null ? null : rs.getDate("due_date").toLocalDate(),
                        rs.getBoolean("evidence_required"), rs.getInt("attachment_count")),
                companyId,
                runId);
        var assigneesByTask = loadTaskAssigneeNames(
                companyId,
                rows.stream().map(TaskRow::id).toList());
        return rows.stream().map(row -> new ProcessRunTask(
                row.id(), row.folio(), row.title(), row.status(), row.priority(), row.stage(), row.startDate(), row.dueDate(),
                row.evidenceRequired(), row.attachmentCount(), assigneesByTask.getOrDefault(row.id(), List.of()))).toList();
    }

    private Map<Long, List<String>> loadTaskAssigneeNames(long companyId, List<Long> taskIds) {
        if (taskIds.isEmpty()) {
            return Map.of();
        }
        var placeholders = String.join(",", taskIds.stream().map(taskId -> "?").toList());
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(taskIds);
        var assignments = jdbcTemplate.query(
                """
                    SELECT assignment.task_id,
                           COALESCE(NULLIF(TRIM(user_account.full_name), ''), NULLIF(TRIM(user_account.email), ''), CONCAT('User #', assignment.user_company_id)) AS display_name
                    FROM process_task_assignees assignment
                    JOIN user_companies user_company ON user_company.id = assignment.user_company_id AND user_company.company_id = assignment.company_id
                    JOIN users user_account ON user_account.id = user_company.user_id
                    WHERE assignment.company_id = ? AND assignment.task_id IN (%s) AND assignment.removed_at IS NULL
                    ORDER BY CASE WHEN assignment.assignment_role = 'lead' THEN 0 ELSE 1 END, assignment.id
                    """.formatted(placeholders),
                (rs, rowNum) -> new TaskAssigneeName(rs.getLong("task_id"), rs.getString("display_name")),
                params.toArray());
        var namesByTask = new LinkedHashMap<Long, List<String>>();
        assignments.forEach(assignment -> namesByTask.computeIfAbsent(
                assignment.taskId(),
                ignored -> new ArrayList<>()).add(assignment.name()));
        return namesByTask;
    }

    private Long findRecurringRun(long companyId, long processId, LocalDate occurrenceDate) {
        var ids = jdbcTemplate.query(
                "SELECT id FROM process_runs WHERE company_id = ? AND process_id = ? AND occurrence_date = ? LIMIT 1",
                (rs, rowNum) -> rs.getLong("id"),
                companyId, processId, java.sql.Date.valueOf(occurrenceDate));
        return ids.isEmpty() ? null : ids.getFirst();
    }

    private Long findRunByIdempotency(long companyId, String idempotencyKey) {
        var ids = jdbcTemplate.query(
                "SELECT id FROM process_runs WHERE company_id = ? AND idempotency_key = ? LIMIT 1",
                (rs, rowNum) -> rs.getLong("id"), companyId, idempotencyKey);
        return ids.isEmpty() ? null : ids.getFirst();
    }

    private ProcessRunView replayIdempotentRun(
            long companyId,
            long runId,
            long processId,
            String normalizedReference,
            LocalDate startDate) {
        var existing = getRun(companyId, runId);
        if (existing.processId() != processId
                || !normalizeReference(existing.reference()).equals(normalizedReference)
                || !existing.startDate().equals(startDate)) {
            throw new IllegalArgumentException("Idempotency-Key was already used for a different process run request.");
        }
        return existing;
    }

    private int duplicateReferenceCount(long companyId, long processId, String normalizedReference) {
        var value = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM process_runs WHERE company_id = ? AND process_id = ? AND reference_normalized = ?",
                Integer.class, companyId, processId, normalizedReference);
        return value == null ? 0 : value;
    }

    private int nextRunNumber(long companyId, long processId) {
        var value = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(run_number), 0) + 1 FROM process_runs WHERE company_id = ? AND process_id = ?",
                Integer.class, companyId, processId);
        return value == null ? 1 : value;
    }

    private void requireProcess(long companyId, long processId) {
        var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM processes WHERE company_id = ? AND id = ?",
                Integer.class, companyId, processId);
        if (count == null || count == 0) throw new NoSuchElementException("Process not found.");
    }

    private void validateTemplateCount(String distributionMode, int count) {
        if ("shared".equals(distributionMode) && count < 2) {
            throw new IllegalArgumentException("A shared process requires at least two task templates.");
        }
        if ("individual".equals(distributionMode) && count != 1) {
            throw new IllegalArgumentException("An individual process requires exactly one task template.");
        }
        if (count > 50) throw new IllegalArgumentException("A process cannot contain more than 50 task templates.");
    }

    private String requiredReference(String value) {
        var clean = clean(value);
        if (clean == null) throw new IllegalArgumentException("reference is required.");
        if (clean.length() > MAX_REFERENCE_LENGTH) throw new IllegalArgumentException("reference cannot exceed 220 characters.");
        return clean;
    }

    private String normalizeReference(String value) {
        return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private String normalizeIdempotencyKey(String value) {
        var clean = clean(value);
        if (clean == null) return null;
        if (clean.length() > 120) throw new IllegalArgumentException("Idempotency-Key cannot exceed 120 characters.");
        return clean;
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return value.trim();
    }

    static LocalDate addConfiguredDays(LocalDate date, int days, boolean includeWeekends) {
        var result = date;
        if (includeWeekends) return result.plusDays(Math.max(0, days));
        while (result.getDayOfWeek() == DayOfWeek.SATURDAY || result.getDayOfWeek() == DayOfWeek.SUNDAY) {
            result = result.plusDays(1);
        }
        var remaining = Math.max(0, days);
        while (remaining > 0) {
            result = result.plusDays(1);
            if (result.getDayOfWeek() != DayOfWeek.SATURDAY && result.getDayOfWeek() != DayOfWeek.SUNDAY) {
                remaining--;
            }
        }
        return result;
    }

    private record Definition(long companyId, long processId, String folio, String title,
            String distributionMode, String activationMode, String organizationMode, boolean includeWeekends,
            Long coordinatorUserCompanyId, int versionNumber, long versionId) {
    }

    private record Template(long id, int position, int stage, String title, String description, String notes,
            String priority, Long unitId, Long businessId, int scheduledOffsetDays, int deadlineOffsetDays,
            boolean evidenceRequired) {
    }

    private record TemplateAssignee(long userCompanyId, boolean active, String name) {
    }

    private record RunRow(long id, long processId, int version, String folio, String activationMode,
            String reference, String notes, LocalDate startDate, String coordinator, String status,
            boolean requiresAttention, boolean hasDelays, int completedTasks, int cancelledTasks, int totalTasks,
            String createdAt, String finalizedAt) {
    }

    private record TaskRow(long id, String folio, String title, String status, String priority, int stage,
            LocalDate startDate, LocalDate dueDate, boolean evidenceRequired, int attachmentCount) {
    }

    private record TaskAssigneeName(long taskId, String name) {
    }
}
