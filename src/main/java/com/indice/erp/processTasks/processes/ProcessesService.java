package com.indice.erp.processTasks.processes;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import com.indice.erp.processTasks.tasks.domain.UserCompanyReference;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessesService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ProcessTasksService processTasksService;
    private static final String PROCESS_SELECT_COLUMNS = """
            SELECT proc.id,
                   proc.company_id,
                   proc.folio,
                   proc.unit_id,
                   COALESCE(unit.name, proc.unit_name) AS resolved_unit_name,
                   proc.business_id,
                   COALESCE(business.name, proc.business_name) AS resolved_business_name,
                   proc.title,
                   proc.description,
                   proc.task_title_template,
                   proc.task_description_template,
                   proc.task_notes_template,
                   proc.frequency,
                   proc.priority,
                   proc.creator_user_company_id,
                   COALESCE(creator_user_company.user_id, proc.creator_user_id) AS resolved_creator_user_id,
                   COALESCE(
                       NULLIF(TRIM(creator_user.full_name), ''),
                       NULLIF(TRIM(creator_user.email), ''),
                       NULLIF(proc.creator_name, ''),
                       NULL
                   ) AS resolved_creator_name,
                   proc.responsible_user_company_id,
                   responsible_user_company.user_id AS responsible_user_id,
                   COALESCE(
                       NULLIF(TRIM(responsible_user.full_name), ''),
                       NULLIF(TRIM(responsible_user.email), ''),
                       NULLIF(proc.responsible_name, ''),
                       NULL
                   ) AS resolved_responsible_name,
                   proc.recurrence_json,
                   proc.start_date,
                   proc.end_date,
                   proc.grace_days,
                   proc.generation_window_days,
                   proc.evidence_required,
                   proc.last_generated_for_date,
                   proc.next_occurrence_date,
                   proc.generated_until_date,
                   proc.last_materialized_at,
                   proc.is_active,
                   proc.created_at,
                   proc.updated_at,
                   COALESCE(task_summary.task_count, 0) AS task_count,
                   COALESCE(task_summary.open_task_count, 0) AS open_task_count,
                   COALESCE(task_summary.completed_task_count, 0) AS completed_task_count,
                   COALESCE(task_summary.overdue_task_count, 0) AS overdue_task_count,
                   COALESCE(task_summary.audited_task_count, 0) AS audited_task_count,
                   COALESCE(task_summary.completion_percent, 0) AS completion_percent
            FROM processes proc
            LEFT JOIN units unit ON unit.id = proc.unit_id
                AND (unit.company_id = proc.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = proc.business_id
                AND (business.company_id = proc.company_id OR business.company_id IS NULL)
            LEFT JOIN user_companies creator_user_company ON creator_user_company.id = proc.creator_user_company_id
                AND creator_user_company.company_id = proc.company_id
            LEFT JOIN users creator_user ON creator_user.id = COALESCE(creator_user_company.user_id, proc.creator_user_id)
            LEFT JOIN user_companies responsible_user_company ON responsible_user_company.id = proc.responsible_user_company_id
                AND responsible_user_company.company_id = proc.company_id
            LEFT JOIN users responsible_user ON responsible_user.id = responsible_user_company.user_id
            LEFT JOIN (
                SELECT process_id,
                       COUNT(*) AS task_count,
                       SUM(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE
                           WHEN due_date IS NOT NULL
                                AND due_date < CURRENT_DATE
                                AND status NOT IN ('completed', 'cancelled')
                           THEN 1 ELSE 0
                       END) AS overdue_task_count,
                       SUM(CASE WHEN audited = 1 THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(COALESCE(completion_percent, CASE WHEN status = 'completed' THEN 100 ELSE 0 END))) AS completion_percent
                FROM process_tasks
                WHERE company_id = ?
                  AND deleted_at IS NULL
                  AND process_id IS NOT NULL
                GROUP BY process_id
            ) task_summary ON task_summary.process_id = proc.id
            """;

    public ProcessesService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, ProcessTasksService processTasksService) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.processTasksService = processTasksService;
    }

    public Map<String, Object> listProcesses(long companyId) {
        var rows = jdbcTemplate.query(
                PROCESS_SELECT_COLUMNS +
                        """
                                WHERE proc.company_id = ?
                                  AND proc.deleted_at IS NULL
                                ORDER BY proc.id DESC
                                """,
                (rs, rowNum) -> mapProcessRow(rs),
                companyId,
                companyId);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createProcess(long companyId, long userId, String userName,
            Map<String, Object> payload) {
        var title = requiredString(payload, "title");
        var description = requiredString(payload, "description");
        var taskTitleTemplate = normalizedOrFallback(optionalString(payload, "taskTitleTemplate"), title);
        var taskDescriptionTemplate = normalizedOrFallback(optionalString(payload, "taskDescriptionTemplate"), description);
        var taskNotesTemplate = optionalString(payload, "taskNotesTemplate");
        var frequency = normalizedOrFallback(optionalString(payload, "frequency"), "weekly");
        var priority = normalizedOrFallback(optionalString(payload, "priority"), "medium");
        var relationCommand = resolveProcessRelations(companyId, userId, userName, payload);
        var isActive = booleanValue(payload, "isActive", true);
        var startDate = optionalDate(payload, "startDate", "start_date");
        var endDate = optionalDate(payload, "endDate", "end_date");
        var graceDays = boundedInteger(payload, "graceDays", 0, 0, 365);
        var generationWindowDays = boundedInteger(payload, "generationWindowDays", 45, 1, 365);
        var evidenceRequired = booleanValue(payload, "evidenceRequired", false);
        var folio = nextProcessFolio(companyId);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                            INSERT INTO processes
                            (company_id, folio, unit_name, unit_id, business_name, business_id, title, description,
                             task_title_template, task_description_template, task_notes_template,
                             frequency, priority, creator_user_id, creator_user_company_id, creator_name,
                             responsible_name, responsible_user_company_id, recurrence_json, start_date, end_date,
                             grace_days, generation_window_days, evidence_required, is_active)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    new String[] { "id" });

            statement.setLong(1, companyId);
            statement.setString(2, folio);
            setNullableString(statement, 3, relationCommand.unitName());
            setNullableLong(statement, 4, relationCommand.unitId());
            setNullableString(statement, 5, relationCommand.businessName());
            setNullableLong(statement, 6, relationCommand.businessId());
            statement.setString(7, title);
            statement.setString(8, description);
            setNullableString(statement, 9, taskTitleTemplate);
            setNullableString(statement, 10, taskDescriptionTemplate);
            setNullableString(statement, 11, taskNotesTemplate);
            statement.setString(12, frequency);
            statement.setString(13, priority);
            statement.setLong(14, userId);
            setNullableLong(statement, 15, relationCommand.creatorUserCompanyId());
            statement.setString(16, relationCommand.creatorName());
            setNullableString(statement, 17, relationCommand.responsibleName());
            setNullableLong(statement, 18, relationCommand.responsibleUserCompanyId());
            setJson(statement, 19, payload.get("recurrence"));
            setNullableDate(statement, 20, startDate);
            setNullableDate(statement, 21, endDate);
            statement.setInt(22, graceDays);
            statement.setInt(23, generationWindowDays);
            statement.setBoolean(24, evidenceRequired);
            statement.setBoolean(25, isActive);

            return statement;
        }, keyHolder);

        var processId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
        materializeProcess(companyId, processId);
        return getProcess(companyId, processId);
    }

    @Transactional
    public Map<String, Object> updateProcess(long companyId, long processId, Map<String, Object> payload) {
        requireProcess(companyId, processId);
        var title = requiredString(payload, "title");
        var description = requiredString(payload, "description");
        var taskTitleTemplate = normalizedOrFallback(optionalString(payload, "taskTitleTemplate"), title);
        var taskDescriptionTemplate = normalizedOrFallback(optionalString(payload, "taskDescriptionTemplate"), description);
        var taskNotesTemplate = optionalString(payload, "taskNotesTemplate");
        var frequency = normalizedOrFallback(optionalString(payload, "frequency"), "weekly");
        var priority = normalizedOrFallback(optionalString(payload, "priority"), "medium");
        var relationCommand = resolveProcessRelations(companyId, null, null, payload);
        var isActive = booleanValue(payload, "isActive", true);
        var startDate = optionalDate(payload, "startDate", "start_date");
        var endDate = optionalDate(payload, "endDate", "end_date");
        var graceDays = boundedInteger(payload, "graceDays", 0, 0, 365);
        var generationWindowDays = boundedInteger(payload, "generationWindowDays", 45, 1, 365);
        var evidenceRequired = booleanValue(payload, "evidenceRequired", false);

        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                            UPDATE processes
                            SET unit_name = ?,
                                unit_id = ?,
                                business_name = ?,
                                business_id = ?,
                                title = ?,
                                description = ?,
                                task_title_template = ?,
                                task_description_template = ?,
                                task_notes_template = ?,
                                frequency = ?,
                                priority = ?,
                                responsible_name = ?,
                                responsible_user_company_id = ?,
                                recurrence_json = ?,
                                start_date = ?,
                                end_date = ?,
                                grace_days = ?,
                                generation_window_days = ?,
                                evidence_required = ?,
                                is_active = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            setNullableString(statement, 1, relationCommand.unitName());
            setNullableLong(statement, 2, relationCommand.unitId());
            setNullableString(statement, 3, relationCommand.businessName());
            setNullableLong(statement, 4, relationCommand.businessId());
            statement.setString(5, title);
            statement.setString(6, description);
            setNullableString(statement, 7, taskTitleTemplate);
            setNullableString(statement, 8, taskDescriptionTemplate);
            setNullableString(statement, 9, taskNotesTemplate);
            statement.setString(10, frequency);
            statement.setString(11, priority);
            setNullableString(statement, 12, relationCommand.responsibleName());
            setNullableLong(statement, 13, relationCommand.responsibleUserCompanyId());
            setJson(statement, 14, payload.get("recurrence"));
            setNullableDate(statement, 15, startDate);
            setNullableDate(statement, 16, endDate);
            statement.setInt(17, graceDays);
            statement.setInt(18, generationWindowDays);
            statement.setBoolean(19, evidenceRequired);
            statement.setBoolean(20, isActive);
            statement.setLong(21, companyId);
            statement.setLong(22, processId);

            return statement;
        });

        materializeProcess(companyId, processId);
        return getProcess(companyId, processId);
    }

    @Transactional
    public void deleteProcess(long companyId, long processId) {
        requireProcess(companyId, processId);

        jdbcTemplate.update(
                """
                        UPDATE processes
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                processId);
    }

    public Map<String, Object> getProcess(long companyId, long processId) {
        var rows = jdbcTemplate.query(
                PROCESS_SELECT_COLUMNS +
                        """
                                WHERE proc.company_id = ?
                                  AND proc.id = ?
                                  AND proc.deleted_at IS NULL
                                """,
                (rs, rowNum) -> mapProcessRow(rs),
                companyId,
                companyId,
                processId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Process not found.");
        }

        return rows.getFirst();
    }

    private void requireProcess(long companyId, long processId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM processes
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                Integer.class,
                companyId,
                processId);

        if (count == null || count == 0) {
            throw new NoSuchElementException("Process not found.");
        }
    }

    private String nextProcessFolio(long companyId) {
        var currentYear = Year.now().getValue();
        Integer nextNumber = jdbcTemplate.queryForObject(
                """
                        SELECT COALESCE(MAX(CAST(SUBSTRING(folio, 9) AS UNSIGNED)), 0) + 1
                        FROM processes
                        WHERE company_id = ?
                          AND folio LIKE ?
                          AND folio LIKE 'PR-%'
                        """,
                Integer.class,
                companyId,
                "PR-" + currentYear + "-%");

        int value = nextNumber != null ? nextNumber : 1;
        return "PR-" + currentYear + "-" + String.format("%03d", value);
    }

    private Map<String, Object> mapProcessRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("companyId", rs.getLong("company_id"));
        row.put("folio", rs.getString("folio"));
        row.put("unitId", rs.getObject("unit_id", Long.class));
        row.put("unitName", normalizedOrFallback(rs.getString("resolved_unit_name"), ""));
        row.put("unit", normalizedOrFallback(rs.getString("resolved_unit_name"), ""));
        row.put("businessId", rs.getObject("business_id", Long.class));
        row.put("businessName", normalizedOrFallback(rs.getString("resolved_business_name"), ""));
        row.put("business", normalizedOrFallback(rs.getString("resolved_business_name"), ""));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("taskTitleTemplate", normalizedOrFallback(rs.getString("task_title_template"), rs.getString("title")));
        row.put("taskDescriptionTemplate", normalizedOrFallback(rs.getString("task_description_template"), rs.getString("description")));
        row.put("taskNotesTemplate", normalizedOrFallback(rs.getString("task_notes_template"), ""));
        row.put("frequency", rs.getString("frequency"));
        row.put("priority", rs.getString("priority"));
        row.put("creatorUserCompanyId", rs.getObject("creator_user_company_id", Long.class));
        row.put("creatorUserId", rs.getObject("resolved_creator_user_id", Long.class));
        row.put("creator", normalizedOrFallback(rs.getString("resolved_creator_name"), ""));
        row.put("responsibleUserCompanyId", rs.getObject("responsible_user_company_id", Long.class));
        row.put("responsibleUserId", rs.getObject("responsible_user_id", Long.class));
        row.put("responsible", normalizedOrFallback(rs.getString("resolved_responsible_name"), ""));
        row.put("recurrence", parseJson(rs.getString("recurrence_json")));
        row.put("startDate", dateString(rs.getDate("start_date")));
        row.put("endDate", dateString(rs.getDate("end_date")));
        row.put("graceDays", rs.getInt("grace_days"));
        row.put("generationWindowDays", rs.getInt("generation_window_days"));
        row.put("evidenceRequired", rs.getBoolean("evidence_required"));
        row.put("lastGeneratedForDate", dateString(rs.getDate("last_generated_for_date")));
        row.put("nextOccurrenceDate", dateString(rs.getDate("next_occurrence_date")));
        row.put("generatedUntilDate", dateString(rs.getDate("generated_until_date")));
        row.put("lastMaterializedAt",
                rs.getTimestamp("last_materialized_at") != null
                        ? rs.getTimestamp("last_materialized_at").toLocalDateTime().toString()
                        : null);
        row.put("isActive", rs.getBoolean("is_active"));
        row.put("createdAt",
                rs.getTimestamp("created_at") != null
                        ? rs.getTimestamp("created_at").toLocalDateTime().toLocalDate().toString()
                        : null);
        row.put("updatedAt",
                rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime().toString()
                        : null);
        var completionPercent = rs.getInt("completion_percent");
        row.put("taskCount", rs.getInt("task_count"));
        row.put("tasks", rs.getInt("task_count"));
        row.put("openTaskCount", rs.getInt("open_task_count"));
        row.put("openTasks", rs.getInt("open_task_count"));
        row.put("completedTaskCount", rs.getInt("completed_task_count"));
        row.put("completedTasks", rs.getInt("completed_task_count"));
        row.put("overdueTaskCount", rs.getInt("overdue_task_count"));
        row.put("overdueTasks", rs.getInt("overdue_task_count"));
        row.put("auditedTaskCount", rs.getInt("audited_task_count"));
        row.put("auditedTasks", rs.getInt("audited_task_count"));
        row.put("completionPercent", completionPercent);
        row.put("progress", completionPercent);
        return row;
    }

    private Object parseJson(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }

        try {
            return objectMapper.readValue(value, Object.class);
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    private void setNullableString(java.sql.PreparedStatement statement, int index, String value) throws SQLException {
        if (value == null || value.isBlank()) {
            statement.setNull(index, Types.VARCHAR);
            return;
        }

        statement.setString(index, value);
    }

    private void setNullableLong(java.sql.PreparedStatement statement, int index, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
            return;
        }

        statement.setLong(index, value);
    }

    private void setNullableDate(java.sql.PreparedStatement statement, int index, LocalDate value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.DATE);
            return;
        }

        statement.setDate(index, java.sql.Date.valueOf(value));
    }

    private String dateString(java.sql.Date value) {
        return value == null ? null : value.toLocalDate().toString();
    }

    private LocalDate toLocalDate(java.sql.Date value) {
        return value == null ? null : value.toLocalDate();
    }

    private void setJson(java.sql.PreparedStatement statement, int index, Object value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.VARCHAR);
            return;
        }

        try {
            statement.setString(index, objectMapper.writeValueAsString(value));
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Invalid recurrence payload.");
        }
    }

    private String requiredString(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            throw new IllegalArgumentException(key + " is required.");
        }
        return value.toString().trim();
    }

    private String optionalString(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value != null && !value.toString().trim().isEmpty()) {
                return value.toString().trim();
            }
        }

        return null;
    }

    private String normalizedOrFallback(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        return value.trim();
    }

    private boolean booleanValue(Map<String, Object> payload, String key, boolean fallback) {
        var value = payload.get(key);
        if (value == null) {
            return fallback;
        }

        if (value instanceof Boolean bool) {
            return bool;
        }

        return Boolean.parseBoolean(value.toString());
    }

    private LocalDate optionalDate(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null || value.toString().trim().isEmpty()) {
                continue;
            }

            try {
                return LocalDate.parse(value.toString().trim());
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(key + " must be a valid date.");
            }
        }

        return null;
    }

    private int boundedInteger(Map<String, Object> payload, String key, int fallback, int min, int max) {
        var value = payload.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            return fallback;
        }

        int parsedValue;
        if (value instanceof Number numberValue) {
            parsedValue = numberValue.intValue();
        } else {
            try {
                parsedValue = Integer.parseInt(value.toString().trim());
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(key + " must be a valid integer.");
            }
        }

        if (parsedValue < min || parsedValue > max) {
            throw new IllegalArgumentException(key + " must be between " + min + " and " + max + ".");
        }

        return parsedValue;
    }

    private ProcessRelationCommand resolveProcessRelations(
            long companyId,
            Long creatorUserId,
            String creatorName,
            Map<String, Object> payload) {
        Long explicitUnitId = optionalLong(payload, "unitId", "unit_id");
        Long explicitBusinessId = optionalLong(payload, "businessId", "business_id");
        var unitNameInput = optionalString(payload, "unit", "unit_name");
        var businessNameInput = optionalString(payload, "business", "business_name");
        var responsibleNameInput = optionalString(payload, "responsible", "responsible_name");

        Long unitId = explicitUnitId != null
                ? requireUnit(companyId, explicitUnitId)
                : resolveUnitId(companyId, unitNameInput);
        Long businessId = explicitBusinessId != null
                ? requireBusiness(companyId, explicitBusinessId, unitId)
                : resolveBusinessId(companyId, businessNameInput, unitId);

        if (unitId == null && businessId != null) {
            unitId = resolveBusinessUnitId(companyId, businessId);
        }

        if (businessId != null && unitId != null) {
            requireBusiness(companyId, businessId, unitId);
        }

        var responsibleUserCompanyId = optionalLong(payload, "responsibleUserCompanyId", "responsible_user_company_id");
        UserCompanyReference responsibleUserCompany = null;
        if (responsibleUserCompanyId != null) {
            responsibleUserCompany = requireActiveUserCompany(
                    companyId,
                    responsibleUserCompanyId,
                    "Responsible user not found.");
        } else if (responsibleNameInput != null) {
            responsibleUserCompany = findActiveUserCompanyByLabel(companyId, responsibleNameInput);
            responsibleUserCompanyId = responsibleUserCompany != null ? responsibleUserCompany.id() : null;
        }

        var creatorUserCompanyId = creatorUserId != null ? currentUserCompanyId(companyId, creatorUserId) : null;
        var resolvedCreatorName = normalizedOrFallback(creatorName, "System user");
        var resolvedResponsibleName = responsibleUserCompany != null
                ? userCompanyDisplayName(companyId, responsibleUserCompany.id(), responsibleNameInput)
                : responsibleNameInput;

        return new ProcessRelationCommand(
                unitId,
                unitId != null ? unitName(companyId, unitId, unitNameInput) : unitNameInput,
                businessId,
                businessId != null ? businessName(companyId, businessId, businessNameInput) : businessNameInput,
                creatorUserCompanyId,
                resolvedCreatorName,
                responsibleUserCompanyId,
                resolvedResponsibleName);
    }

    private Long optionalLong(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }

            if (value instanceof Number numberValue) {
                return numberValue.longValue();
            }

            var normalized = value.toString().trim();
            if (normalized.isEmpty()) {
                continue;
            }

            try {
                return Long.parseLong(normalized);
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(key + " must be a valid integer.");
            }
        }

        return null;
    }

    private Long resolveUnitId(long companyId, String unitName) {
        if (unitName == null || unitName.isBlank()) {
            return null;
        }

        var rows = jdbcTemplate.query(
                """
                        SELECT id
                        FROM units
                        WHERE (company_id = ? OR company_id IS NULL)
                          AND LOWER(TRIM(name)) = LOWER(TRIM(CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci))
                          AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                        ORDER BY CASE WHEN company_id = ? THEN 0 ELSE 1 END, id DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getLong("id"),
                companyId,
                unitName,
                companyId);

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Long requireUnit(long companyId, long unitId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM units
                        WHERE id = ?
                          AND (company_id = ? OR company_id IS NULL)
                          AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                        """,
                Integer.class,
                unitId,
                companyId);

        if (count == null || count == 0) {
            throw new NoSuchElementException("Unit not found.");
        }

        return unitId;
    }

    private Long resolveBusinessId(long companyId, String businessName, Long unitId) {
        if (businessName == null || businessName.isBlank()) {
            return null;
        }

        var rows = jdbcTemplate.query(
                """
                        SELECT id
                        FROM businesses
                        WHERE (company_id = ? OR company_id IS NULL)
                          AND LOWER(TRIM(name)) = LOWER(TRIM(CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci))
                          AND (? IS NULL OR unit_id = ? OR unit_id IS NULL)
                          AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                        ORDER BY CASE WHEN company_id = ? THEN 0 ELSE 1 END,
                                 CASE WHEN unit_id = ? THEN 0 ELSE 1 END,
                                 id DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getLong("id"),
                companyId,
                businessName,
                unitId,
                unitId,
                companyId,
                unitId);

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private Long requireBusiness(long companyId, long businessId, Long unitId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM businesses
                        WHERE id = ?
                          AND (company_id = ? OR company_id IS NULL)
                          AND (? IS NULL OR unit_id = ? OR unit_id IS NULL)
                          AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                        """,
                Integer.class,
                businessId,
                companyId,
                unitId,
                unitId);

        if (count == null || count == 0) {
            throw new NoSuchElementException("Business not found.");
        }

        return businessId;
    }

    private Long resolveBusinessUnitId(long companyId, long businessId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT unit_id
                        FROM businesses
                        WHERE id = ?
                          AND (company_id = ? OR company_id IS NULL)
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getObject("unit_id", Long.class),
                businessId,
                companyId);

        return rows.isEmpty() ? null : rows.getFirst();
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

    private UserCompanyReference findActiveUserCompanyByLabel(long companyId, String label) {
        if (label == null || label.isBlank()) {
            return null;
        }

        var rows = jdbcTemplate.query(
                """
                        SELECT user_company.id, user_company.user_id
                        FROM user_companies user_company
                        INNER JOIN users user_record ON user_record.id = user_company.user_id
                        WHERE user_company.company_id = ?
                          AND LOWER(COALESCE(user_company.status, 'active')) IN ('active', 'activo')
                          AND (
                              LOWER(TRIM(user_record.full_name)) = LOWER(TRIM(?))
                              OR LOWER(TRIM(user_record.email)) = LOWER(TRIM(?))
                          )
                        ORDER BY user_company.id DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> new UserCompanyReference(
                        rs.getLong("id"),
                        rs.getLong("user_id")),
                companyId,
                label,
                label);

        return rows.isEmpty() ? null : rows.getFirst();
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

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private String unitName(long companyId, long unitId, String fallback) {
        var rows = jdbcTemplate.query(
                """
                        SELECT name
                        FROM units
                        WHERE id = ?
                          AND (company_id = ? OR company_id IS NULL)
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getString("name"),
                unitId,
                companyId);

        return rows.isEmpty() ? fallback : rows.getFirst();
    }

    private String businessName(long companyId, long businessId, String fallback) {
        var rows = jdbcTemplate.query(
                """
                        SELECT name
                        FROM businesses
                        WHERE id = ?
                          AND (company_id = ? OR company_id IS NULL)
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getString("name"),
                businessId,
                companyId);

        return rows.isEmpty() ? fallback : rows.getFirst();
    }

    private String userCompanyDisplayName(long companyId, long userCompanyId, String fallback) {
        var rows = jdbcTemplate.query(
                """
                        SELECT COALESCE(
                            NULLIF(TRIM(user_record.full_name), ''),
                            NULLIF(TRIM(user_record.email), ''),
                            NULL
                        ) AS display_name
                        FROM user_companies user_company
                        INNER JOIN users user_record ON user_record.id = user_company.user_id
                        WHERE user_company.company_id = ?
                          AND user_company.id = ?
                        LIMIT 1
                        """,
                (rs, rowNum) -> rs.getString("display_name"),
                companyId,
                userCompanyId);

        return rows.isEmpty() ? fallback : normalizedOrFallback(rows.getFirst(), fallback);
    }

    @Scheduled(fixedDelayString = "${app.process-tasks.processes.materialization-delay-ms:900000}")
    @Transactional
    public void materializeDueProcesses() {
        var candidates = jdbcTemplate.query(
                """
                        SELECT id, company_id
                        FROM processes
                        WHERE deleted_at IS NULL
                          AND is_active = TRUE
                          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
                          AND (
                              generated_until_date IS NULL
                              OR generated_until_date < CURRENT_DATE
                              OR next_occurrence_date IS NULL
                              OR next_occurrence_date <= DATE_ADD(CURRENT_DATE, INTERVAL generation_window_days DAY)
                          )
                        ORDER BY company_id, id
                        """,
                (rs, rowNum) -> new ProcessMaterializationKey(
                        rs.getLong("company_id"),
                        rs.getLong("id")));

        for (var candidate : candidates) {
            materializeProcess(candidate.companyId(), candidate.processId());
        }
    }

    @Transactional
    public Map<String, Object> materializeProcess(long companyId, long processId) {
        var process = loadProcessForMaterialization(companyId, processId);
        materializeProcessTasks(process);
        return getProcess(companyId, processId);
    }

    private void materializeProcessTasks(ProcessMaterializationRecord process) {
        if (!process.isActive() || process.processId() <= 0) {
            updateProcessGenerationState(process, null, null, null);
            return;
        }

        var actorUserId = process.creatorUserId() != null ? process.creatorUserId() : resolveProcessCreatorUserId(process.companyId(), process.processId());
        var today = LocalDate.now();
        var rangeStart = process.startDate() != null && process.startDate().isAfter(today)
                ? process.startDate()
                : today;
        var rangeEnd = today.plusDays(process.generationWindowDays());
        if (process.endDate() != null && process.endDate().isBefore(rangeEnd)) {
            rangeEnd = process.endDate();
        }

        if (rangeEnd.isBefore(rangeStart)) {
            var nextOccurrence = nextOccurrenceDate(process, today);
            updateProcessGenerationState(process, null, nextOccurrence, rangeEnd);
            return;
        }

        var occurrenceDates = occurrenceDates(process.frequency(), process.recurrence(), rangeStart, rangeEnd);
        LocalDate lastGeneratedForDate = null;

        for (var occurrenceDate : occurrenceDates) {
            lastGeneratedForDate = occurrenceDate;
            if (hasMaterializedTask(process.companyId(), process.processId(), occurrenceDate)) {
                continue;
            }

            var taskPayload = new LinkedHashMap<String, Object>();
            taskPayload.put("processId", process.processId());
            taskPayload.put("title", normalizedOrFallback(process.taskTitleTemplate(), process.title()));
            taskPayload.put("description", normalizedOrFallback(process.taskDescriptionTemplate(), process.description()));
            taskPayload.put("assignedUserCompanyId", process.responsibleUserCompanyId());
            taskPayload.put("assignedName", process.responsible());
            taskPayload.put("status", "pending");
            taskPayload.put("priority", process.priority());
            taskPayload.put("startDate", occurrenceDate.toString());
            taskPayload.put("dueDate", occurrenceDate.plusDays(process.graceDays()).toString());
            taskPayload.put("notes", normalizedOrFallback(process.taskNotesTemplate(), "Generado por proceso recurrente."));
            taskPayload.put("completionPercent", 0);
            taskPayload.put("businessId", process.businessId());
            taskPayload.put("unitId", process.unitId());

            processTasksService.createTask(process.companyId(), actorUserId, taskPayload);
        }

        var nextOccurrence = nextOccurrenceDate(process, today);
        updateProcessGenerationState(process, lastGeneratedForDate, nextOccurrence, rangeEnd);
    }

    private long resolveProcessCreatorUserId(long companyId, long processId) {
        Long userId = jdbcTemplate.queryForObject(
                """
                        SELECT creator_user_id
                        FROM processes
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                Long.class,
                companyId,
                processId);

        return userId != null ? userId : 0L;
    }

    private ProcessMaterializationRecord loadProcessForMaterialization(long companyId, long processId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT id,
                               company_id,
                               title,
                               description,
                               task_title_template,
                               task_description_template,
                               task_notes_template,
                               frequency,
                               priority,
                               creator_user_id,
                               responsible_name,
                               responsible_user_company_id,
                               business_id,
                               unit_id,
                               recurrence_json,
                               start_date,
                               end_date,
                               grace_days,
                               generation_window_days,
                               is_active
                        FROM processes
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                (rs, rowNum) -> new ProcessMaterializationRecord(
                        rs.getLong("company_id"),
                        rs.getLong("id"),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("task_title_template"),
                        rs.getString("task_description_template"),
                        rs.getString("task_notes_template"),
                        rs.getString("frequency"),
                        rs.getString("priority"),
                        rs.getObject("creator_user_id", Long.class),
                        rs.getString("responsible_name"),
                        rs.getObject("responsible_user_company_id", Long.class),
                        rs.getObject("business_id", Long.class),
                        rs.getObject("unit_id", Long.class),
                        parseJson(rs.getString("recurrence_json")),
                        toLocalDate(rs.getDate("start_date")),
                        toLocalDate(rs.getDate("end_date")),
                        Math.max(0, rs.getInt("grace_days")),
                        Math.max(1, rs.getInt("generation_window_days")),
                        rs.getBoolean("is_active")),
                companyId,
                processId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Process not found.");
        }

        return rows.getFirst();
    }

    private void updateProcessGenerationState(
            ProcessMaterializationRecord process,
            LocalDate lastGeneratedForDate,
            LocalDate nextOccurrenceDate,
            LocalDate generatedUntilDate) {
        jdbcTemplate.update(
                """
                        UPDATE processes
                        SET last_generated_for_date = ?,
                            next_occurrence_date = ?,
                            generated_until_date = ?,
                            last_materialized_at = CURRENT_TIMESTAMP
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                """,
                lastGeneratedForDate == null ? null : java.sql.Date.valueOf(lastGeneratedForDate),
                nextOccurrenceDate == null ? null : java.sql.Date.valueOf(nextOccurrenceDate),
                generatedUntilDate == null ? null : java.sql.Date.valueOf(generatedUntilDate),
                process.companyId(),
                process.processId());
    }

    private LocalDate nextOccurrenceDate(ProcessMaterializationRecord process, LocalDate from) {
        var searchStart = process.startDate() != null && process.startDate().isAfter(from)
                ? process.startDate()
                : from;
        var searchEnd = searchStart.plusDays(Math.max(365, process.generationWindowDays()));
        if (process.endDate() != null && process.endDate().isBefore(searchEnd)) {
            searchEnd = process.endDate();
        }

        if (searchEnd.isBefore(searchStart)) {
            return null;
        }

        var dates = occurrenceDates(process.frequency(), process.recurrence(), searchStart, searchEnd);
        return dates.isEmpty() ? null : dates.getFirst();
    }

    private boolean hasMaterializedTask(long companyId, long processId, LocalDate occurrenceDate) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM process_tasks
                        WHERE company_id = ?
                          AND process_id = ?
                          AND (start_date = ? OR (start_date IS NULL AND due_date = ?))
                          AND deleted_at IS NULL
                        """,
                Integer.class,
                companyId,
                processId,
                occurrenceDate,
                occurrenceDate);

        return count != null && count > 0;
    }

    private List<LocalDate> occurrenceDates(
            String frequency,
            Object recurrencePayload,
            LocalDate from,
            LocalDate to) {
        var recurrence = recurrenceMap(recurrencePayload);
        var dates = new LinkedHashSet<LocalDate>();
        var normalizedFrequency = normalizedOrFallback(frequency, "weekly").toLowerCase();

        switch (normalizedFrequency) {
            case "daily" -> {
                for (var date = from; !date.isAfter(to); date = date.plusDays(1)) {
                    dates.add(date);
                }
            }
            case "weekly" -> addWeeklyDates(
                    dates,
                    from,
                    to,
                    dayOfWeek(stringValue(recurrence, "weeklyDay"), DayOfWeek.MONDAY));
            case "bi-weekly" -> addBiWeeklyDates(dates, from, to, recurrence);
            case "monthly" -> addMonthlyDates(dates, from, to, recurrence);
            case "specific-dates" -> addSpecificDates(dates, from, to, recurrence);
            default -> addWeeklyDates(dates, from, to, DayOfWeek.MONDAY);
        }

        return dates.stream().sorted(Comparator.naturalOrder()).toList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> recurrenceMap(Object recurrencePayload) {
        if (recurrencePayload instanceof Map<?, ?> map) {
            var normalized = new LinkedHashMap<String, Object>();
            map.forEach((key, value) -> {
                if (key != null) {
                    normalized.put(key.toString(), value);
                }
            });
            return normalized;
        }

        if (recurrencePayload instanceof String text && !text.isBlank()) {
            try {
                return objectMapper.readValue(text, LinkedHashMap.class);
            } catch (JsonProcessingException ex) {
                return Map.of();
            }
        }

        return Map.of();
    }

    private void addWeeklyDates(Set<LocalDate> dates, LocalDate from, LocalDate to, DayOfWeek dayOfWeek) {
        var date = from.with(TemporalAdjusters.nextOrSame(dayOfWeek));
        while (!date.isAfter(to)) {
            dates.add(date);
            date = date.plusWeeks(1);
        }
    }

    private void addBiWeeklyDates(
            Set<LocalDate> dates,
            LocalDate from,
            LocalDate to,
            Map<String, Object> recurrence) {
        var days = weekdayList(recurrence.get("biWeeklyDays"));
        if (days.isEmpty()) {
            days = List.of(dayOfWeek(stringValue(recurrence, "weeklyDay"), DayOfWeek.MONDAY));
        }

        var anchorDate = localDateValue(recurrence.get("biWeeklyAnchorDate"), from);
        var anchorWeekStart = anchorDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        for (var date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (!days.contains(date.getDayOfWeek())) {
                continue;
            }

            var dateWeekStart = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            var weeksFromAnchor = ChronoUnit.WEEKS.between(anchorWeekStart, dateWeekStart);
            if (weeksFromAnchor >= 0 && weeksFromAnchor % 2 == 0) {
                dates.add(date);
            }
        }
    }

    private void addMonthlyDates(
            Set<LocalDate> dates,
            LocalDate from,
            LocalDate to,
            Map<String, Object> recurrence) {
        var days = integerList(recurrence.get("monthlyDays"));
        if (days.isEmpty()) {
            days = List.of(1);
        }

        for (var day : days) {
            if (day < 1 || day > from.lengthOfMonth()) {
                continue;
            }

            var date = from.withDayOfMonth(day);
            if (!date.isBefore(from) && !date.isAfter(to)) {
                dates.add(date);
            }
        }
    }

    private void addSpecificDates(
            Set<LocalDate> dates,
            LocalDate from,
            LocalDate to,
            Map<String, Object> recurrence) {
        for (var date : localDateList(recurrence.get("specificDates"))) {
            if (!date.isBefore(from) && !date.isAfter(to)) {
                dates.add(date);
            }
        }
    }

    private List<DayOfWeek> weekdayList(Object value) {
        if (!(value instanceof Iterable<?> iterable)) {
            return List.of();
        }

        var days = new ArrayList<DayOfWeek>();
        for (var item : iterable) {
            var day = dayOfWeek(item != null ? item.toString() : null, null);
            if (day != null) {
                days.add(day);
            }
        }
        return days;
    }

    private List<Integer> integerList(Object value) {
        if (!(value instanceof Iterable<?> iterable)) {
            return List.of();
        }

        var values = new ArrayList<Integer>();
        for (var item : iterable) {
            if (item instanceof Number number) {
                values.add(number.intValue());
                continue;
            }

            if (item != null) {
                try {
                    values.add(Integer.parseInt(item.toString()));
                } catch (NumberFormatException ignored) {
                    // Ignore malformed recurrence entries and keep the rest.
                }
            }
        }
        return values;
    }

    private List<LocalDate> localDateList(Object value) {
        if (!(value instanceof Iterable<?> iterable)) {
            return List.of();
        }

        var values = new ArrayList<LocalDate>();
        for (var item : iterable) {
            var date = localDateValue(item, null);
            if (date != null) {
                values.add(date);
            }
        }
        return values;
    }

    private LocalDate localDateValue(Object value, LocalDate fallback) {
        if (value == null || value.toString().isBlank()) {
            return fallback;
        }

        try {
            return LocalDate.parse(value.toString());
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    private DayOfWeek dayOfWeek(String value, DayOfWeek fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        return switch (value.trim().toLowerCase()) {
            case "monday" -> DayOfWeek.MONDAY;
            case "tuesday" -> DayOfWeek.TUESDAY;
            case "wednesday" -> DayOfWeek.WEDNESDAY;
            case "thursday" -> DayOfWeek.THURSDAY;
            case "friday" -> DayOfWeek.FRIDAY;
            case "saturday" -> DayOfWeek.SATURDAY;
            case "sunday" -> DayOfWeek.SUNDAY;
            default -> fallback;
        };
    }

    private String stringValue(Map<String, Object> map, String key) {
        var value = map.get(key);
        return value != null ? value.toString() : null;
    }

    private record ProcessMaterializationKey(
            long companyId,
            long processId) {
    }

    private record ProcessMaterializationRecord(
            long companyId,
            long processId,
            String title,
            String description,
            String taskTitleTemplate,
            String taskDescriptionTemplate,
            String taskNotesTemplate,
            String frequency,
            String priority,
            Long creatorUserId,
            String responsible,
            Long responsibleUserCompanyId,
            Long businessId,
            Long unitId,
            Object recurrence,
            LocalDate startDate,
            LocalDate endDate,
            int graceDays,
            int generationWindowDays,
            boolean isActive) {
    }

    private record ProcessRelationCommand(
            Long unitId,
            String unitName,
            Long businessId,
            String businessName,
            Long creatorUserCompanyId,
            String creatorName,
            Long responsibleUserCompanyId,
            String responsibleName) {
    }
}
