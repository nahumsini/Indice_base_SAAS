package com.indice.erp.processTasks.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
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
    private final BCryptPasswordEncoder passwordEncoder;
    private final ConcurrentHashMap<String, PinFailureWindow> pinFailures = new ConcurrentHashMap<>();

    public ProcessTaskKioskService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        AttendanceKioskTokenService tokenService,
        ProcessTasksService processTasksService,
        BCryptPasswordEncoder passwordEncoder
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.tokenService = tokenService;
        this.processTasksService = processTasksService;
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
        body.put("tasks", listPublicTasks(kiosk, employee.userCompanyId()));
        return body;
    }

    public Map<String, Object> publicTasks(String deviceToken, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        return Map.of("items", listPublicTasks(context.kiosk(), context.employee().userCompanyId()));
    }

    @Transactional
    public Map<String, Object> publicCreateAttachmentUpload(String deviceToken, long taskId, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        getPublicTask(context.kiosk(), context.employee().userCompanyId(), taskId);
        return processTasksService.createAttachmentUpload(context.kiosk().companyId(), taskId, payload);
    }

    @Transactional
    public Map<String, Object> publicRegisterAttachment(String deviceToken, long taskId, Map<String, Object> payload) {
        var context = requirePublicContext(deviceToken, payload);
        getPublicTask(context.kiosk(), context.employee().userCompanyId(), taskId);
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
        var taskBeforeCompletion = getPublicTask(context.kiosk(), context.employee().userCompanyId(), taskId);
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
            "items", listPublicTasks(context.kiosk(), context.employee().userCompanyId())
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

    private List<Map<String, Object>> listPublicTasks(ProcessTaskKioskRow kiosk, long userCompanyId) {
        var params = new java.util.ArrayList<Object>();
        params.add(kiosk.companyId());
        params.add(userCompanyId);
        var scopeSql = appendTaskScopeSql(kiosk, params);
        return jdbcTemplate.query(
            publicTaskSql(scopeSql) + " ORDER BY COALESCE(task.due_date, CURRENT_DATE) ASC, task.id DESC",
            (rs, rowNum) -> mapPublicTask(rs),
            params.toArray()
        );
    }

    private Map<String, Object> getPublicTask(ProcessTaskKioskRow kiosk, long userCompanyId, long taskId) {
        var params = new java.util.ArrayList<Object>();
        params.add(kiosk.companyId());
        params.add(userCompanyId);
        params.add(taskId);
        var scopeSql = appendTaskScopeSql(kiosk, params);
        var rows = jdbcTemplate.query(
            publicTaskSql("AND task.id = ?\n" + scopeSql),
            (rs, rowNum) -> mapPublicTask(rs),
            params.toArray()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found for this kiosk.");
        }
        return rows.getFirst();
    }

    private String appendTaskScopeSql(ProcessTaskKioskRow kiosk, List<Object> params) {
        var sql = new StringBuilder();
        if (kiosk.unitId() != null) {
            sql.append(" AND (task.unit_id = ? OR task.unit_id IS NULL)\n");
            params.add(kiosk.unitId());
        }
        if (kiosk.businessId() != null) {
            sql.append(" AND (task.business_id = ? OR task.business_id IS NULL)\n");
            params.add(kiosk.businessId());
        }
        return sql.toString();
    }

    private String publicTaskSql(String extraWhere) {
        return """
            SELECT task.id,
                   task.folio,
                   task.title,
                   task.description,
                   task.status,
                   task.priority,
                   task.start_date,
                   task.due_date,
                   task.completion_percent,
                   task.notes,
                   task.unit_id,
                   unit.name AS unit_name,
                   task.business_id,
                   business.name AS business_name,
                   task.process_id,
                   process.title AS process_title,
                   task.project_id,
                   project.name AS project_name,
                   task.created_at,
                   (
                       SELECT COUNT(*)
                       FROM process_task_attachments attachment
                       WHERE attachment.company_id = task.company_id
                         AND attachment.task_id = task.id
                         AND attachment.deleted_at IS NULL
                   ) AS attachments
            FROM process_tasks task
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
              AND task.assigned_user_company_id = ?
              AND task.deleted_at IS NULL
              AND task.status IN ('pending', 'in_progress', 'paused')
            %s
            """.formatted(extraWhere);
    }

    private Map<String, Object> mapPublicTask(ResultSet rs) throws SQLException {
        var dueDate = rs.getDate("due_date") == null ? null : rs.getDate("due_date").toLocalDate();
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
        row.put("completion_percent", rs.getInt("completion_percent"));
        row.put("notes", rs.getString("notes"));
        row.put("unit_id", rs.getObject("unit_id", Long.class));
        row.put("unit_name", rs.getString("unit_name"));
        row.put("business_id", rs.getObject("business_id", Long.class));
        row.put("business_name", rs.getString("business_name"));
        row.put("process_id", rs.getObject("process_id", Long.class));
        row.put("process_title", rs.getString("process_title"));
        row.put("project_id", rs.getObject("project_id", Long.class));
        row.put("project_name", rs.getString("project_name"));
        row.put("created_at", toDateTimeString(rs, "created_at"));
        row.put("attachments", rs.getInt("attachments"));
        row.put("is_overdue", dueDate != null && dueDate.isBefore(LocalDate.now()));
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
        // Public task kiosks scope tasks, not employee access. The task queries and mutations below
        // still enforce kiosk unit/business plus assigned employee before exposing or changing work.
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
            return fallback(kiosk.unitName(), "Unit " + kiosk.unitId()) + " / all businesses";
        }
        return "All employees";
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

    private Long longValue(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
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
