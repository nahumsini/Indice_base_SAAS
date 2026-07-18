package com.indice.erp.processTasks.tasks;

import static com.indice.erp.processTasks.tasks.support.ProcessTaskInput.optionalInteger;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskInput.optionalString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskInput.parseTaskCommand;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableDate;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableDateTime;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableInteger;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableLong;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableTime;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.toDateString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.toDateTimeString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.toLocalDateTime;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.toTimeString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskPresentation.fallback;

import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.notifications.AppNotificationService;
import com.indice.erp.processTasks.tasks.domain.TaskCommand;
import com.indice.erp.processTasks.tasks.domain.TaskLifecycle;
import com.indice.erp.processTasks.tasks.domain.TaskMutationRecord;
import com.indice.erp.processTasks.tasks.domain.UserCompanyReference;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Year;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessTasksService {

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "pending",
            "in_progress",
            "completed",
            "cancelled",
            "paused");
    private static final Set<String> ALLOWED_PRIORITIES = Set.of("low", "medium", "high");
    private static final Set<String> ALLOWED_DEPENDENCY_TYPES = Set.of("finish_to_start");
    private static final Set<String> PATCHABLE_TASK_FIELDS = Set.of(
            "title",
            "description",
            "processId",
            "projectId",
            "assignedUserCompanyId",
            "assignedName",
            "status",
            "priority",
            "startDate",
            "dueDate",
            "notes",
            "completionPercent",
            "weighting",
            "audited",
            "auditNotes",
            "businessId",
            "unitId");
    private static final long MAX_ATTACHMENT_SIZE_BYTES = 10L * 1024L * 1024L;

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final AppNotificationService appNotificationService;
    private static final String TASK_SELECT_COLUMNS = """
            SELECT pt.id,
                   pt.company_id,
                   pt.process_id,
                   pt.project_id,
                   pt.folio,
                   pt.title,
                   pt.description,
                   pt.assigned_user_company_id,
                   assigned_user_company.user_id AS assigned_user_id,
                   COALESCE(
                       NULLIF(pt.assigned_name, ''),
                       NULLIF(TRIM(assigned_user.full_name), ''),
                       NULLIF(TRIM(assigned_user.email), ''),
                       NULL
                   ) AS resolved_assigned_name,
                   pt.status,
                   pt.priority,
                   pt.start_date,
                   pt.due_date,
                   pt.agenda_date,
                   pt.agenda_start_time,
                   pt.agenda_end_time,
                   pt.agenda_time_zone,
                   pt.started_at,
                   pt.completed_at,
                   pt.cancelled_at,
                   pt.completed_by_user_company_id,
                   COALESCE(completed_user_company.user_id, pt.completed_by_user_id) AS completed_by_user_id,
                   COALESCE(
                       NULLIF(TRIM(completed_user.full_name), ''),
                       NULLIF(TRIM(completed_user.email), ''),
                       NULL
                   ) AS resolved_completed_by_name,
                   pt.completion_notes,
                   pt.notes,
                   pt.completion_percent,
                   pt.weighting,
                   pt.audited,
                   pt.audit_notes,
                   pt.audited_at,
                   pt.audited_by_user_company_id,
                   audited_user_company.user_id AS audited_by_user_id,
                   COALESCE(
                       NULLIF(TRIM(audited_user.full_name), ''),
                       NULLIF(TRIM(audited_user.email), ''),
                       NULL
                   ) AS resolved_audited_by_name,
                   pt.business_id,
                   business.name AS business_name,
                   pt.unit_id,
                   unit.name AS unit_name,
                   pt.created_by,
                   COALESCE(
                       NULLIF(TRIM(created_user.full_name), ''),
                       NULLIF(TRIM(created_user.email), ''),
                       NULL
                   ) AS resolved_created_by_name,
                   pt.created_at,
                   pt.updated_at,
                   task_dependency.id AS predecessor_dependency_id,
                   task_dependency.predecessor_task_id,
                   task_dependency.dependency_type,
                   task_dependency.lag_days AS dependency_lag_days,
                   predecessor_task.folio AS predecessor_task_folio,
                   predecessor_task.title AS predecessor_task_title,
                   (
                       SELECT COUNT(*)
                       FROM process_task_attachments attachment
                       WHERE attachment.company_id = pt.company_id
                         AND attachment.task_id = pt.id
                         AND attachment.deleted_at IS NULL
                   ) AS attachments
            FROM process_tasks pt
            LEFT JOIN user_companies assigned_user_company ON assigned_user_company.id = pt.assigned_user_company_id
                AND assigned_user_company.company_id = pt.company_id
            LEFT JOIN users assigned_user ON assigned_user.id = assigned_user_company.user_id
            LEFT JOIN user_companies completed_user_company ON completed_user_company.id = pt.completed_by_user_company_id
                AND completed_user_company.company_id = pt.company_id
            LEFT JOIN users completed_user ON completed_user.id = COALESCE(completed_user_company.user_id, pt.completed_by_user_id)
            LEFT JOIN user_companies audited_user_company ON audited_user_company.id = pt.audited_by_user_company_id
                AND audited_user_company.company_id = pt.company_id
            LEFT JOIN users audited_user ON audited_user.id = audited_user_company.user_id
            LEFT JOIN users created_user ON created_user.id = pt.created_by
            LEFT JOIN businesses business ON business.id = pt.business_id
                AND (business.company_id = pt.company_id OR business.company_id IS NULL)
            LEFT JOIN units unit ON unit.id = pt.unit_id
                AND (unit.company_id = pt.company_id OR unit.company_id IS NULL)
            LEFT JOIN (
                SELECT company_id, successor_task_id, MIN(id) AS dependency_id
                FROM process_task_dependencies
                WHERE deleted_at IS NULL
                GROUP BY company_id, successor_task_id
            ) main_dependency ON main_dependency.company_id = pt.company_id
                AND main_dependency.successor_task_id = pt.id
            LEFT JOIN process_task_dependencies task_dependency ON task_dependency.id = main_dependency.dependency_id
            LEFT JOIN process_tasks predecessor_task ON predecessor_task.id = task_dependency.predecessor_task_id
                AND predecessor_task.company_id = pt.company_id
                AND predecessor_task.deleted_at IS NULL
            """;

    public ProcessTasksService(
        JdbcTemplate jdbcTemplate,
        ProcessTaskAssignmentScopeService assignmentScopeService,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        AppNotificationService appNotificationService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.assignmentScopeService = assignmentScopeService;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
        this.appNotificationService = appNotificationService;
    }

    public Map<String, Object> listTasks(long companyId, long userId) {
        var visibility = assignmentScopeService.taskVisibilityFilter(companyId, userId, "pt", "business");
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(visibility.params());

        var rows = jdbcTemplate.query(
                TASK_SELECT_COLUMNS +
                        """
                                WHERE pt.company_id = ?
                                  AND pt.deleted_at IS NULL
                                  AND %s
                                ORDER BY pt.id DESC
                                """.formatted(visibility.condition()),
                (rs, rowNum) -> mapTaskRow(rs),
                params.toArray());

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    public Map<String, Object> listTasksForProject(long companyId, long userId, long projectId) {
        var visibility = assignmentScopeService.taskVisibilityFilter(companyId, userId, "pt", "business");
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(projectId);
        params.addAll(visibility.params());

        var rows = jdbcTemplate.query(
                TASK_SELECT_COLUMNS +
                        """
                                WHERE pt.company_id = ?
                                  AND pt.deleted_at IS NULL
                                  AND pt.project_id = ?
                                  AND %s
                                ORDER BY pt.id DESC
                                """.formatted(visibility.condition()),
                (rs, rowNum) -> mapTaskRow(rs),
                params.toArray());

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createTask(long companyId, long userId, Map<String, Object> payload) {
        var command = parseTaskCommand(payload, ALLOWED_STATUSES, ALLOWED_PRIORITIES);
        validateReferences(companyId, command);
        var currentUserCompanyId = currentUserCompanyId(companyId, userId);
        var assignedUserCompanyId = command.assignedUserCompanyId() != null
                ? command.assignedUserCompanyId()
                : currentUserCompanyId;
        var assignedUserCompany = requireActiveUserCompany(
                companyId,
                assignedUserCompanyId,
                "Assigned user not found.");
        assignmentScopeService.requireCanAssign(
                companyId,
                userId,
                command.unitId(),
                command.businessId(),
                assignedUserCompanyId);

        var lifecycle = lifecycleForCreate(command.status(), userId, currentUserCompanyId);
        var audited = Boolean.TRUE.equals(command.audited());
        var auditedAt = audited ? LocalDateTime.now() : null;
        var auditedByUserCompanyId = audited ? currentUserCompanyId : null;
        var completionPercent = completionPercentForCreate(command);
        var folio = nextTaskFolio(companyId);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            INSERT INTO process_tasks
                            (company_id, process_id, project_id, folio, title, description, assigned_user_id, assigned_user_company_id,
                             assigned_name, status, priority, start_date, due_date, started_at, completed_at, cancelled_at,
                             completed_by_user_id, completed_by_user_company_id, completion_notes, notes, completion_percent, weighting,
                             audited, audit_notes, audited_at, audited_by_user_company_id, business_id, unit_id, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    new String[] { "id" });

            statement.setLong(1, companyId);
            setNullableLong(statement, 2, command.processId());
            setNullableLong(statement, 3, command.projectId());
            statement.setString(4, folio);
            statement.setString(5, command.title());
            setNullableString(statement, 6, command.description());
            setNullableLong(statement, 7, assignedUserCompany != null ? assignedUserCompany.userId() : null);
            setNullableLong(statement, 8, assignedUserCompany != null ? assignedUserCompany.id() : null);
            setNullableString(statement, 9, command.assignedName());
            statement.setString(10, command.status());
            statement.setString(11, command.priority());
            setNullableDate(statement, 12, command.startDate());
            setNullableDate(statement, 13, command.dueDate());
            setNullableDateTime(statement, 14, lifecycle.startedAt());
            setNullableDateTime(statement, 15, lifecycle.completedAt());
            setNullableDateTime(statement, 16, lifecycle.cancelledAt());
            setNullableLong(statement, 17, lifecycle.completedByUserId());
            setNullableLong(statement, 18, lifecycle.completedByUserCompanyId());
            setNullableString(statement, 19, lifecycle.completionNotes());
            setNullableString(statement, 20, command.notes());
            statement.setInt(21, completionPercent);
            setNullableInteger(statement, 22, command.weighting());
            statement.setBoolean(23, audited);
            setNullableString(statement, 24, audited ? command.auditNotes() : null);
            setNullableDateTime(statement, 25, auditedAt);
            setNullableLong(statement, 26, auditedByUserCompanyId);
            setNullableLong(statement, 27, command.businessId());
            setNullableLong(statement, 28, command.unitId());
            statement.setLong(29, userId);
            return statement;
        }, keyHolder);

        var taskId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
        var task = getTask(companyId, taskId);
        publishTaskAssigned(companyId, userId, task, "task_assigned", "assigned");
        if ("completed".equals(command.status()) && !audited) {
            publishTaskPendingAudit(companyId, userId, task);
        }
        return task;
    }

    @Transactional
    public Map<String, Object> updateTask(long companyId, long userId, long taskId, Map<String, Object> payload) {
        var existingTask = requireTaskForMutation(companyId, taskId);
        var command = parseTaskCommand(payload, ALLOWED_STATUSES, ALLOWED_PRIORITIES);
        validateReferences(companyId, command);
        var assignedUserCompany = requireActiveUserCompany(
                companyId,
                command.assignedUserCompanyId(),
                "Assigned user not found.");
        var currentUserCompanyId = currentUserCompanyId(companyId, userId);
        assignmentScopeService.requireCanAssign(
                companyId,
                userId,
                command.unitId(),
                command.businessId(),
                command.assignedUserCompanyId());
        var lifecycle = lifecycleForStatus(existingTask, command.status(), userId, currentUserCompanyId);
        var startDate = payload.containsKey("startDate") ? command.startDate() : existingTask.startDate();
        var notes = payload.containsKey("notes") ? command.notes() : existingTask.notes();
        var completionPercent = completionPercentForUpdate(existingTask, command, payload);
        var weighting = payload.containsKey("weighting") ? command.weighting() : existingTask.weighting();
        var audited = auditedForUpdate(existingTask, command, payload);
        var auditNotes = auditNotesForUpdate(existingTask, command, payload, audited);
        var auditedAt = auditedAtForUpdate(existingTask, audited, payload);
        var auditedByUserCompanyId = auditedByUserCompanyIdForUpdate(
                existingTask,
                audited,
                currentUserCompanyId,
                payload);

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            UPDATE process_tasks
                            SET process_id = ?,
                                project_id = ?,
                                title = ?,
                                description = ?,
                                assigned_user_id = ?,
                                assigned_user_company_id = ?,
                                assigned_name = ?,
                                status = ?,
                                priority = ?,
                                start_date = ?,
                                due_date = ?,
                                started_at = ?,
                                completed_at = ?,
                                cancelled_at = ?,
                                completed_by_user_id = ?,
                                completed_by_user_company_id = ?,
                                completion_notes = ?,
                                notes = ?,
                                completion_percent = ?,
                                weighting = ?,
                                audited = ?,
                                audit_notes = ?,
                                audited_at = ?,
                                audited_by_user_company_id = ?,
                                business_id = ?,
                                unit_id = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            setNullableLong(statement, 1, command.processId());
            setNullableLong(statement, 2, command.projectId());
            statement.setString(3, command.title());
            setNullableString(statement, 4, command.description());
            setNullableLong(statement, 5, assignedUserCompany != null ? assignedUserCompany.userId() : null);
            setNullableLong(statement, 6, assignedUserCompany != null ? assignedUserCompany.id() : null);
            setNullableString(statement, 7, command.assignedName());
            statement.setString(8, command.status());
            statement.setString(9, command.priority());
            setNullableDate(statement, 10, startDate);
            setNullableDate(statement, 11, command.dueDate());
            setNullableDateTime(statement, 12, lifecycle.startedAt());
            setNullableDateTime(statement, 13, lifecycle.completedAt());
            setNullableDateTime(statement, 14, lifecycle.cancelledAt());
            setNullableLong(statement, 15, lifecycle.completedByUserId());
            setNullableLong(statement, 16, lifecycle.completedByUserCompanyId());
            setNullableString(statement, 17, lifecycle.completionNotes());
            setNullableString(statement, 18, notes);
            statement.setInt(19, completionPercent);
            setNullableInteger(statement, 20, weighting);
            statement.setBoolean(21, audited);
            setNullableString(statement, 22, auditNotes);
            setNullableDateTime(statement, 23, auditedAt);
            setNullableLong(statement, 24, auditedByUserCompanyId);
            setNullableLong(statement, 25, command.businessId());
            setNullableLong(statement, 26, command.unitId());
            statement.setLong(27, companyId);
            statement.setLong(28, taskId);
            return statement;
        });

        var task = getTask(companyId, taskId);
        var nextAssignedUserCompanyId = numberValue(task.get("assignedUserCompanyId"));
        if (nextAssignedUserCompanyId != null && !nextAssignedUserCompanyId.equals(existingTask.assignedUserCompanyId())) {
            publishTaskAssigned(companyId, userId, task, "task_reassigned", "reassigned");
        }
        if (!"completed".equals(existingTask.status()) && "completed".equals(command.status()) && !audited) {
            publishTaskPendingAudit(companyId, userId, task);
        }
        if (!existingTask.audited() && audited) {
            publishTaskAudited(companyId, userId, task);
        }
        return task;
    }

    @Transactional
    public Map<String, Object> patchTask(long companyId, long userId, long taskId, Map<String, Object> patch) {
        if (patch == null || patch.isEmpty()) {
            throw new IllegalArgumentException("At least one task field is required.");
        }

        var unsupportedFields = patch.keySet().stream()
                .filter(field -> !PATCHABLE_TASK_FIELDS.contains(field))
                .sorted()
                .toList();
        if (!unsupportedFields.isEmpty()) {
            throw new IllegalArgumentException("Unsupported task fields: " + String.join(", ", unsupportedFields) + ".");
        }

        var existingTask = getTask(companyId, taskId);
        var mergedPayload = new LinkedHashMap<String, Object>();
        PATCHABLE_TASK_FIELDS.forEach(field -> mergedPayload.put(field, existingTask.get(field)));
        mergedPayload.putAll(patch);

        return updateTask(companyId, userId, taskId, mergedPayload);
    }

    @Transactional
    public Map<String, Object> updateAgendaPlacement(long companyId, long userId, long taskId, Map<String, Object> payload) {
        requireTaskAccess(companyId, userId, taskId);

        var agendaDate = nullableDate(payload, "agendaDate", "agenda_date");
        var agendaStartTime = nullableTime(payload, "agendaStartTime", "agenda_start_time");
        var agendaEndTime = nullableTime(payload, "agendaEndTime", "agenda_end_time");
        var agendaTimeZone = nullableTimeZone(payload, "agendaTimeZone", "agenda_time_zone", "timeZone", "time_zone");

        if (agendaDate == null && (agendaStartTime != null || agendaEndTime != null || agendaTimeZone != null)) {
            throw new IllegalArgumentException("agendaDate is required when agenda time fields are provided.");
        }

        if (agendaStartTime != null && agendaEndTime != null && agendaEndTime.isBefore(agendaStartTime)) {
            throw new IllegalArgumentException("agendaEndTime must be greater than or equal to agendaStartTime.");
        }

        if (agendaDate == null) {
            agendaStartTime = null;
            agendaEndTime = null;
            agendaTimeZone = null;
        }

        var placementDate = agendaDate;
        var placementStartTime = agendaStartTime;
        var placementEndTime = agendaEndTime;
        var placementTimeZone = agendaTimeZone;

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            UPDATE process_tasks
                            SET agenda_date = ?,
                                agenda_start_time = ?,
                                agenda_end_time = ?,
                                agenda_time_zone = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            setNullableDate(statement, 1, placementDate);
            setNullableTime(statement, 2, placementStartTime);
            setNullableTime(statement, 3, placementEndTime);
            setNullableString(statement, 4, placementTimeZone);
            statement.setLong(5, companyId);
            statement.setLong(6, taskId);
            return statement;
        });

        var task = getTask(companyId, taskId);
        publishTaskPendingAudit(companyId, userId, task);
        return task;
    }

    public Map<String, Object> listTaskDependencies(long companyId, long userId, long taskId) {
        requireTaskAccess(companyId, userId, taskId);

        var rows = jdbcTemplate.query(
                """
                        SELECT dependency.id,
                               dependency.company_id,
                               dependency.predecessor_task_id,
                               dependency.successor_task_id,
                               dependency.dependency_type,
                               dependency.lag_days,
                               predecessor.folio AS predecessor_task_folio,
                               predecessor.title AS predecessor_task_title,
                               successor.folio AS successor_task_folio,
                               successor.title AS successor_task_title,
                               dependency.created_by,
                               dependency.created_at,
                               dependency.updated_at
                        FROM process_task_dependencies dependency
                        JOIN process_tasks predecessor ON predecessor.id = dependency.predecessor_task_id
                            AND predecessor.company_id = dependency.company_id
                            AND predecessor.deleted_at IS NULL
                        JOIN process_tasks successor ON successor.id = dependency.successor_task_id
                            AND successor.company_id = dependency.company_id
                            AND successor.deleted_at IS NULL
                        WHERE dependency.company_id = ?
                          AND dependency.successor_task_id = ?
                          AND dependency.deleted_at IS NULL
                        ORDER BY dependency.id ASC
                        """,
                (rs, rowNum) -> mapTaskDependencyRow(rs),
                companyId,
                taskId);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> updateTaskDependencies(
            long companyId,
            long userId,
            long taskId,
            Map<String, Object> payload) {
        requireTaskAccess(companyId, userId, taskId);
        var successor = requireTaskDependencyRef(companyId, taskId);
        var predecessorTaskId = parseLong(payload, "predecessorTaskId", "predecessor_task_id");
        var dependencyType = dependencyType(payload);
        var lagDays = dependencyLagDays(payload);

        jdbcTemplate.update(
                """
                        UPDATE process_task_dependencies
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE company_id = ?
                          AND successor_task_id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                taskId);

        if (predecessorTaskId == null) {
            return getTask(companyId, taskId);
        }

        if (predecessorTaskId == taskId) {
            throw new IllegalArgumentException("A task cannot depend on itself.");
        }

        requireTaskAccess(companyId, userId, predecessorTaskId);
        var predecessor = requireTaskDependencyRef(companyId, predecessorTaskId);
        validateSameProjectDependency(successor, predecessor);
        validateNoDependencyCycle(companyId, taskId, predecessorTaskId);

        jdbcTemplate.update(
                """
                        INSERT INTO process_task_dependencies
                        (company_id, predecessor_task_id, successor_task_id, dependency_type, lag_days, created_by)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                companyId,
                predecessorTaskId,
                taskId,
                dependencyType,
                lagDays,
                userId);

        var task = getTask(companyId, taskId);
        publishTaskAudited(companyId, userId, task);
        return task;
    }

    @Transactional
    public void deleteTask(long companyId, long userId, long taskId) {
        requireTaskAccess(companyId, userId, taskId);

        jdbcTemplate.update(
                """
                        UPDATE process_tasks
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                taskId);
    }

    @Transactional
    public Map<String, Object> completeTask(long companyId, long userId, long taskId, Map<String, Object> payload) {
        requireTaskAccess(companyId, userId, taskId);
        var completionNotes = optionalString(payload, "completionNotes");
        var completionPercent = optionalInteger(payload, "completionPercent", "completion");
        var userCompanyId = currentUserCompanyId(companyId, userId);

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            UPDATE process_tasks
                            SET status = 'completed',
                                started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                                completed_at = CURRENT_TIMESTAMP,
                                cancelled_at = NULL,
                                completed_by_user_id = ?,
                                completed_by_user_company_id = ?,
                                completion_notes = ?,
                                completion_percent = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            statement.setLong(1, userId);
            setNullableLong(statement, 2, userCompanyId);
            setNullableString(statement, 3, completionNotes);
            statement.setInt(4, completionPercent != null ? completionPercent : 100);
            statement.setLong(5, companyId);
            statement.setLong(6, taskId);
            return statement;
        });

        return getTask(companyId, taskId);
    }

    @Transactional
    public Map<String, Object> auditTask(long companyId, long userId, long taskId, Map<String, Object> payload) {
        requireTaskAccess(companyId, userId, taskId);
        var existingTask = requireTaskForMutation(companyId, taskId);
        if (!"completed".equals(existingTask.status())) {
            throw new IllegalArgumentException("Task must be completed before audit.");
        }

        var weighting = optionalInteger(payload, "weighting");
        if (weighting == null) {
            throw new IllegalArgumentException("weighting is required for audit.");
        }
        if (weighting < 0 || weighting > 5) {
            throw new IllegalArgumentException("weighting must be between 0 and 5.");
        }

        var auditNotes = optionalString(payload, "auditNotes");
        var userCompanyId = currentUserCompanyId(companyId, userId);

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            UPDATE process_tasks
                            SET audited = TRUE,
                                audit_notes = ?,
                                audited_at = CURRENT_TIMESTAMP,
                                audited_by_user_company_id = ?,
                                weighting = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            setNullableString(statement, 1, auditNotes);
            setNullableLong(statement, 2, userCompanyId);
            statement.setInt(3, weighting);
            statement.setLong(4, companyId);
            statement.setLong(5, taskId);
            return statement;
        });

        return getTask(companyId, taskId);
    }

    @Transactional
    public Map<String, Object> cancelTask(long companyId, long userId, long taskId) {
        requireTaskAccess(companyId, userId, taskId);

        jdbcTemplate.update(
                """
                        UPDATE process_tasks
                        SET status = 'cancelled',
                            cancelled_at = CURRENT_TIMESTAMP,
                            completed_at = NULL,
                            completed_by_user_id = NULL,
                            completed_by_user_company_id = NULL,
                            completion_notes = NULL
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                taskId);

        return getTask(companyId, taskId);
    }

    public Map<String, Object> listAttachments(long companyId, long userId, long taskId) {
        requireTaskAccess(companyId, userId, taskId);

        var rows = loadAttachments(companyId, taskId);
        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createAttachmentUpload(long companyId, long taskId, Map<String, Object> payload) {
        requireTask(companyId, taskId);
        return createAttachmentUploadUnchecked(companyId, taskId, payload);
    }

    @Transactional
    public Map<String, Object> createAttachmentUpload(
            long companyId,
            long userId,
            long taskId,
            Map<String, Object> payload) {
        requireTaskAccess(companyId, userId, taskId);
        return createAttachmentUploadUnchecked(companyId, taskId, payload);
    }

    private Map<String, Object> createAttachmentUploadUnchecked(long companyId, long taskId, Map<String, Object> payload) {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var fileName = normalizeOriginalFileName(stringValue(payload, "file_name", "fileName"));
        var contentType = normalizeAttachmentContentType(
                stringValue(payload, "content_type", "contentType", "mime_type", "mimeType"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        validateAttachmentSize(sizeBytes);

        var objectKey = buildAttachmentObjectKey(companyId, taskId, fileName, contentType);
        var upload = objectStorageService.presignUpload(
                documentsBucket(),
                objectKey,
                contentType,
                objectStorageProperties.getMinio().getPresignExpirySeconds());

        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    @Transactional
    public Map<String, Object> registerAttachment(
            long companyId,
            long actorUserId,
            long taskId,
            Map<String, Object> payload) {
        requireTaskAccess(companyId, actorUserId, taskId);
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var objectKey = normalizeAttachmentObjectKey(companyId, taskId, stringValue(payload, "object_key", "objectKey"));
        var fileName = normalizeOriginalFileName(
                stringValue(payload, "original_filename", "originalFileName", "file_name", "fileName"));
        var mimeType = normalizeAttachmentContentType(
                stringValue(payload, "mime_type", "mimeType", "content_type", "contentType"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        validateAttachmentSize(sizeBytes);

        if (!objectStorageService.objectExists(documentsBucket(), objectKey)) {
            throw new IllegalArgumentException("object_key does not reference an existing uploaded attachment.");
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                            INSERT INTO process_task_attachments
                            (company_id, task_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                    new String[] { "id" });
            statement.setLong(1, companyId);
            statement.setLong(2, taskId);
            statement.setString(3, fileName);
            statement.setString(4, mimeType);
            statement.setLong(5, sizeBytes);
            statement.setString(6, objectKey);
            statement.setLong(7, actorUserId);
            return statement;
        }, keyHolder);

        var attachmentId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (attachmentId <= 0) {
            throw new IllegalArgumentException("Unable to register attachment.");
        }

        return loadAttachment(companyId, taskId, attachmentId);
    }

    @Transactional
    public void deleteAttachment(long companyId, long userId, long taskId, long attachmentId) {
        requireTaskAccess(companyId, userId, taskId);

        var rows = jdbcTemplate.query(
                """
                        SELECT id,
                               object_key,
                               original_filename
                        FROM process_task_attachments
                        WHERE company_id = ?
                          AND task_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                (rs, rowNum) -> new AttachmentRef(
                        rs.getLong("id"),
                        safe(rs.getString("object_key")),
                        safe(rs.getString("original_filename"))),
                companyId,
                taskId,
                attachmentId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attachment not found.");
        }

        jdbcTemplate.update(
                """
                        UPDATE process_task_attachments
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE company_id = ?
                          AND task_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                taskId,
                attachmentId);

        deleteAttachmentObjectQuietly(rows.getFirst().objectKey());
    }

    public Map<String, Object> getTask(long companyId, long taskId) {
        var rows = jdbcTemplate.query(
                TASK_SELECT_COLUMNS +
                        """
                                WHERE pt.company_id = ?
                                  AND pt.id = ?
                                  AND pt.deleted_at IS NULL
                                """,
                (rs, rowNum) -> mapTaskRow(rs),
                companyId,
                taskId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found.");
        }

        return rows.getFirst();
    }

    private LocalDate nullableDate(Map<String, Object> payload, String key, String... aliases) {
        var value = firstPayloadValue(payload, key, aliases);
        if (value == null) {
            return null;
        }

        var normalized = String.valueOf(value).trim();
        if (normalized.isEmpty()) {
            return null;
        }

        try {
            return LocalDate.parse(normalized);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(key + " must use YYYY-MM-DD format.");
        }
    }

    private LocalTime nullableTime(Map<String, Object> payload, String key, String... aliases) {
        var value = firstPayloadValue(payload, key, aliases);
        if (value == null) {
            return null;
        }

        var normalized = String.valueOf(value).trim();
        if (normalized.isEmpty()) {
            return null;
        }

        try {
            return LocalTime.parse(normalized);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(key + " must use HH:mm or HH:mm:ss format.");
        }
    }

    private String nullableTimeZone(Map<String, Object> payload, String key, String... aliases) {
        var value = firstPayloadValue(payload, key, aliases);
        if (value == null) {
            return null;
        }

        var normalized = String.valueOf(value).trim();
        if (normalized.isEmpty()) {
            return null;
        }

        try {
            ZoneId.of(normalized);
        } catch (DateTimeException ex) {
            throw new IllegalArgumentException(key + " must be a valid time zone.");
        }

        return normalized.length() > 80 ? normalized.substring(0, 80) : normalized;
    }

    private Object firstPayloadValue(Map<String, Object> payload, String key, String... aliases) {
        if (payload.containsKey(key)) {
            return payload.get(key);
        }

        for (String alias : aliases) {
            if (payload.containsKey(alias)) {
                return payload.get(alias);
            }
        }

        return null;
    }

    private String dependencyType(Map<String, Object> payload) {
        var rawType = firstPayloadValue(payload, "dependencyType", "dependency_type");
        if (rawType == null || String.valueOf(rawType).trim().isBlank()) {
            return "finish_to_start";
        }

        var normalized = String.valueOf(rawType).trim().toLowerCase(Locale.ROOT).replace("-", "_");
        if (!ALLOWED_DEPENDENCY_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("dependencyType is not supported.");
        }

        return normalized;
    }

    private int dependencyLagDays(Map<String, Object> payload) {
        var value = optionalInteger(payload, "lagDays", "lag_days");
        if (value == null) {
            return 0;
        }

        if (value < 0 || value > 365) {
            throw new IllegalArgumentException("lagDays must be between 0 and 365.");
        }

        return value;
    }

    private DependencyTaskRef requireTaskDependencyRef(long companyId, long taskId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT id, project_id
                        FROM process_tasks
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                (rs, rowNum) -> new DependencyTaskRef(
                        rs.getLong("id"),
                        rs.getObject("project_id", Long.class)),
                companyId,
                taskId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found.");
        }

        return rows.getFirst();
    }

    private void validateSameProjectDependency(DependencyTaskRef successor, DependencyTaskRef predecessor) {
        if (successor.projectId() == null || predecessor.projectId() == null) {
            throw new IllegalArgumentException("Task dependencies are only supported inside a project.");
        }

        if (!successor.projectId().equals(predecessor.projectId())) {
            throw new IllegalArgumentException("Task dependencies must stay inside the same project.");
        }
    }

    private void validateNoDependencyCycle(long companyId, long successorTaskId, long predecessorTaskId) {
        var visited = new HashSet<Long>();
        var currentTaskId = predecessorTaskId;

        while (visited.add(currentTaskId)) {
            if (currentTaskId == successorTaskId) {
                throw new IllegalArgumentException("Task dependency creates a cycle.");
            }

            var nextRows = jdbcTemplate.query(
                    """
                            SELECT predecessor_task_id
                            FROM process_task_dependencies
                            WHERE company_id = ?
                              AND successor_task_id = ?
                              AND deleted_at IS NULL
                            ORDER BY id ASC
                            LIMIT 1
                            """,
                    (rs, rowNum) -> rs.getLong("predecessor_task_id"),
                    companyId,
                    currentTaskId);

            if (nextRows.isEmpty()) {
                return;
            }

            currentTaskId = nextRows.getFirst();
        }
    }

    private TaskMutationRecord requireTaskForMutation(long companyId, long taskId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT id,
                               assigned_user_company_id,
                               status,
                               started_at,
                               completed_at,
                               cancelled_at,
                               completed_by_user_id,
                               completed_by_user_company_id,
                               completion_notes,
                               start_date,
                               notes,
                               completion_percent,
                               weighting,
                               audited,
                               audit_notes,
                               audited_at,
                               audited_by_user_company_id
                        FROM process_tasks
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                (rs, rowNum) -> new TaskMutationRecord(
                        rs.getLong("id"),
                        rs.getObject("assigned_user_company_id", Long.class),
                        rs.getString("status"),
                        toLocalDateTime(rs.getTimestamp("started_at")),
                        toLocalDateTime(rs.getTimestamp("completed_at")),
                        toLocalDateTime(rs.getTimestamp("cancelled_at")),
                        rs.getObject("completed_by_user_id", Long.class),
                        rs.getObject("completed_by_user_company_id", Long.class),
                        rs.getString("completion_notes"),
                        rs.getDate("start_date") != null ? rs.getDate("start_date").toLocalDate() : null,
                        rs.getString("notes"),
                        rs.getObject("completion_percent", Integer.class),
                        rs.getObject("weighting", Integer.class),
                        rs.getBoolean("audited"),
                        rs.getString("audit_notes"),
                        toLocalDateTime(rs.getTimestamp("audited_at")),
                        rs.getObject("audited_by_user_company_id", Long.class)),
                companyId,
                taskId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found.");
        }

        return rows.getFirst();
    }

    private void requireTask(long companyId, long taskId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM process_tasks
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                Integer.class,
                companyId,
                taskId);

        if (count == null || count == 0) {
            throw new NoSuchElementException("Task not found.");
        }
    }

    private void requireTaskAccess(long companyId, long userId, long taskId) {
        assignmentScopeService.requireTaskAccess(companyId, userId, taskId);
    }

    private void validateReferences(long companyId, TaskCommand command) {
        if (command.processId() != null) {
            requireScopedRecord(
                    """
                            SELECT COUNT(*)
                            FROM processes
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """,
                    companyId,
                    command.processId(),
                    "Process not found.");
        }

        if (command.projectId() != null) {
            requireScopedRecord(
                    """
                            SELECT COUNT(*)
                            FROM projects
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """,
                    companyId,
                    command.projectId(),
                    "Project not found.");
        }

        if (command.businessId() != null) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM businesses
                            WHERE id = ?
                              AND (company_id = ? OR company_id IS NULL)
                            """,
                    Integer.class,
                    command.businessId(),
                    companyId);

            if (count == null || count == 0) {
                throw new NoSuchElementException("Business not found.");
            }
        }

        if (command.unitId() != null) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM units
                            WHERE id = ?
                              AND (company_id = ? OR company_id IS NULL)
                            """,
                    Integer.class,
                    command.unitId(),
                    companyId);

            if (count == null || count == 0) {
                throw new NoSuchElementException("Unit not found.");
            }
        }
    }

    private void requireScopedRecord(String sql, long companyId, long id, String message) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, companyId, id);
        if (count == null || count == 0) {
            throw new NoSuchElementException(message);
        }
    }

    private int completionPercentForCreate(TaskCommand command) {
        if (command.completionPercent() != null) {
            return command.completionPercent();
        }

        return "completed".equals(command.status()) ? 100 : 0;
    }

    private int completionPercentForUpdate(
            TaskMutationRecord existingTask,
            TaskCommand command,
            Map<String, Object> payload) {
        if (hasAnyNonNullKey(payload, "completionPercent", "completion")) {
            return command.completionPercent() != null ? command.completionPercent() : 0;
        }

        if ("completed".equals(command.status()) && !"completed".equals(existingTask.status())) {
            return 100;
        }

        return existingTask.completionPercent() != null ? existingTask.completionPercent() : 0;
    }

    private boolean auditedForUpdate(TaskMutationRecord existingTask, TaskCommand command, Map<String, Object> payload) {
        if (auditRequested(payload)) {
            return Boolean.TRUE.equals(command.audited());
        }

        return existingTask.audited();
    }

    private String auditNotesForUpdate(
            TaskMutationRecord existingTask,
            TaskCommand command,
            Map<String, Object> payload,
            boolean audited) {
        if (!audited) {
            return null;
        }

        return payload.containsKey("auditNotes") ? command.auditNotes() : existingTask.auditNotes();
    }

    private LocalDateTime auditedAtForUpdate(TaskMutationRecord existingTask, boolean audited, Map<String, Object> payload) {
        if (!audited) {
            return null;
        }

        if (!auditRequested(payload) && existingTask.auditedAt() != null) {
            return existingTask.auditedAt();
        }

        return existingTask.auditedAt() != null ? existingTask.auditedAt() : LocalDateTime.now();
    }

    private Long auditedByUserCompanyIdForUpdate(
            TaskMutationRecord existingTask,
            boolean audited,
            Long currentUserCompanyId,
            Map<String, Object> payload) {
        if (!audited) {
            return null;
        }

        if (!auditRequested(payload) && existingTask.auditedByUserCompanyId() != null) {
            return existingTask.auditedByUserCompanyId();
        }

        return existingTask.auditedByUserCompanyId() != null
                ? existingTask.auditedByUserCompanyId()
                : currentUserCompanyId;
    }

    private boolean auditRequested(Map<String, Object> payload) {
        return payload.containsKey("audited") || requestedStatus(payload, "audited");
    }

    private boolean requestedStatus(Map<String, Object> payload, String status) {
        var rawStatus = payload.get("status");
        return rawStatus != null && rawStatus.toString().trim().toLowerCase().replace('-', '_').equals(status);
    }

    private boolean hasAnyNonNullKey(Map<String, Object> payload, String... keys) {
        for (String key : keys) {
            if (payload.containsKey(key) && payload.get(key) != null) {
                return true;
            }
        }

        return false;
    }

    private TaskLifecycle lifecycleForCreate(String status, long userId, Long userCompanyId) {
        var now = LocalDateTime.now();

        return switch (status) {
            case "in_progress" -> new TaskLifecycle(now, null, null, null, null, null);
            case "completed" -> new TaskLifecycle(now, now, null, userId, userCompanyId, null);
            case "cancelled" -> new TaskLifecycle(null, null, now, null, null, null);
            default -> new TaskLifecycle(null, null, null, null, null, null);
        };
    }

    private TaskLifecycle lifecycleForStatus(
            TaskMutationRecord currentTask,
            String status,
            long userId,
            Long userCompanyId) {
        var now = LocalDateTime.now();
        LocalDateTime startedAt = currentTask.startedAt();
        LocalDateTime completedAt = currentTask.completedAt();
        LocalDateTime cancelledAt = currentTask.cancelledAt();
        Long completedByUserId = currentTask.completedByUserId();
        Long completedByUserCompanyId = currentTask.completedByUserCompanyId();
        String completionNotes = currentTask.completionNotes();

        switch (status) {
            case "pending":
            case "paused":
                completedAt = null;
                cancelledAt = null;
                completedByUserId = null;
                completedByUserCompanyId = null;
                completionNotes = null;
                break;
            case "in_progress":
                if (startedAt == null) {
                    startedAt = now;
                }
                completedAt = null;
                cancelledAt = null;
                completedByUserId = null;
                completedByUserCompanyId = null;
                completionNotes = null;
                break;
            case "completed":
                if (startedAt == null) {
                    startedAt = now;
                }
                if (completedAt == null) {
                    completedAt = now;
                }
                cancelledAt = null;
                completedByUserId = completedByUserId != null ? completedByUserId : userId;
                completedByUserCompanyId = completedByUserCompanyId != null ? completedByUserCompanyId : userCompanyId;
                break;
            case "cancelled":
                completedAt = null;
                cancelledAt = cancelledAt != null ? cancelledAt : now;
                completedByUserId = null;
                completedByUserCompanyId = null;
                completionNotes = null;
                break;
            default:
                break;
        }

        return new TaskLifecycle(
                startedAt,
                completedAt,
                cancelledAt,
                completedByUserId,
                completedByUserCompanyId,
                completionNotes);
    }

    private String nextTaskFolio(long companyId) {
        var currentYear = Year.now().getValue();
        Integer nextNumber = jdbcTemplate.queryForObject(
                """
                        SELECT COALESCE(MAX(CAST(SUBSTRING(folio, 8) AS UNSIGNED)), 0) + 1
                        FROM process_tasks
                        WHERE company_id = ?
                          AND folio LIKE ?
                          AND folio LIKE 'T-%'
                        """,
                Integer.class,
                companyId,
                "T-" + currentYear + "-%");

        int value = nextNumber != null ? nextNumber : 1;
        return "T-" + currentYear + "-" + String.format("%03d", value);
    }

    private java.util.List<Map<String, Object>> loadAttachments(long companyId, long taskId) {
        return jdbcTemplate.query(
                """
                        SELECT attachment.id,
                               attachment.original_filename,
                               attachment.mime_type,
                               attachment.size_bytes,
                               attachment.object_key,
                               attachment.uploaded_by_user_id,
                               COALESCE(
                                   NULLIF(TRIM(uploaded_user.full_name), ''),
                                   NULLIF(TRIM(uploaded_user.email), ''),
                                   NULL
                               ) AS resolved_uploaded_by_name,
                               attachment.created_at
                        FROM process_task_attachments attachment
                        LEFT JOIN users uploaded_user ON uploaded_user.id = attachment.uploaded_by_user_id
                        WHERE attachment.company_id = ?
                          AND attachment.task_id = ?
                          AND attachment.deleted_at IS NULL
                        ORDER BY attachment.id ASC
                        """,
                (rs, rowNum) -> mapAttachmentRow(rs),
                companyId,
                taskId);
    }

    private Map<String, Object> loadAttachment(long companyId, long taskId, long attachmentId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT attachment.id,
                               attachment.original_filename,
                               attachment.mime_type,
                               attachment.size_bytes,
                               attachment.object_key,
                               attachment.uploaded_by_user_id,
                               COALESCE(
                                   NULLIF(TRIM(uploaded_user.full_name), ''),
                                   NULLIF(TRIM(uploaded_user.email), ''),
                                   NULL
                               ) AS resolved_uploaded_by_name,
                               attachment.created_at
                        FROM process_task_attachments attachment
                        LEFT JOIN users uploaded_user ON uploaded_user.id = attachment.uploaded_by_user_id
                        WHERE attachment.company_id = ?
                          AND attachment.task_id = ?
                          AND attachment.id = ?
                          AND attachment.deleted_at IS NULL
                        """,
                (rs, rowNum) -> mapAttachmentRow(rs),
                companyId,
                taskId,
                attachmentId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attachment not found.");
        }

        return rows.getFirst();
    }

    private Map<String, Object> mapAttachmentRow(ResultSet rs) throws SQLException {
        var attachment = new LinkedHashMap<String, Object>();
        var objectKey = safe(rs.getString("object_key"));
        attachment.put("id", rs.getLong("id"));
        attachment.put("original_filename", safe(rs.getString("original_filename")));
        attachment.put("mime_type", safe(rs.getString("mime_type")));
        attachment.put("size_bytes", rs.getLong("size_bytes"));
        attachment.put("object_key", objectKey);
        attachment.put("uploaded_by_user_id", rs.getObject("uploaded_by_user_id", Long.class));
        attachment.put("uploaded_by_name", rs.getString("resolved_uploaded_by_name"));
        attachment.put("download_url", signedAttachmentUrl(objectKey));
        attachment.put("created_at", toDateTimeString(rs.getTimestamp("created_at")));
        return attachment;
    }

    private void validateAttachmentSize(Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }

        if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachments must be 10MB or smaller.");
        }
    }

    private String normalizeAttachmentContentType(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "application/pdf" -> "application/pdf";
            case "image/png" -> "image/png";
            case "image/jpeg", "image/jpg" -> "image/jpeg";
            case "image/gif" -> "image/gif";
            case "image/webp" -> "image/webp";
            case "image/heic" -> "image/heic";
            case "image/heif" -> "image/heif";
            case "application/msword" -> "application/msword";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ->
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "application/vnd.ms-excel" -> "application/vnd.ms-excel";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ->
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "text/csv" -> "text/csv";
            case "text/plain" -> "text/plain";
            default -> throw new IllegalArgumentException("Unsupported attachment type.");
        };
    }

    private String normalizeOriginalFileName(String value) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("file_name is required.");
        }

        return normalized.length() > 255 ? normalized.substring(0, 255) : normalized;
    }

    private String buildAttachmentObjectKey(long companyId, long taskId, String originalFileName, String contentType) {
        return "process-tasks/"
                + companyId
                + "/"
                + taskId
                + "/attachments/"
                + UUID.randomUUID().toString().replace("-", "")
                + "-"
                + sanitizeFileNameStem(originalFileName)
                + extensionForAttachmentContentType(contentType);
    }

    private String normalizeAttachmentObjectKey(long companyId, long taskId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("object_key is required.");
        }

        var normalized = objectKey.trim();
        var expectedPrefix = "process-tasks/" + companyId + "/" + taskId + "/attachments/";
        if (!normalized.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("object_key must match the expected task attachment upload prefix.");
        }

        return normalized;
    }

    private String extensionForAttachmentContentType(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "image/heic" -> ".heic";
            case "image/heif" -> ".heif";
            case "application/msword" -> ".doc";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            case "application/vnd.ms-excel" -> ".xls";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> ".xlsx";
            case "text/csv" -> ".csv";
            case "text/plain" -> ".txt";
            default -> ".bin";
        };
    }

    private String sanitizeFileNameStem(String originalFileName) {
        var dotIndex = originalFileName.lastIndexOf('.');
        var stem = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        var normalized = Normalizer.normalize(stem, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9_-]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "")
                .toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "attachment";
        }

        var bytes = normalized.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= 60) {
            return normalized;
        }

        return new String(bytes, 0, 60, StandardCharsets.UTF_8).replaceAll("-+$", "");
    }

    private String signedAttachmentUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }

        return objectStorageService.presignDownload(
                documentsBucket(),
                objectKey,
                objectStorageProperties.getMinio().getPresignExpirySeconds());
    }

    private void deleteAttachmentObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }

        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Attachment metadata deletion should not fail because the object is already missing.
        }
    }

    private String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }

    private String stringValue(Map<String, Object> payload, String key, String... aliases) {
        Object value = payload.get(key);

        if (value == null && !payload.containsKey(key)) {
            for (String alias : aliases) {
                if (payload.containsKey(alias)) {
                    value = payload.get(alias);
                    break;
                }
            }
        }

        return value == null ? "" : String.valueOf(value).trim();
    }

    private Long parseLong(Map<String, Object> payload, String key, String... aliases) {
        Object value = payload.get(key);
        String effectiveKey = key;

        if (value == null && !payload.containsKey(key)) {
            for (String alias : aliases) {
                if (payload.containsKey(alias)) {
                    value = payload.get(alias);
                    effectiveKey = alias;
                    break;
                }
            }
        }

        if (value == null) {
            return null;
        }

        if (value instanceof Number numberValue) {
            return numberValue.longValue();
        }

        var normalized = String.valueOf(value).trim();
        if (normalized.isBlank()) {
            return null;
        }

        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(effectiveKey + " must be a valid integer.");
        }
    }

    private Long numberValue(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        var normalized = String.valueOf(value).trim();
        if (normalized.isBlank()) {
            return null;
        }

        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private void publishTaskAssigned(
            long companyId,
            long actorUserId,
            Map<String, Object> task,
            String eventType,
            String label) {
        var recipientUserCompanyId = numberValue(task.get("assignedUserCompanyId"));
        var actorUserCompanyId = appNotificationService.userCompanyIdForUser(companyId, actorUserId);
        if (recipientUserCompanyId == null || recipientUserCompanyId.equals(actorUserCompanyId)) {
            return;
        }

        appNotificationService.publish(new AppNotificationEvent(
                companyId,
                recipientUserCompanyId,
                "processes_tasks",
                "task",
                numberValue(task.get("id")),
                eventType,
                "process-task:" + task.get("id") + ":" + eventType,
                "Task " + label + ": " + safeTaskFolio(task),
                safeTaskTitle(task),
                "/processes-tasks"));
    }

    private void publishTaskPendingAudit(long companyId, long actorUserId, Map<String, Object> task) {
        var creatorUserId = numberValue(task.get("createdBy"));
        var recipientUserCompanyId = appNotificationService.userCompanyIdForUser(companyId, creatorUserId);
        var actorUserCompanyId = appNotificationService.userCompanyIdForUser(companyId, actorUserId);
        if (recipientUserCompanyId == null || recipientUserCompanyId.equals(actorUserCompanyId)) {
            return;
        }

        appNotificationService.publish(new AppNotificationEvent(
                companyId,
                recipientUserCompanyId,
                "processes_tasks",
                "task",
                numberValue(task.get("id")),
                "task_pending_audit",
                "process-task:" + task.get("id") + ":pending-audit",
                "Task pending review: " + safeTaskFolio(task),
                safeTaskTitle(task),
                "/processes-tasks"));
    }

    private void publishTaskAudited(long companyId, long actorUserId, Map<String, Object> task) {
        var recipientUserCompanyId = numberValue(task.get("completedByUserCompanyId"));
        if (recipientUserCompanyId == null) {
            recipientUserCompanyId = numberValue(task.get("assignedUserCompanyId"));
        }
        var actorUserCompanyId = appNotificationService.userCompanyIdForUser(companyId, actorUserId);
        if (recipientUserCompanyId == null || recipientUserCompanyId.equals(actorUserCompanyId)) {
            return;
        }

        appNotificationService.publish(new AppNotificationEvent(
                companyId,
                recipientUserCompanyId,
                "processes_tasks",
                "task",
                numberValue(task.get("id")),
                "task_audited",
                "process-task:" + task.get("id") + ":audited",
                "Task reviewed: " + safeTaskFolio(task),
                safeTaskTitle(task),
                "/processes-tasks"));
    }

    private String safeTaskFolio(Map<String, Object> task) {
        var folio = task.get("folio");
        return folio == null || String.valueOf(folio).isBlank()
                ? "task " + task.get("id")
                : String.valueOf(folio);
    }

    private String safeTaskTitle(Map<String, Object> task) {
        var title = task.get("title");
        return title == null ? "" : String.valueOf(title);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private Map<String, Object> mapTaskDependencyRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("companyId", rs.getLong("company_id"));
        row.put("predecessorTaskId", rs.getLong("predecessor_task_id"));
        row.put("successorTaskId", rs.getLong("successor_task_id"));
        row.put("dependencyType", rs.getString("dependency_type"));
        row.put("lagDays", rs.getInt("lag_days"));
        row.put("predecessorTaskFolio", rs.getString("predecessor_task_folio"));
        row.put("predecessorTaskTitle", rs.getString("predecessor_task_title"));
        row.put("successorTaskFolio", rs.getString("successor_task_folio"));
        row.put("successorTaskTitle", rs.getString("successor_task_title"));
        row.put("createdBy", rs.getObject("created_by", Long.class));
        row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toDateTimeString(rs.getTimestamp("updated_at")));
        return row;
    }

    private Map<String, Object> mapTaskRow(ResultSet rs) throws SQLException {
        Long processId = rs.getObject("process_id", Long.class);
        Long projectId = rs.getObject("project_id", Long.class);
        int completionPercent = rs.getInt("completion_percent");
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("companyId", rs.getLong("company_id"));
        row.put("processId", processId);
        row.put("projectId", projectId);
        row.put("taskType", taskType(projectId, processId));
        row.put("type", taskType(projectId, processId));
        row.put("folio", rs.getString("folio"));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("assignedUserCompanyId", rs.getObject("assigned_user_company_id", Long.class));
        row.put("assignedUserId", rs.getObject("assigned_user_id", Long.class));
        row.put("assignedName", rs.getString("resolved_assigned_name"));
        row.put("responsible", rs.getString("resolved_assigned_name"));
        row.put("status", rs.getString("status"));
        row.put("priority", fallback(rs.getString("priority"), "medium"));
        row.put("startDate", toDateString(rs.getDate("start_date")));
        row.put("dueDate", toDateString(rs.getDate("due_date")));
        row.put("agendaDate", toDateString(rs.getDate("agenda_date")));
        row.put("agendaStartTime", toTimeString(rs.getTime("agenda_start_time")));
        row.put("agendaEndTime", toTimeString(rs.getTime("agenda_end_time")));
        row.put("agendaTimeZone", rs.getString("agenda_time_zone"));
        row.put("startedAt", toDateTimeString(rs.getTimestamp("started_at")));
        row.put("completedAt", toDateTimeString(rs.getTimestamp("completed_at")));
        row.put("cancelledAt", toDateTimeString(rs.getTimestamp("cancelled_at")));
        row.put("completedByUserCompanyId", rs.getObject("completed_by_user_company_id", Long.class));
        row.put("completedByUserId", rs.getObject("completed_by_user_id", Long.class));
        row.put("completedByName", rs.getString("resolved_completed_by_name"));
        row.put("closedByName", rs.getString("resolved_completed_by_name"));
        row.put("completionNotes", rs.getString("completion_notes"));
        row.put("notes", rs.getString("notes"));
        row.put("completionPercent", completionPercent);
        row.put("completion", completionPercent);
        row.put("weighting", rs.getObject("weighting", Integer.class));
        row.put("audited", rs.getBoolean("audited"));
        row.put("auditNotes", rs.getString("audit_notes"));
        row.put("auditedAt", toDateTimeString(rs.getTimestamp("audited_at")));
        row.put("auditedByUserCompanyId", rs.getObject("audited_by_user_company_id", Long.class));
        row.put("auditedByUserId", rs.getObject("audited_by_user_id", Long.class));
        row.put("auditedByName", rs.getString("resolved_audited_by_name"));
        row.put("auditStatus", auditStatus(rs.getString("status"), rs.getBoolean("audited")));
        row.put("businessId", rs.getObject("business_id", Long.class));
        row.put("businessName", rs.getString("business_name"));
        row.put("business", rs.getString("business_name"));
        row.put("unitId", rs.getObject("unit_id", Long.class));
        row.put("unitName", rs.getString("unit_name"));
        row.put("unit", rs.getString("unit_name"));
        row.put("createdBy", rs.getObject("created_by", Long.class));
        row.put("createdByName", rs.getString("resolved_created_by_name"));
        row.put("creator", rs.getString("resolved_created_by_name"));
        row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toDateTimeString(rs.getTimestamp("updated_at")));
        row.put("predecessorDependencyId", rs.getObject("predecessor_dependency_id", Long.class));
        row.put("predecessorTaskId", rs.getObject("predecessor_task_id", Long.class));
        row.put("predecessorTaskFolio", rs.getString("predecessor_task_folio"));
        row.put("predecessorTaskTitle", rs.getString("predecessor_task_title"));
        row.put("dependencyType", rs.getString("dependency_type"));
        row.put("dependencyLagDays", rs.getObject("dependency_lag_days", Integer.class));
        row.put("attachments", rs.getInt("attachments"));
        return row;
    }

    private String taskType(Long projectId, Long processId) {
        if (projectId != null) {
            return "project-task";
        }

        if (processId != null) {
            return "process";
        }

        return "task";
    }

    private String auditStatus(String status, boolean audited) {
        if (audited) {
            return "audited";
        }

        if ("completed".equals(status)) {
            return "pending";
        }

        return "not_ready";
    }

    private UserCompanyReference requireActiveUserCompany(long companyId, Long userCompanyId, String message) {
        if (userCompanyId == null) {
            return null;
        }

        var rows = jdbcTemplate.query(
                """
                        SELECT id, user_id
                        FROM user_companies
                        WHERE company_id = ?
                          AND id = ?
                          AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                        """,
                (rs, rowNum) -> new UserCompanyReference(
                        rs.getLong("id"),
                        rs.getLong("user_id")),
                companyId,
                userCompanyId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException(message);
        }

        return rows.getFirst();
    }

    private Long currentUserCompanyId(long companyId, long userId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT id
                        FROM user_companies
                        WHERE company_id = ?
                          AND user_id = ?
                          AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                        ORDER BY id DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getLong("id"),
                companyId,
                userId);

        if (rows.isEmpty()) {
            return null;
        }

        return rows.getFirst();
    }

    private record AttachmentRef(long id, String objectKey, String fileName) {
    }

    private record DependencyTaskRef(long id, Long projectId) {
    }
}
