package com.indice.erp.processTasks.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessTaskKioskService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_PIN_FAILURES = 5;
    private static final long PIN_FAILURE_WINDOW_SECONDS = 15 * 60;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final AttendanceKioskTokenService tokenService;
    private final ProcessTasksService processTasksService;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ConcurrentHashMap<String, PinFailureWindow> pinFailures = new ConcurrentHashMap<>();

    public ProcessTaskKioskService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        AttendanceKioskTokenService tokenService,
        ProcessTasksService processTasksService,
        ProcessTaskAssignmentScopeService assignmentScopeService,
        BCryptPasswordEncoder passwordEncoder
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.tokenService = tokenService;
        this.processTasksService = processTasksService;
        this.assignmentScopeService = assignmentScopeService;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> listKiosks(long companyId) {
        return Map.of("items", loadKiosks(companyId).stream().map(this::toKioskMap).toList());
    }

    @Transactional
    public Map<String, Object> saveKiosk(long companyId, long userId, Long kioskId, Map<String, Object> payload) {
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var name = stringValue(normalizedPayload, "name");
        var code = stringValue(normalizedPayload, "code");
        if (name.isBlank() || code.isBlank()) {
            throw new IllegalArgumentException("name and code are required.");
        }

        var status = normalizeStatus(stringValue(normalizedPayload, "status"));
        var unitId = normalizeOptionalId(longValue(normalizedPayload, "unit_id"));
        var businessId = normalizeOptionalId(longValue(normalizedPayload, "business_id"));
        validateScope(companyId, unitId, businessId);
        ensureUniqueCode(companyId, kioskId, code);

        var metadata = parseMetadata(normalizedPayload.get("metadata"));
        metadata.put("kiosk_type", metadata.getOrDefault("kiosk_type", "task_access"));
        var metadataJson = toJson(metadata);
        var publicAccessToken = generateUniquePublicAccessToken();

        if (kioskId != null && kioskId > 0) {
            var existing = getKiosk(companyId, kioskId);
            publicAccessToken = existing.publicAccessToken();
            jdbcTemplate.update(
                """
                    UPDATE process_task_kiosks
                    SET unit_id = ?,
                        business_id = ?,
                        code = ?,
                        name = ?,
                        status = ?,
                        metadata_json = ?
                    WHERE company_id = ?
                      AND id = ?
                    """,
                unitId,
                businessId,
                code,
                name,
                status,
                metadataJson,
                companyId,
                kioskId
            );
            return Map.of("kiosk", toKioskMap(getKiosk(companyId, kioskId)));
        }

        jdbcTemplate.update(
            """
                INSERT INTO process_task_kiosks (
                    company_id, unit_id, business_id, code, name, status,
                    public_access_token, metadata_json, created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            companyId,
            unitId,
            businessId,
            code,
            name,
            status,
            publicAccessToken,
            metadataJson,
            userId
        );
        var saved = getKioskByPublicAccessToken(publicAccessToken);
        return Map.of("kiosk", toKioskMap(saved));
    }

    @Transactional
    public Map<String, Object> rotatePublicAccessToken(long companyId, long kioskId) {
        getKiosk(companyId, kioskId);
        var publicAccessToken = generateUniquePublicAccessToken();
        jdbcTemplate.update(
            """
                UPDATE process_task_kiosks
                SET public_access_token = ?
                WHERE company_id = ?
                  AND id = ?
                """,
            publicAccessToken,
            companyId,
            kioskId
        );
        pinFailures.remove(publicAccessToken);
        return Map.of("kiosk", toKioskMap(getKiosk(companyId, kioskId)));
    }

    @Transactional
    public void deleteKiosk(long companyId, long kioskId) {
        getKiosk(companyId, kioskId);
        jdbcTemplate.update(
            """
                DELETE FROM process_task_kiosks
                WHERE company_id = ?
                  AND id = ?
                """,
            companyId,
            kioskId
        );
    }

    public Map<String, Object> publicBootstrap(String deviceToken) {
        var kiosk = getActiveKioskByPublicAccessToken(deviceToken);
        var body = new LinkedHashMap<String, Object>();
        body.put("kiosk", publicKioskMap(kiosk));
        body.put("scope_label", scopeLabel(kiosk));
        body.put("auth_methods", List.of("pin"));
        body.put("inactivity_timeout_seconds", 180);
        return body;
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public Map<String, Object> publicIdentify(String deviceToken, Map<String, Object> payload) {
        var kiosk = getActiveKioskByPublicAccessToken(deviceToken);
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var authMethod = normalizePublicAuthMethod(stringValue(normalizedPayload, "auth_method"));
        var credentialPayload = stringValue(normalizedPayload, "credential_payload", "credential", "pin");
        if (credentialPayload.isBlank()) {
            throw new IllegalArgumentException("credential_payload is required.");
        }

        ensurePinAttemptAllowed(deviceToken);
        var employee = resolveEmployeeByPin(kiosk.companyId(), credentialPayload);
        if (employee == null) {
            recordPinFailure(deviceToken);
            throw new IllegalArgumentException("Credential validation failed.");
        }
        clearPinFailures(deviceToken);

        validateEmployeeScope(kiosk, employee);
        var expiresAtEpochSeconds = tokenService.nextIdentificationExpiryEpochSeconds();
        var identificationToken = tokenService.createIdentificationToken(
            deviceToken,
            employee.userCompanyId(),
            authMethod,
            expiresAtEpochSeconds
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("auth_method", authMethod);
        body.put("user", toEmployeeMap(employee));
        body.put("identification_token", identificationToken);
        body.put("expires_at", Instant.ofEpochSecond(expiresAtEpochSeconds).toString());
        body.put("tasks", listPublicTasks(kiosk, employee));
        body.put("assignment_options", publicAssignmentOptions(kiosk.companyId(), employee.userId()));
        return body;
    }

    public Map<String, Object> publicTasks(String deviceToken, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        return Map.of("items", listPublicTasks(context.kiosk(), context.employee()));
    }

    @Transactional
    public Map<String, Object> publicCreateTask(String deviceToken, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        var taskPayload = publicCreateTaskPayload(context, payload == null ? Map.of() : payload);
        var createdTask = processTasksService.createTask(
            context.kiosk().companyId(),
            context.employee().userId(),
            taskPayload
        );
        var taskId = numberValue(createdTask.get("id"));
        var publicTask = taskId != null
            ? getVisiblePublicTask(context.kiosk(), context.employee(), taskId)
            : createdTask;
        return Map.of(
            "task", publicTask,
            "items", listPublicTasks(context.kiosk(), context.employee())
        );
    }

    @Transactional
    public Map<String, Object> publicAssignTaskResponsible(String deviceToken, long taskId, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var task = getVisiblePublicTask(context.kiosk(), context.employee(), taskId);
        var status = String.valueOf(task.getOrDefault("status", ""));
        if (!List.of("pending", "in_progress", "paused").contains(status)) {
            throw new IllegalArgumentException("Only open tasks can be reassigned from the kiosk.");
        }

        var assignedUserCompanyId = normalizeOptionalId(longValue(
            normalizedPayload,
            "assignedUserCompanyId",
            "assigned_user_company_id"
        ));
        if (assignedUserCompanyId == null) {
            throw new IllegalArgumentException("assignedUserCompanyId is required.");
        }

        var unitId = numberValue(task.get("unit_id"));
        var businessId = numberValue(task.get("business_id"));
        assignmentScopeService.requireCanAssign(
            context.kiosk().companyId(),
            context.employee().userId(),
            unitId,
            businessId,
            assignedUserCompanyId
        );
        var assignedEmployee = loadEmployee(context.kiosk().companyId(), assignedUserCompanyId);
        var assignedName = fallback(assignedEmployee.fullName(), "User " + assignedEmployee.userCompanyId());

        jdbcTemplate.update(
            """
                UPDATE process_tasks
                SET assigned_user_id = ?,
                    assigned_user_company_id = ?,
                    assigned_name = ?
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                  AND status IN ('pending', 'in_progress', 'paused')
                """,
            assignedEmployee.userId(),
            assignedEmployee.userCompanyId(),
            assignedName,
            context.kiosk().companyId(),
            taskId
        );

        var items = listPublicTasks(context.kiosk(), context.employee());
        var updatedTask = items.stream()
            .filter((item) -> Objects.equals(numberValue(item.get("id")), taskId))
            .findFirst()
            .orElseGet(() -> {
                var detachedTask = new LinkedHashMap<>(task);
                detachedTask.put("assigned_user_company_id", assignedEmployee.userCompanyId());
                detachedTask.put("assigned_name", assignedName);
                detachedTask.put(
                    "is_assigned_to_current_user",
                    Objects.equals(assignedEmployee.userCompanyId(), context.employee().userCompanyId())
                );
                detachedTask.put("can_complete", false);
                return detachedTask;
            });

        return Map.of(
            "task", updatedTask,
            "items", items
        );
    }

    @Transactional
    public Map<String, Object> publicCreateAttachmentUpload(String deviceToken, long taskId, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        getCompletablePublicTask(context.kiosk(), context.employee(), taskId);
        return processTasksService.createAttachmentUpload(context.kiosk().companyId(), taskId, payload);
    }

    @Transactional
    public Map<String, Object> publicRegisterAttachment(String deviceToken, long taskId, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        getCompletablePublicTask(context.kiosk(), context.employee(), taskId);
        return processTasksService.registerAttachment(
            context.kiosk().companyId(),
            context.employee().userId(),
            taskId,
            payload
        );
    }

    @Transactional
    public Map<String, Object> publicCompleteTask(String deviceToken, long taskId, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        var taskBeforeCompletion = getCompletablePublicTask(context.kiosk(), context.employee(), taskId);
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var completionNotes = stringValue(normalizedPayload, "completion_notes", "completionNotes", "notes");
        var completionPercent = integerValue(normalizedPayload, "completion_percent", "completionPercent", "completion");
        if (completionPercent == null) {
            completionPercent = 100;
        }
        completionPercent = Math.max(0, Math.min(100, completionPercent));

        jdbcTemplate.update(
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
                """,
            context.employee().userId(),
            context.employee().userCompanyId(),
            completionNotes.isBlank() ? null : completionNotes,
            completionPercent,
            context.kiosk().companyId(),
            taskId
        );

        var completedTask = new LinkedHashMap<>(taskBeforeCompletion);
        completedTask.put("status", "completed");
        completedTask.put("completion_percent", completionPercent);
        completedTask.put("completion_notes", completionNotes.isBlank() ? null : completionNotes);

        return Map.of(
            "task", completedTask,
            "items", listPublicTasks(context.kiosk(), context.employee())
        );
    }

    private PublicKioskContext requirePublicContext(String deviceToken, Map<String, Object> payload) {
        var kiosk = getActiveKioskByPublicAccessToken(deviceToken);
        var identificationToken = stringValue(payload == null ? Map.of() : payload, "identification_token");
        var claims = tokenService.verifyIdentificationToken(deviceToken, identificationToken);
        var employee = loadEmployee(kiosk.companyId(), claims.userCompanyId());
        validateEmployeeScope(kiosk, employee);
        return new PublicKioskContext(kiosk, employee);
    }

    private List<Map<String, Object>> listPublicTasks(ProcessTaskKioskRow kiosk, ProcessTaskKioskEmployee employee) {
        var params = new ArrayList<Object>();
        params.add(kiosk.companyId());
        params.add(employee.userCompanyId());
        params.add(employee.userId());
        params.add(employee.userCompanyId());
        return jdbcTemplate.query(
            publicTaskSql(
                "(task.assigned_user_company_id = ? OR task.created_by = ? OR task.completed_by_user_company_id = ?)",
                "AND task.status IN ('pending', 'in_progress', 'paused', 'completed')",
                ""
            ) + " ORDER BY CASE WHEN task.status = 'completed' THEN 1 ELSE 0 END, COALESCE(task.due_date, CURRENT_DATE) ASC, task.id DESC",
            (rs, rowNum) -> mapPublicTask(rs, employee),
            params.toArray()
        );
    }

    private Map<String, Object> getVisiblePublicTask(ProcessTaskKioskRow kiosk, ProcessTaskKioskEmployee employee, long taskId) {
        var params = new ArrayList<Object>();
        params.add(kiosk.companyId());
        params.add(employee.userCompanyId());
        params.add(employee.userId());
        params.add(employee.userCompanyId());
        params.add(taskId);
        var rows = jdbcTemplate.query(
            publicTaskSql(
                "(task.assigned_user_company_id = ? OR task.created_by = ? OR task.completed_by_user_company_id = ?)",
                "AND task.status IN ('pending', 'in_progress', 'paused', 'completed')",
                "AND task.id = ?\n"
            ),
            (rs, rowNum) -> mapPublicTask(rs, employee),
            params.toArray()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found for this kiosk.");
        }
        return rows.getFirst();
    }

    private Map<String, Object> getCompletablePublicTask(ProcessTaskKioskRow kiosk, ProcessTaskKioskEmployee employee, long taskId) {
        var params = new ArrayList<Object>();
        params.add(kiosk.companyId());
        params.add(employee.userCompanyId());
        params.add(taskId);
        var rows = jdbcTemplate.query(
            publicTaskSql(
                "task.assigned_user_company_id = ?",
                "AND task.status IN ('pending', 'in_progress', 'paused')",
                "AND task.id = ?\n"
            ),
            (rs, rowNum) -> mapPublicTask(rs, employee),
            params.toArray()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found for this kiosk.");
        }
        return rows.getFirst();
    }

    private String publicTaskSql(String visibilityCondition, String statusCondition, String extraWhere) {
        return """
            SELECT task.id,
                   task.folio,
                   task.title,
                   task.description,
                   task.status,
                   task.priority,
                   task.start_date,
                   task.due_date,
                   task.completed_at,
                   task.completion_percent,
                   task.notes,
                   task.assigned_user_company_id,
                   COALESCE(
                       NULLIF(task.assigned_name, ''),
                       NULLIF(TRIM(assigned_user.full_name), ''),
                       NULLIF(TRIM(assigned_user.email), ''),
                       NULL
                   ) AS assigned_name,
                   task.unit_id,
                   unit.name AS unit_name,
                   task.business_id,
                   business.name AS business_name,
                   task.process_id,
                   process.title AS process_title,
                   task.project_id,
                   project.name AS project_name,
                   task.created_by,
                   COALESCE(
                       NULLIF(TRIM(created_user.full_name), ''),
                       NULLIF(TRIM(created_user.email), ''),
                       NULL
                   ) AS created_by_name,
                   task.completed_by_user_company_id,
                   task.created_at,
                   (
                       SELECT COUNT(*)
                       FROM process_task_attachments attachment
                       WHERE attachment.company_id = task.company_id
                         AND attachment.task_id = task.id
                         AND attachment.deleted_at IS NULL
                   ) AS attachments
            FROM process_tasks task
            LEFT JOIN user_companies assigned_user_company ON assigned_user_company.id = task.assigned_user_company_id
                AND assigned_user_company.company_id = task.company_id
            LEFT JOIN users assigned_user ON assigned_user.id = assigned_user_company.user_id
            LEFT JOIN users created_user ON created_user.id = task.created_by
            LEFT JOIN units unit ON unit.id = task.unit_id
                AND (unit.company_id = task.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = task.business_id
                AND (business.company_id = task.company_id OR business.company_id IS NULL)
            LEFT JOIN processes process ON process.id = task.process_id
                AND process.company_id = task.company_id
                AND process.deleted_at IS NULL
            LEFT JOIN projects project ON project.id = task.project_id
                AND project.company_id = task.company_id
                AND project.deleted_at IS NULL
            WHERE task.company_id = ?
              AND %s
              AND task.deleted_at IS NULL
              %s
            %s
            """.formatted(visibilityCondition, statusCondition, extraWhere);
    }

    private Map<String, Object> mapPublicTask(ResultSet rs, ProcessTaskKioskEmployee employee) throws SQLException {
        var dueDate = rs.getDate("due_date") == null ? null : rs.getDate("due_date").toLocalDate();
        var assignedUserCompanyId = rs.getObject("assigned_user_company_id", Long.class);
        var createdBy = rs.getObject("created_by", Long.class);
        var completedByUserCompanyId = rs.getObject("completed_by_user_company_id", Long.class);
        var isAssignedToCurrentUser = Objects.equals(assignedUserCompanyId, employee.userCompanyId());
        var isCreatedByCurrentUser = Objects.equals(createdBy, employee.userId());
        var isCompletedByCurrentUser = Objects.equals(completedByUserCompanyId, employee.userCompanyId());
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("task_id", rs.getLong("id"));
        row.put("task_type", taskType(rs.getObject("project_id", Long.class), rs.getObject("process_id", Long.class)));
        row.put("folio", rs.getString("folio"));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("status", rs.getString("status"));
        row.put("priority", fallback(rs.getString("priority"), "medium"));
        row.put("start_date", toDateString(rs, "start_date"));
        row.put("due_date", dueDate == null ? null : dueDate.toString());
        row.put("completed_at", toDateTimeString(rs, "completed_at"));
        row.put("completion_percent", rs.getInt("completion_percent"));
        row.put("notes", rs.getString("notes"));
        row.put("assigned_user_company_id", assignedUserCompanyId);
        row.put("assigned_name", rs.getString("assigned_name"));
        row.put("unit_id", rs.getObject("unit_id", Long.class));
        row.put("unit_name", rs.getString("unit_name"));
        row.put("business_id", rs.getObject("business_id", Long.class));
        row.put("business_name", rs.getString("business_name"));
        row.put("process_id", rs.getObject("process_id", Long.class));
        row.put("process_title", rs.getString("process_title"));
        row.put("project_id", rs.getObject("project_id", Long.class));
        row.put("project_name", rs.getString("project_name"));
        row.put("created_by", createdBy);
        row.put("created_by_name", rs.getString("created_by_name"));
        row.put("completed_by_user_company_id", completedByUserCompanyId);
        row.put("created_at", toDateTimeString(rs, "created_at"));
        row.put("attachments", rs.getInt("attachments"));
        row.put("is_overdue", dueDate != null && dueDate.isBefore(LocalDate.now()));
        row.put("can_complete", isAssignedToCurrentUser && !"completed".equals(rs.getString("status")));
        row.put("is_assigned_to_current_user", isAssignedToCurrentUser);
        row.put("is_created_by_current_user", isCreatedByCurrentUser);
        row.put("is_completed_by_current_user", isCompletedByCurrentUser);
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

    private List<ProcessTaskKioskRow> loadKiosks(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT kiosk.id,
                       kiosk.company_id,
                       kiosk.unit_id,
                       unit.name AS unit_name,
                       kiosk.business_id,
                       business.name AS business_name,
                       kiosk.code,
                       kiosk.name,
                       COALESCE(LOWER(kiosk.status), 'active') AS status,
                       kiosk.public_access_token,
                       kiosk.metadata_json,
                       kiosk.created_at,
                       kiosk.updated_at
                FROM process_task_kiosks kiosk
                LEFT JOIN units unit ON unit.id = kiosk.unit_id
                LEFT JOIN businesses business ON business.id = kiosk.business_id
                WHERE kiosk.company_id = ?
                ORDER BY CASE LOWER(COALESCE(kiosk.status, 'active')) WHEN 'active' THEN 0 ELSE 1 END,
                         kiosk.name ASC
                """,
            (rs, rowNum) -> mapKiosk(rs),
            companyId
        );
    }

    private ProcessTaskKioskRow getKiosk(long companyId, long kioskId) {
        var rows = jdbcTemplate.query(
            """
                SELECT kiosk.id,
                       kiosk.company_id,
                       kiosk.unit_id,
                       unit.name AS unit_name,
                       kiosk.business_id,
                       business.name AS business_name,
                       kiosk.code,
                       kiosk.name,
                       COALESCE(LOWER(kiosk.status), 'active') AS status,
                       kiosk.public_access_token,
                       kiosk.metadata_json,
                       kiosk.created_at,
                       kiosk.updated_at
                FROM process_task_kiosks kiosk
                LEFT JOIN units unit ON unit.id = kiosk.unit_id
                LEFT JOIN businesses business ON business.id = kiosk.business_id
                WHERE kiosk.company_id = ?
                  AND kiosk.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapKiosk(rs),
            companyId,
            kioskId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task kiosk not found.");
        }
        return rows.getFirst();
    }

    private ProcessTaskKioskRow getKioskByPublicAccessToken(String publicAccessToken) {
        return loadKioskByPublicAccessToken(publicAccessToken, false);
    }

    private ProcessTaskKioskRow getActiveKioskByPublicAccessToken(String publicAccessToken) {
        return loadKioskByPublicAccessToken(publicAccessToken, true);
    }

    private ProcessTaskKioskRow loadKioskByPublicAccessToken(String publicAccessToken, boolean requireActive) {
        var normalizedToken = publicAccessToken == null ? "" : publicAccessToken.trim();
        if (normalizedToken.isBlank()) {
            throw new IllegalArgumentException("Task kiosk token is required.");
        }

        var rows = jdbcTemplate.query(
            """
                SELECT kiosk.id,
                       kiosk.company_id,
                       kiosk.unit_id,
                       unit.name AS unit_name,
                       kiosk.business_id,
                       business.name AS business_name,
                       kiosk.code,
                       kiosk.name,
                       COALESCE(LOWER(kiosk.status), 'active') AS status,
                       kiosk.public_access_token,
                       kiosk.metadata_json,
                       kiosk.created_at,
                       kiosk.updated_at
                FROM process_task_kiosks kiosk
                LEFT JOIN units unit ON unit.id = kiosk.unit_id
                LEFT JOIN businesses business ON business.id = kiosk.business_id
                WHERE kiosk.public_access_token = ?
                  AND (? = 0 OR COALESCE(LOWER(kiosk.status), 'active') = 'active')
                LIMIT 1
                """,
            (rs, rowNum) -> mapKiosk(rs),
            normalizedToken,
            requireActive ? 1 : 0
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task kiosk not found.");
        }
        return rows.getFirst();
    }

    private ProcessTaskKioskRow mapKiosk(ResultSet rs) throws SQLException {
        return new ProcessTaskKioskRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getObject("unit_id", Long.class),
            fallback(rs.getString("unit_name"), ""),
            rs.getObject("business_id", Long.class),
            fallback(rs.getString("business_name"), ""),
            fallback(rs.getString("code"), ""),
            fallback(rs.getString("name"), ""),
            fallback(rs.getString("status"), "active"),
            fallback(rs.getString("public_access_token"), ""),
            fallback(rs.getString("metadata_json"), ""),
            toDateTimeString(rs, "created_at"),
            toDateTimeString(rs, "updated_at")
        );
    }

    private Map<String, Object> toKioskMap(ProcessTaskKioskRow kiosk) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", kiosk.id());
        row.put("company_id", kiosk.companyId());
        row.put("unit_id", kiosk.unitId());
        row.put("unit_name", kiosk.unitName());
        row.put("business_id", kiosk.businessId());
        row.put("business_name", kiosk.businessName());
        row.put("code", kiosk.code());
        row.put("name", kiosk.name());
        row.put("status", kiosk.status());
        row.put("public_access_token", kiosk.publicAccessToken());
        row.put("metadata", parseMetadata(kiosk.metadataJson()));
        row.put("scope_label", scopeLabel(kiosk));
        row.put("created_at", kiosk.createdAt());
        row.put("updated_at", kiosk.updatedAt());
        return row;
    }

    private Map<String, Object> publicKioskMap(ProcessTaskKioskRow kiosk) {
        return Map.of(
            "id", kiosk.id(),
            "code", kiosk.code(),
            "name", kiosk.name(),
            "status", kiosk.status()
        );
    }

    private Map<String, Object> toEmployeeMap(ProcessTaskKioskEmployee employee) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", employee.userCompanyId());
        row.put("user_id", employee.userId());
        row.put("user_code", employee.userCode());
        row.put("full_name", employee.fullName());
        row.put("position_title", employee.positionTitle());
        row.put("department", employee.department());
        return row;
    }

    private ProcessTaskKioskEmployee resolveEmployeeByPin(long companyId, String pin) {
        var credentialRef = tokenService.pinCredentialReference(companyId, pin);
        var rows = jdbcTemplate.query(
            """
                SELECT p.user_company_id,
                       uc.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       m.credential_ref,
                       m.secret_hash
                FROM user_access_methods m
                JOIN user_access_profiles p ON p.id = m.access_profile_id
                JOIN hr_users e ON e.id = p.user_company_id
                JOIN user_companies uc ON uc.id = p.user_company_id
                WHERE m.company_id = ?
                  AND COALESCE(LOWER(m.status), 'active') = 'active'
                  AND COALESCE(LOWER(p.status), 'active') = 'active'
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                  AND m.method_type = 'pin'
                  AND (m.credential_ref = ? OR m.credential_ref IS NULL OR m.credential_ref = '')
                ORDER BY p.user_company_id ASC, m.priority ASC, m.id ASC
                """,
            (rs, rowNum) -> new PinCandidate(
                rs.getLong("user_company_id"),
                rs.getLong("user_id"),
                fallback(rs.getString("user_code"), ""),
                fallback(rs.getString("full_name"), ""),
                fallback(rs.getString("position_title"), ""),
                fallback(rs.getString("department"), ""),
                fallback(rs.getString("status"), "active"),
                fallback(rs.getString("credential_ref"), ""),
                fallback(rs.getString("secret_hash"), "")
            ),
            companyId,
            credentialRef
        );

        for (var candidate : rows) {
            if (!candidate.secretHash().isBlank() && passwordEncoder.matches(pin, candidate.secretHash())) {
                return new ProcessTaskKioskEmployee(
                    candidate.userCompanyId(),
                    candidate.userId(),
                    candidate.userCode(),
                    candidate.fullName(),
                    candidate.positionTitle(),
                    candidate.department(),
                    candidate.status()
                );
            }
        }
        return null;
    }

    private ProcessTaskKioskEmployee loadEmployee(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT e.id AS user_company_id,
                       uc.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status
                FROM hr_users e
                JOIN user_companies uc ON uc.id = e.id
                WHERE e.company_id = ?
                  AND e.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ProcessTaskKioskEmployee(
                rs.getLong("user_company_id"),
                rs.getLong("user_id"),
                fallback(rs.getString("user_code"), ""),
                fallback(rs.getString("full_name"), ""),
                fallback(rs.getString("position_title"), ""),
                fallback(rs.getString("department"), ""),
                fallback(rs.getString("status"), "active")
            ),
            companyId,
            userCompanyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user not found.");
        }
        var employee = rows.getFirst();
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("This user is terminated.");
        }
        return employee;
    }

    private void validateEmployeeScope(ProcessTaskKioskRow kiosk, ProcessTaskKioskEmployee employee) {
        // Public task kiosks are worker-driven: the PIN identifies the operator. The public list can
        // show assigned, created, and completed work, while completion/evidence mutations remain
        // restricted to tasks assigned to that operator.
    }

    private Map<String, Object> publicCreateTaskPayload(PublicKioskContext context, Map<String, Object> payload) {
        var actorScope = assignmentScopeService.actorScope(context.kiosk().companyId(), context.employee().userId());
        var unitId = normalizeOptionalId(longValue(payload, "unitId", "unit_id"));
        var businessId = normalizeOptionalId(longValue(payload, "businessId", "business_id"));
        var assignedUserCompanyId = normalizeOptionalId(longValue(
            payload,
            "assignedUserCompanyId",
            "assigned_user_company_id"
        ));
        var title = stringValue(payload, "title");
        if (title.isBlank()) {
            throw new IllegalArgumentException("title is required.");
        }

        if (unitId == null && actorScope.unitId() != null) {
            unitId = actorScope.unitId();
        }
        if (businessId == null && actorScope.businessId() != null) {
            businessId = actorScope.businessId();
        }
        if (assignedUserCompanyId == null) {
            assignedUserCompanyId = context.employee().userCompanyId();
        }

        var assignedName = stringValue(payload, "assignedName", "assigned_name");
        if (assignedName.isBlank() && Objects.equals(assignedUserCompanyId, context.employee().userCompanyId())) {
            assignedName = context.employee().fullName();
        }

        var dueDate = nullableString(payload, "dueDate", "due_date");
        if (dueDate == null || dueDate.isBlank()) {
            dueDate = LocalDate.now().toString();
        }

        var taskPayload = new LinkedHashMap<String, Object>();
        taskPayload.put("title", title);
        taskPayload.put("description", nullableString(payload, "description"));
        taskPayload.put("processId", null);
        taskPayload.put("projectId", null);
        taskPayload.put("assignedUserCompanyId", assignedUserCompanyId);
        taskPayload.put("assignedName", assignedName.isBlank() ? null : assignedName);
        taskPayload.put("status", "pending");
        taskPayload.put("priority", fallback(stringValue(payload, "priority"), "medium"));
        taskPayload.put("startDate", nullableString(payload, "startDate", "start_date"));
        taskPayload.put("dueDate", dueDate);
        taskPayload.put("notes", nullableString(payload, "notes"));
        taskPayload.put("completionPercent", 0);
        taskPayload.put("weighting", null);
        taskPayload.put("audited", false);
        taskPayload.put("auditNotes", null);
        taskPayload.put("businessId", businessId);
        taskPayload.put("unitId", unitId);
        return taskPayload;
    }

    private Map<String, Object> publicAssignmentOptions(long companyId, long userId) {
        var scope = assignmentScopeService.actorScope(companyId, userId);
        var body = new LinkedHashMap<String, Object>();
        body.put("default_unit_id", scope.unitId());
        body.put("default_business_id", scope.businessId());
        body.put("units", loadAssignableUnits(companyId, scope));
        body.put("businesses", loadAssignableBusinesses(companyId, scope));
        body.put("collaborators", loadAssignableCollaborators(companyId, scope));
        return body;
    }

    private List<Map<String, Object>> loadAssignableUnits(
        long companyId,
        ProcessTaskAssignmentScopeService.AssignmentScope scope
    ) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        var scopeWhere = "";

        if (scope.level() != ProcessTaskAssignmentScopeService.ScopeLevel.CORPORATE) {
            if (scope.unitId() == null) {
                return List.of();
            }
            scopeWhere = "AND unit.id = ?";
            params.add(scope.unitId());
        }

        return jdbcTemplate.query(
            """
                SELECT unit.id,
                       unit.name
                FROM units unit
                WHERE (unit.company_id = ? OR unit.company_id IS NULL)
                  %s
                ORDER BY unit.name ASC
                """.formatted(scopeWhere),
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", fallback(rs.getString("name"), "Unit " + rs.getLong("id")));
                return row;
            },
            params.toArray()
        );
    }

    private List<Map<String, Object>> loadAssignableBusinesses(
        long companyId,
        ProcessTaskAssignmentScopeService.AssignmentScope scope
    ) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        var scopeWhere = "";

        if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.UNIT) {
            if (scope.unitId() == null) {
                return List.of();
            }
            scopeWhere = "AND business.unit_id = ?";
            params.add(scope.unitId());
        } else if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.BUSINESS) {
            if (scope.businessId() == null) {
                return List.of();
            }
            scopeWhere = "AND business.id = ?";
            params.add(scope.businessId());
        }

        return jdbcTemplate.query(
            """
                SELECT business.id,
                       business.name,
                       business.unit_id,
                       unit.name AS unit_name
                FROM businesses business
                LEFT JOIN units unit ON unit.id = business.unit_id
                  AND (unit.company_id = business.company_id OR unit.company_id IS NULL)
                WHERE (business.company_id = ? OR business.company_id IS NULL)
                  %s
                ORDER BY unit.name ASC, business.name ASC
                """.formatted(scopeWhere),
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", fallback(rs.getString("name"), "Business " + rs.getLong("id")));
                row.put("unit_id", rs.getObject("unit_id", Long.class));
                row.put("unit_name", rs.getString("unit_name"));
                return row;
            },
            params.toArray()
        );
    }

    private List<Map<String, Object>> loadAssignableCollaborators(
        long companyId,
        ProcessTaskAssignmentScopeService.AssignmentScope scope
    ) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        var scopeWhere = "";

        if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.UNIT) {
            if (scope.unitId() == null) {
                return List.of();
            }
            scopeWhere = "AND (wp.unit_id = ? OR business.unit_id = ?)";
            params.add(scope.unitId());
            params.add(scope.unitId());
        } else if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.BUSINESS) {
            if (scope.businessId() == null) {
                return List.of();
            }
            scopeWhere = "AND wp.business_id = ?";
            params.add(scope.businessId());
        }

        return jdbcTemplate.query(
            """
                SELECT e.id AS user_company_id,
                       uc.user_id,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       wp.unit_id,
                       unit.name AS unit_name,
                       wp.business_id,
                       business.name AS business_name
                FROM hr_users e
                JOIN user_companies uc ON uc.id = e.id
                  AND uc.company_id = e.company_id
                LEFT JOIN user_work_profiles wp ON wp.company_id = e.company_id
                  AND wp.user_company_id = e.id
                LEFT JOIN units unit ON unit.id = wp.unit_id
                  AND (unit.company_id = e.company_id OR unit.company_id IS NULL)
                LEFT JOIN businesses business ON business.id = wp.business_id
                  AND (business.company_id = e.company_id OR business.company_id IS NULL)
                WHERE e.company_id = ?
                  AND LOWER(COALESCE(e.status, 'active')) IN ('active', 'activo')
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                  %s
                ORDER BY full_name ASC, e.id ASC
                """.formatted(scopeWhere),
            (rs, rowNum) -> {
                var fullName = fallback(rs.getString("full_name"), "User " + rs.getLong("user_company_id"));
                var row = new LinkedHashMap<String, Object>();
                row.put("user_company_id", rs.getLong("user_company_id"));
                row.put("user_id", rs.getLong("user_id"));
                row.put("full_name", fullName);
                row.put("position_title", rs.getString("position_title"));
                row.put("department", rs.getString("department"));
                row.put("unit_id", rs.getObject("unit_id", Long.class));
                row.put("unit_name", rs.getString("unit_name"));
                row.put("business_id", rs.getObject("business_id", Long.class));
                row.put("business_name", rs.getString("business_name"));
                return row;
            },
            params.toArray()
        );
    }

    private void validateScope(long companyId, Long unitId, Long businessId) {
        if (unitId != null) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM units WHERE id = ? AND (company_id = ? OR company_id IS NULL)",
                Integer.class,
                unitId,
                companyId
            );
            if (count == null || count == 0) {
                throw new IllegalArgumentException("Selected unit does not exist.");
            }
        }
        if (businessId != null) {
            var count = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*)
                    FROM businesses
                    WHERE id = ?
                      AND (company_id = ? OR company_id IS NULL)
                      AND (? IS NULL OR unit_id = ?)
                    """,
                Integer.class,
                businessId,
                companyId,
                unitId,
                unitId
            );
            if (count == null || count == 0) {
                throw new IllegalArgumentException("Selected business does not exist in this unit.");
            }
        }
    }

    private void ensureUniqueCode(long companyId, Long kioskId, String code) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM process_task_kiosks
                WHERE company_id = ?
                  AND code = ?
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            code,
            kioskId,
            kioskId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Task kiosk code must be unique.");
        }
    }

    private void ensurePinAttemptAllowed(String deviceToken) {
        var key = failureKey(deviceToken);
        var now = Instant.now().getEpochSecond();
        var window = pinFailures.get(key);
        if (window == null || now - window.firstFailureEpochSeconds() > PIN_FAILURE_WINDOW_SECONDS) {
            return;
        }
        if (window.count() >= MAX_PIN_FAILURES) {
            throw new IllegalArgumentException("Too many failed PIN attempts. Try again later.");
        }
    }

    private void recordPinFailure(String deviceToken) {
        var key = failureKey(deviceToken);
        var now = Instant.now().getEpochSecond();
        pinFailures.compute(key, (ignored, current) -> {
            if (current == null || now - current.firstFailureEpochSeconds() > PIN_FAILURE_WINDOW_SECONDS) {
                return new PinFailureWindow(now, 1);
            }
            return new PinFailureWindow(current.firstFailureEpochSeconds(), current.count() + 1);
        });
    }

    private void clearPinFailures(String deviceToken) {
        pinFailures.remove(failureKey(deviceToken));
    }

    private String failureKey(String deviceToken) {
        return deviceToken == null ? "" : deviceToken.trim();
    }

    private String generateUniquePublicAccessToken() {
        while (true) {
            var nextToken = UUID.randomUUID().toString().replace("-", "")
                + Long.toHexString(Math.abs(SECURE_RANDOM.nextLong()));
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM process_task_kiosks WHERE public_access_token = ?",
                Integer.class,
                nextToken
            );
            if (count == null || count == 0) {
                return nextToken;
            }
        }
    }

    private Map<String, Object> parseMetadata(Object value) {
        if (value == null) {
            return new LinkedHashMap<>();
        }
        if (value instanceof Map<?, ?> map) {
            var result = new LinkedHashMap<String, Object>();
            map.forEach((key, mapValue) -> {
                if (key != null) {
                    result.put(String.valueOf(key), mapValue);
                }
            });
            return result;
        }
        return parseMetadata(String.valueOf(value));
    }

    private Map<String, Object> parseMetadata(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(metadataJson, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (Exception ignored) {
            return new LinkedHashMap<>();
        }
    }

    private String toJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception ex) {
            throw new IllegalArgumentException("metadata must be valid JSON.");
        }
    }

    private String scopeLabel(ProcessTaskKioskRow kiosk) {
        if (kiosk.businessId() != null) {
            return fallback(kiosk.businessName(), "Business " + kiosk.businessId());
        }
        if (kiosk.unitId() != null) {
            return fallback(kiosk.unitName(), "Unit " + kiosk.unitId());
        }
        return "Assigned tasks";
    }

    private String normalizeStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "active", "activo" -> "active";
            case "inactive", "inactivo", "disabled" -> "inactive";
            default -> throw new IllegalArgumentException("Unsupported status.");
        };
    }

    private String normalizePublicAuthMethod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "pin" -> "pin";
            default -> throw new IllegalArgumentException("Public kiosk auth_method must be pin.");
        };
    }

    private Long normalizeOptionalId(Long value) {
        return value == null || value <= 0 ? null : value;
    }

    private Long longValue(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return null;
        }
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Number number) {
                return number.longValue();
            }
            var text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return Long.parseLong(text);
            }
        }
        return null;
    }

    private Long numberValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value == null) {
            return null;
        }
        var text = String.valueOf(value).trim();
        if (text.isBlank()) {
            return null;
        }
        return Long.parseLong(text);
    }

    private Integer integerValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Number number) {
                return number.intValue();
            }
            var text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return Integer.parseInt(text);
            }
        }
        return null;
    }

    private String stringValue(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return "";
        }
        for (var key : keys) {
            var value = payload.get(key);
            if (value != null) {
                return String.valueOf(value).trim();
            }
        }
        return "";
    }

    private String nullableString(Map<String, Object> payload, String... keys) {
        var value = stringValue(payload, keys);
        return value.isBlank() ? null : value;
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private Long zeroToNull(Long value) {
        return value == null || value == 0 ? null : value;
    }

    private String toDateString(ResultSet rs, String column) throws SQLException {
        var date = rs.getDate(column);
        return date == null ? null : date.toLocalDate().toString();
    }

    private String toDateTimeString(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toLocalDateTime().toString();
    }

    private record ProcessTaskKioskRow(
        long id,
        long companyId,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String code,
        String name,
        String status,
        String publicAccessToken,
        String metadataJson,
        String createdAt,
        String updatedAt
    ) {
    }

    private record ProcessTaskKioskEmployee(
        long userCompanyId,
        long userId,
        String userCode,
        String fullName,
        String positionTitle,
        String department,
        String status
    ) {
    }

    private record PinCandidate(
        long userCompanyId,
        long userId,
        String userCode,
        String fullName,
        String positionTitle,
        String department,
        String status,
        String credentialRef,
        String secretHash
    ) {
    }

    private record PublicKioskContext(ProcessTaskKioskRow kiosk, ProcessTaskKioskEmployee employee) {
    }

    private record PinFailureWindow(long firstFailureEpochSeconds, int count) {
    }
}
