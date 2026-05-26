package com.indice.erp.processTasks.projects;

import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.Year;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectsService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("active", "paused", "completed", "cancelled");
    private static final Set<String> ALLOWED_PRIORITIES = Set.of("low", "medium", "high");

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTasksService processTasksService;

    public ProjectsService(JdbcTemplate jdbcTemplate, ProcessTasksService processTasksService) {
        this.jdbcTemplate = jdbcTemplate;
        this.processTasksService = processTasksService;
    }

    public Map<String, Object> listProjects(long companyId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT project.id, project.company_id, project.folio, project.name, project.description,
                               project.status, project.priority, project.owner_user_company_id,
                               owner_user_company.user_id AS owner_user_id,
                               project.owner_name, project.business_id, business.name AS business_name,
                               project.unit_id, unit.name AS unit_name, project.start_date, project.due_date,
                               project.completed_at, project.cancelled_at, project.created_by, project.created_at, project.updated_at,
                               COALESCE(task_summary.task_count, 0) AS task_count,
                               COALESCE(task_summary.open_task_count, 0) AS open_task_count,
                               COALESCE(task_summary.completed_task_count, 0) AS completed_task_count,
                               COALESCE(task_summary.overdue_task_count, 0) AS overdue_task_count,
                               COALESCE(task_summary.audited_task_count, 0) AS audited_task_count,
                               COALESCE(task_summary.completion_percent,
                                   CASE WHEN project.status = 'completed' THEN 100 ELSE 0 END
                               ) AS completion_percent
                        FROM projects project
                        LEFT JOIN user_companies owner_user_company ON owner_user_company.id = project.owner_user_company_id
                            AND owner_user_company.company_id = project.company_id
                        LEFT JOIN businesses business ON business.id = project.business_id
                            AND (business.company_id = project.company_id OR business.company_id IS NULL)
                        LEFT JOIN units unit ON unit.id = project.unit_id
                            AND (unit.company_id = project.company_id OR unit.company_id IS NULL)
                        LEFT JOIN (
                            SELECT project_id,
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
                              AND project_id IS NOT NULL
                            GROUP BY project_id
                        ) task_summary ON task_summary.project_id = project.id
                        WHERE project.company_id = ?
                          AND project.deleted_at IS NULL
                        ORDER BY project.id DESC
                        """,
                (rs, rowNum) -> mapProjectRow(rs),
                companyId,
                companyId);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createProject(long companyId, long userId, Map<String, Object> payload) {
        var command = parseProjectCommand(payload);
        var ownerUserCompany = requireActiveUserCompany(
                companyId,
                command.ownerUserCompanyId(),
                "Owner user not found.");
        var folio = nextProjectFolio(companyId);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            INSERT INTO projects
                            (company_id, folio, name, description, status, priority, owner_user_id, owner_user_company_id,
                             owner_name, business_id, unit_id, start_date, due_date, completed_at, cancelled_at, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    new String[] { "id" });

            statement.setLong(1, companyId);
            statement.setString(2, folio);
            statement.setString(3, command.name());
            setNullableString(statement, 4, command.description());
            statement.setString(5, command.status());
            setNullableString(statement, 6, command.priority());
            setNullableLong(statement, 7, ownerUserCompany != null ? ownerUserCompany.userId() : null);
            setNullableLong(statement, 8, ownerUserCompany != null ? ownerUserCompany.id() : null);
            setNullableString(statement, 9, command.ownerName());
            setNullableLong(statement, 10, command.businessId());
            setNullableLong(statement, 11, command.unitId());
            setNullableDate(statement, 12, command.startDate());
            setNullableDate(statement, 13, command.dueDate());
            statement.setTimestamp(14, "completed".equals(command.status()) ? new Timestamp(System.currentTimeMillis()) : null);
            statement.setTimestamp(15, "cancelled".equals(command.status()) ? new Timestamp(System.currentTimeMillis()) : null);
            statement.setLong(16, userId);
            return statement;
        }, keyHolder);

        var projectId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
        return getProject(companyId, projectId);
    }

    @Transactional
    public Map<String, Object> updateProject(long companyId, long projectId, Map<String, Object> payload) {
        requireProject(companyId, projectId);
        var command = parseProjectCommand(payload);
        var ownerUserCompany = requireActiveUserCompany(
                companyId,
                command.ownerUserCompanyId(),
                "Owner user not found.");

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            UPDATE projects
                            SET name = ?,
                                description = ?,
                                status = ?,
                                priority = ?,
                                owner_user_id = ?,
                                owner_user_company_id = ?,
                                owner_name = ?,
                                business_id = ?,
                                unit_id = ?,
                                start_date = ?,
                                due_date = ?,
                                completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
                                cancelled_at = CASE WHEN ? = 'cancelled' THEN COALESCE(cancelled_at, CURRENT_TIMESTAMP) ELSE NULL END
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            statement.setString(1, command.name());
            setNullableString(statement, 2, command.description());
            statement.setString(3, command.status());
            setNullableString(statement, 4, command.priority());
            setNullableLong(statement, 5, ownerUserCompany != null ? ownerUserCompany.userId() : null);
            setNullableLong(statement, 6, ownerUserCompany != null ? ownerUserCompany.id() : null);
            setNullableString(statement, 7, command.ownerName());
            setNullableLong(statement, 8, command.businessId());
            setNullableLong(statement, 9, command.unitId());
            setNullableDate(statement, 10, command.startDate());
            setNullableDate(statement, 11, command.dueDate());
            statement.setString(12, command.status());
            statement.setString(13, command.status());
            statement.setLong(14, companyId);
            statement.setLong(15, projectId);
            return statement;
        });

        return getProject(companyId, projectId);
    }

    @Transactional
    public void deleteProject(long companyId, long projectId) {
        requireProject(companyId, projectId);
        jdbcTemplate.update(
                """
                        UPDATE projects
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                projectId);
    }

    @Transactional
    public Map<String, Object> completeProject(long companyId, long projectId) {
        requireProject(companyId, projectId);
        jdbcTemplate.update(
                """
                        UPDATE projects
                        SET status = 'completed',
                            completed_at = CURRENT_TIMESTAMP,
                            cancelled_at = NULL
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                projectId);
        return getProject(companyId, projectId);
    }

    @Transactional
    public Map<String, Object> cancelProject(long companyId, long projectId) {
        requireProject(companyId, projectId);
        jdbcTemplate.update(
                """
                        UPDATE projects
                        SET status = 'cancelled',
                            cancelled_at = CURRENT_TIMESTAMP,
                            completed_at = NULL
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                projectId);
        return getProject(companyId, projectId);
    }

    public Map<String, Object> listProjectTasks(long companyId, long userId, long projectId) {
        requireProject(companyId, projectId);
        return processTasksService.listTasksForProject(companyId, userId, projectId);
    }

    public Map<String, Object> getProject(long companyId, long projectId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT project.id, project.company_id, project.folio, project.name, project.description,
                               project.status, project.priority, project.owner_user_company_id,
                               owner_user_company.user_id AS owner_user_id,
                               project.owner_name, project.business_id, business.name AS business_name,
                               project.unit_id, unit.name AS unit_name, project.start_date, project.due_date,
                               project.completed_at, project.cancelled_at, project.created_by, project.created_at, project.updated_at,
                               COALESCE(task_summary.task_count, 0) AS task_count,
                               COALESCE(task_summary.open_task_count, 0) AS open_task_count,
                               COALESCE(task_summary.completed_task_count, 0) AS completed_task_count,
                               COALESCE(task_summary.overdue_task_count, 0) AS overdue_task_count,
                               COALESCE(task_summary.audited_task_count, 0) AS audited_task_count,
                               COALESCE(task_summary.completion_percent,
                                   CASE WHEN project.status = 'completed' THEN 100 ELSE 0 END
                               ) AS completion_percent
                        FROM projects project
                        LEFT JOIN user_companies owner_user_company ON owner_user_company.id = project.owner_user_company_id
                            AND owner_user_company.company_id = project.company_id
                        LEFT JOIN businesses business ON business.id = project.business_id
                            AND (business.company_id = project.company_id OR business.company_id IS NULL)
                        LEFT JOIN units unit ON unit.id = project.unit_id
                            AND (unit.company_id = project.company_id OR unit.company_id IS NULL)
                        LEFT JOIN (
                            SELECT project_id,
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
                              AND project_id IS NOT NULL
                            GROUP BY project_id
                        ) task_summary ON task_summary.project_id = project.id
                        WHERE project.company_id = ?
                          AND project.id = ?
                          AND project.deleted_at IS NULL
                        """,
                (rs, rowNum) -> mapProjectRow(rs),
                companyId,
                companyId,
                projectId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Project not found.");
        }

        return rows.getFirst();
    }

    private void requireProject(long companyId, long projectId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM projects
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                Integer.class,
                companyId,
                projectId);

        if (count == null || count == 0) {
            throw new NoSuchElementException("Project not found.");
        }
    }

    private ProjectCommand parseProjectCommand(Map<String, Object> payload) {
        var ownerUserCompanyId = optionalLong(payload, "ownerUserCompanyId");

        if (optionalLong(payload, "ownerUserId") != null) {
            throw new IllegalArgumentException("ownerUserId is no longer supported. Use ownerUserCompanyId.");
        }

        return new ProjectCommand(
                requiredString(payload, "name"),
                optionalString(payload, "description"),
                requiredAllowedValue(payload, "status", ALLOWED_STATUSES),
                optionalAllowedValue(payload, "priority", ALLOWED_PRIORITIES),
                ownerUserCompanyId,
                optionalString(payload, "ownerName"),
                optionalLong(payload, "businessId"),
                optionalLong(payload, "unitId"),
                optionalDate(payload, "startDate"),
                optionalDate(payload, "dueDate"));
    }

    private String nextProjectFolio(long companyId) {
        var currentYear = Year.now().getValue();
        Integer nextNumber = jdbcTemplate.queryForObject(
                """
                        SELECT COALESCE(MAX(CAST(SUBSTRING(folio, 8) AS UNSIGNED)), 0) + 1
                        FROM projects
                        WHERE company_id = ?
                          AND folio LIKE ?
                          AND folio LIKE 'P-%'
                        """,
                Integer.class,
                companyId,
                "P-" + currentYear + "-%");

        int value = nextNumber != null ? nextNumber : 1;
        return "P-" + currentYear + "-" + String.format("%03d", value);
    }

    private Map<String, Object> mapProjectRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("companyId", rs.getLong("company_id"));
        row.put("folio", rs.getString("folio"));
        row.put("name", rs.getString("name"));
        row.put("description", rs.getString("description"));
        row.put("status", rs.getString("status"));
        row.put("priority", rs.getString("priority"));
        row.put("ownerUserCompanyId", rs.getObject("owner_user_company_id", Long.class));
        row.put("ownerUserId", rs.getObject("owner_user_id", Long.class));
        row.put("ownerName", rs.getString("owner_name"));
        row.put("businessId", rs.getObject("business_id", Long.class));
        row.put("businessName", rs.getString("business_name"));
        row.put("business", rs.getString("business_name"));
        row.put("unitId", rs.getObject("unit_id", Long.class));
        row.put("unitName", rs.getString("unit_name"));
        row.put("unit", rs.getString("unit_name"));
        row.put("startDate", toDateString(rs.getDate("start_date")));
        row.put("dueDate", toDateString(rs.getDate("due_date")));
        row.put("completedAt", toDateTimeString(rs.getTimestamp("completed_at")));
        row.put("cancelledAt", toDateTimeString(rs.getTimestamp("cancelled_at")));
        row.put("createdBy", rs.getObject("created_by", Long.class));
        row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toDateTimeString(rs.getTimestamp("updated_at")));
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

    private void setNullableLong(PreparedStatement statement, int index, Long value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
            return;
        }
        statement.setLong(index, value);
    }

    private void setNullableString(PreparedStatement statement, int index, String value) throws SQLException {
        if (value == null || value.isBlank()) {
            statement.setNull(index, Types.VARCHAR);
            return;
        }
        statement.setString(index, value.trim());
    }

    private void setNullableDate(PreparedStatement statement, int index, LocalDate value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.DATE);
            return;
        }
        statement.setDate(index, java.sql.Date.valueOf(value));
    }

    private String requiredString(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            throw new IllegalArgumentException(key + " is required.");
        }
        return value.toString().trim();
    }

    private String optionalString(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null || value.toString().trim().isEmpty()) {
            return null;
        }
        return value.toString().trim();
    }

    private Long optionalLong(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number numberValue) {
            return numberValue.longValue();
        }
        var normalized = value.toString().trim();
        if (normalized.isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(key + " must be a valid integer.");
        }
    }

    private LocalDate optionalDate(Map<String, Object> payload, String key) {
        var value = payload.get(key);
        if (value == null) {
            return null;
        }
        var normalized = value.toString().trim();
        if (normalized.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(normalized);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(key + " must use YYYY-MM-DD format.");
        }
    }

    private String requiredAllowedValue(Map<String, Object> payload, String key, Set<String> allowedValues) {
        var value = requiredString(payload, key).toLowerCase();
        if (!allowedValues.contains(value)) {
            throw new IllegalArgumentException(key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }
        return value;
    }

    private String optionalAllowedValue(Map<String, Object> payload, String key, Set<String> allowedValues) {
        var rawValue = optionalString(payload, key);
        if (rawValue == null) {
            return null;
        }
        var value = rawValue.toLowerCase();
        if (!allowedValues.contains(value)) {
            throw new IllegalArgumentException(key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }
        return value;
    }

    private String toDateString(java.sql.Date value) {
        return value != null ? value.toLocalDate().toString() : null;
    }

    private String toDateTimeString(Timestamp value) {
        return value != null ? value.toLocalDateTime().toString() : null;
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

    private record ProjectCommand(
            String name,
            String description,
            String status,
            String priority,
            Long ownerUserCompanyId,
            String ownerName,
            Long businessId,
            Long unitId,
            LocalDate startDate,
            LocalDate dueDate) {
    }

    private record UserCompanyReference(long id, long userId) {
    }
}
