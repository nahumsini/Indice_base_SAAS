package com.indice.erp.processTasks;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
public class ProcessTasksService {

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "pending",
            "in_progress",
            "completed",
            "cancelled",
            "paused");
    private static final Set<String> ALLOWED_PRIORITIES = Set.of("low", "medium", "high");

    private final JdbcTemplate jdbcTemplate;
    private static final String TASK_SELECT_COLUMNS = """
            SELECT pt.id,
                   pt.company_id,
                   pt.process_id,
                   pt.project_id,
                   pt.folio,
                   pt.title,
                   pt.description,
                   pt.assigned_employee_id,
                   pt.assigned_user_id,
                   COALESCE(
                       NULLIF(pt.assigned_name, ''),
                       NULLIF(TRIM(CONCAT_WS(' ', COALESCE(employee.first_name, ''), COALESCE(employee.last_name, ''))), ''),
                       NULLIF(TRIM(user_ref.full_name), ''),
                       NULLIF(TRIM(user_ref.email), ''),
                       NULL
                   ) AS resolved_assigned_name,
                   pt.status,
                   pt.priority,
                   pt.due_date,
                   pt.started_at,
                   pt.completed_at,
                   pt.cancelled_at,
                   pt.completed_by_employee_id,
                   pt.completed_by_user_id,
                   pt.completion_notes,
                   pt.business_id,
                   pt.unit_id,
                   pt.created_by,
                   pt.created_at,
                   pt.updated_at
            FROM process_tasks pt
            LEFT JOIN hr_employees employee ON employee.id = pt.assigned_employee_id
                AND employee.company_id = pt.company_id
            LEFT JOIN users user_ref ON user_ref.id = pt.assigned_user_id
            """;

    public ProcessTasksService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> listTasks(long companyId) {
        var rows = jdbcTemplate.query(
                TASK_SELECT_COLUMNS +
                        """
                                WHERE pt.company_id = ?
                                  AND pt.deleted_at IS NULL
                                ORDER BY pt.id DESC
                                """,
                (rs, rowNum) -> mapTaskRow(rs),
                companyId);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createTask(long companyId, long userId, Map<String, Object> payload) {
        var command = parseTaskCommand(payload);
        validateReferences(companyId, command);

        var lifecycle = lifecycleForCreate(command.status(), userId);
        var folio = nextTaskFolio(companyId);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            INSERT INTO process_tasks
                            (company_id, process_id, project_id, folio, title, description, assigned_employee_id, assigned_user_id,
                             assigned_name, status, priority, due_date, started_at, completed_at, cancelled_at,
                             completed_by_employee_id, completed_by_user_id, completion_notes, business_id, unit_id, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    new String[] { "id" });

            statement.setLong(1, companyId);
            setNullableLong(statement, 2, command.processId());
            setNullableLong(statement, 3, command.projectId());
            statement.setString(4, folio);
            statement.setString(5, command.title());
            setNullableString(statement, 6, command.description());
            setNullableLong(statement, 7, command.assignedEmployeeId());
            setNullableLong(statement, 8, command.assignedUserId());
            setNullableString(statement, 9, command.assignedName());
            statement.setString(10, command.status());
            statement.setString(11, command.priority());
            setNullableDate(statement, 12, command.dueDate());
            setNullableDateTime(statement, 13, lifecycle.startedAt());
            setNullableDateTime(statement, 14, lifecycle.completedAt());
            setNullableDateTime(statement, 15, lifecycle.cancelledAt());
            setNullableLong(statement, 16, lifecycle.completedByEmployeeId());
            setNullableLong(statement, 17, lifecycle.completedByUserId());
            setNullableString(statement, 18, lifecycle.completionNotes());
            setNullableLong(statement, 19, command.businessId());
            setNullableLong(statement, 20, command.unitId());
            statement.setLong(21, userId);
            return statement;
        }, keyHolder);

        var taskId = keyHolder.getKey() != null ? keyHolder.getKey().longValue() : 0L;
        return getTask(companyId, taskId);
    }

    @Transactional
    public Map<String, Object> updateTask(long companyId, long userId, long taskId, Map<String, Object> payload) {
        var existingTask = requireTaskForMutation(companyId, taskId);
        var command = parseTaskCommand(payload);
        validateReferences(companyId, command);
        var lifecycle = lifecycleForStatus(existingTask, command.status(), userId);

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            UPDATE process_tasks
                            SET process_id = ?,
                                project_id = ?,
                                title = ?,
                                description = ?,
                                assigned_employee_id = ?,
                                assigned_user_id = ?,
                                assigned_name = ?,
                                status = ?,
                                priority = ?,
                                due_date = ?,
                                started_at = ?,
                                completed_at = ?,
                                cancelled_at = ?,
                                completed_by_employee_id = ?,
                                completed_by_user_id = ?,
                                completion_notes = ?,
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
            setNullableLong(statement, 5, command.assignedEmployeeId());
            setNullableLong(statement, 6, command.assignedUserId());
            setNullableString(statement, 7, command.assignedName());
            statement.setString(8, command.status());
            statement.setString(9, command.priority());
            setNullableDate(statement, 10, command.dueDate());
            setNullableDateTime(statement, 11, lifecycle.startedAt());
            setNullableDateTime(statement, 12, lifecycle.completedAt());
            setNullableDateTime(statement, 13, lifecycle.cancelledAt());
            setNullableLong(statement, 14, lifecycle.completedByEmployeeId());
            setNullableLong(statement, 15, lifecycle.completedByUserId());
            setNullableString(statement, 16, lifecycle.completionNotes());
            setNullableLong(statement, 17, command.businessId());
            setNullableLong(statement, 18, command.unitId());
            statement.setLong(19, companyId);
            statement.setLong(20, taskId);
            return statement;
        });

        return getTask(companyId, taskId);
    }

    @Transactional
    public void deleteTask(long companyId, long taskId) {
        requireTask(companyId, taskId);

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
        requireTask(companyId, taskId);
        var completionNotes = optionalString(payload, "completionNotes");

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            UPDATE process_tasks
                            SET status = 'completed',
                                started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                                completed_at = CURRENT_TIMESTAMP,
                                cancelled_at = NULL,
                                completed_by_employee_id = NULL,
                                completed_by_user_id = ?,
                                completion_notes = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            statement.setLong(1, userId);
            setNullableString(statement, 2, completionNotes);
            statement.setLong(3, companyId);
            statement.setLong(4, taskId);
            return statement;
        });

        return getTask(companyId, taskId);
    }

    @Transactional
    public Map<String, Object> cancelTask(long companyId, long taskId) {
        requireTask(companyId, taskId);

        jdbcTemplate.update(
                """
                        UPDATE process_tasks
                        SET status = 'cancelled',
                            cancelled_at = CURRENT_TIMESTAMP,
                            completed_at = NULL,
                            completed_by_employee_id = NULL,
                            completed_by_user_id = NULL,
                            completion_notes = NULL
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                companyId,
                taskId);

        return getTask(companyId, taskId);
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

    private TaskMutationRecord requireTaskForMutation(long companyId, long taskId) {
        var rows = jdbcTemplate.query(
                """
                        SELECT id,
                               status,
                               started_at,
                               completed_at,
                               cancelled_at,
                               completed_by_employee_id,
                               completed_by_user_id,
                               completion_notes
                        FROM process_tasks
                        WHERE company_id = ?
                          AND id = ?
                          AND deleted_at IS NULL
                        """,
                (rs, rowNum) -> new TaskMutationRecord(
                        rs.getLong("id"),
                        rs.getString("status"),
                        toLocalDateTime(rs.getTimestamp("started_at")),
                        toLocalDateTime(rs.getTimestamp("completed_at")),
                        toLocalDateTime(rs.getTimestamp("cancelled_at")),
                        rs.getObject("completed_by_employee_id", Long.class),
                        rs.getObject("completed_by_user_id", Long.class),
                        rs.getString("completion_notes")),
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

        if (command.assignedEmployeeId() != null) {
            requireScopedRecord(
                    """
                            SELECT COUNT(*)
                            FROM hr_employees
                            WHERE company_id = ?
                              AND id = ?
                            """,
                    companyId,
                    command.assignedEmployeeId(),
                    "Assigned employee not found.");
        }

        if (command.assignedUserId() != null) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM user_companies
                            WHERE company_id = ?
                              AND user_id = ?
                              AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                            """,
                    Integer.class,
                    companyId,
                    command.assignedUserId());

            if (count == null || count == 0) {
                throw new NoSuchElementException("Assigned user not found.");
            }
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

    private TaskCommand parseTaskCommand(Map<String, Object> payload) {
        var title = requiredString(payload, "title");
        var assignedEmployeeId = optionalLong(payload, "assignedEmployeeId");
        var assignedUserId = optionalLong(payload, "assignedUserId");

        if (assignedEmployeeId != null && assignedUserId != null) {
            throw new IllegalArgumentException("A task can be assigned to an employee or a user, but not both.");
        }

        return new TaskCommand(
                title,
                optionalString(payload, "description"),
                optionalLong(payload, "processId"),
                optionalLong(payload, "projectId"),
                assignedEmployeeId,
                assignedUserId,
                optionalString(payload, "assignedName"),
                requiredAllowedValue(payload, "status", ALLOWED_STATUSES),
                optionalAllowedValue(payload, "priority", ALLOWED_PRIORITIES, "medium"),
                optionalDate(payload, "dueDate"),
                optionalLong(payload, "businessId"),
                optionalLong(payload, "unitId"));
    }

    private TaskLifecycle lifecycleForCreate(String status, long userId) {
        var now = LocalDateTime.now();

        return switch (status) {
            case "in_progress" -> new TaskLifecycle(now, null, null, null, null, null);
            case "completed" -> new TaskLifecycle(now, now, null, null, userId, null);
            case "cancelled" -> new TaskLifecycle(null, null, now, null, null, null);
            default -> new TaskLifecycle(null, null, null, null, null, null);
        };
    }

    private TaskLifecycle lifecycleForStatus(TaskMutationRecord currentTask, String status, long userId) {
        var now = LocalDateTime.now();
        LocalDateTime startedAt = currentTask.startedAt();
        LocalDateTime completedAt = currentTask.completedAt();
        LocalDateTime cancelledAt = currentTask.cancelledAt();
        Long completedByEmployeeId = currentTask.completedByEmployeeId();
        Long completedByUserId = currentTask.completedByUserId();
        String completionNotes = currentTask.completionNotes();

        switch (status) {
            case "pending":
            case "paused":
                completedAt = null;
                cancelledAt = null;
                completedByEmployeeId = null;
                completedByUserId = null;
                completionNotes = null;
                break;
            case "in_progress":
                if (startedAt == null) {
                    startedAt = now;
                }
                completedAt = null;
                cancelledAt = null;
                completedByEmployeeId = null;
                completedByUserId = null;
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
                completedByEmployeeId = null;
                completedByUserId = completedByUserId != null ? completedByUserId : userId;
                break;
            case "cancelled":
                completedAt = null;
                cancelledAt = cancelledAt != null ? cancelledAt : now;
                completedByEmployeeId = null;
                completedByUserId = null;
                completionNotes = null;
                break;
            default:
                break;
        }

        return new TaskLifecycle(
                startedAt,
                completedAt,
                cancelledAt,
                completedByEmployeeId,
                completedByUserId,
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

    private Map<String, Object> mapTaskRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("companyId", rs.getLong("company_id"));
        row.put("processId", rs.getObject("process_id", Long.class));
        row.put("projectId", rs.getObject("project_id", Long.class));
        row.put("folio", rs.getString("folio"));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("assignedEmployeeId", rs.getObject("assigned_employee_id", Long.class));
        row.put("assignedUserId", rs.getObject("assigned_user_id", Long.class));
        row.put("assignedName", rs.getString("resolved_assigned_name"));
        row.put("status", rs.getString("status"));
        row.put("priority", fallback(rs.getString("priority"), "medium"));
        row.put("dueDate", toDateString(rs.getDate("due_date")));
        row.put("startedAt", toDateTimeString(rs.getTimestamp("started_at")));
        row.put("completedAt", toDateTimeString(rs.getTimestamp("completed_at")));
        row.put("cancelledAt", toDateTimeString(rs.getTimestamp("cancelled_at")));
        row.put("completedByEmployeeId", rs.getObject("completed_by_employee_id", Long.class));
        row.put("completedByUserId", rs.getObject("completed_by_user_id", Long.class));
        row.put("completionNotes", rs.getString("completion_notes"));
        row.put("businessId", rs.getObject("business_id", Long.class));
        row.put("unitId", rs.getObject("unit_id", Long.class));
        row.put("createdBy", rs.getObject("created_by", Long.class));
        row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toDateTimeString(rs.getTimestamp("updated_at")));
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

    private void setNullableDateTime(PreparedStatement statement, int index, LocalDateTime value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.TIMESTAMP);
            return;
        }

        statement.setTimestamp(index, Timestamp.valueOf(value));
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
            throw new IllegalArgumentException(
                    key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }

        return value;
    }

    private String optionalAllowedValue(Map<String, Object> payload, String key, Set<String> allowedValues,
            String fallbackValue) {
        var rawValue = optionalString(payload, key);
        if (rawValue == null) {
            return fallbackValue;
        }

        var value = rawValue.toLowerCase();
        if (!allowedValues.contains(value)) {
            throw new IllegalArgumentException(
                    key + " must be one of: " + String.join(", ", allowedValues) + ".");
        }

        return value;
    }

    private String toDateString(java.sql.Date value) {
        return value != null ? value.toLocalDate().toString() : null;
    }

    private String toDateTimeString(Timestamp value) {
        return value != null ? value.toLocalDateTime().toString() : null;
    }

    private LocalDateTime toLocalDateTime(Timestamp value) {
        return value != null ? value.toLocalDateTime() : null;
    }

    private String fallback(String value, String fallbackValue) {
        if (value == null || value.isBlank()) {
            return fallbackValue;
        }

        return value;
    }

    private record TaskCommand(
            String title,
            String description,
            Long processId,
            Long projectId,
            Long assignedEmployeeId,
            Long assignedUserId,
            String assignedName,
            String status,
            String priority,
            LocalDate dueDate,
            Long businessId,
            Long unitId) {
    }

    private record TaskLifecycle(
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            LocalDateTime cancelledAt,
            Long completedByEmployeeId,
            Long completedByUserId,
            String completionNotes) {
    }

    private record TaskMutationRecord(
            long id,
            String status,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            LocalDateTime cancelledAt,
            Long completedByEmployeeId,
            Long completedByUserId,
            String completionNotes) {
    }
}
