package com.indice.erp.processTasks.tasks;

import static com.indice.erp.processTasks.tasks.support.ProcessTaskInput.optionalString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskInput.parseTaskCommand;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableDate;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableDateTime;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableLong;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.setNullableString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.toDateString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.toDateTimeString;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskJdbc.toLocalDateTime;
import static com.indice.erp.processTasks.tasks.support.ProcessTaskPresentation.fallback;

import com.indice.erp.processTasks.tasks.domain.TaskCommand;
import com.indice.erp.processTasks.tasks.domain.TaskLifecycle;
import com.indice.erp.processTasks.tasks.domain.TaskMutationRecord;
import com.indice.erp.processTasks.tasks.domain.UserCompanyReference;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.Year;
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
                   pt.due_date,
                   pt.started_at,
                   pt.completed_at,
                   pt.cancelled_at,
                   pt.completed_by_user_company_id,
                   completed_user_company.user_id AS completed_by_user_id,
                   pt.completion_notes,
                   pt.business_id,
                   pt.unit_id,
                   pt.created_by,
                   pt.created_at,
                   pt.updated_at
            FROM process_tasks pt
            LEFT JOIN user_companies assigned_user_company ON assigned_user_company.id = pt.assigned_user_company_id
                AND assigned_user_company.company_id = pt.company_id
            LEFT JOIN users assigned_user ON assigned_user.id = assigned_user_company.user_id
            LEFT JOIN user_companies completed_user_company ON completed_user_company.id = pt.completed_by_user_company_id
                AND completed_user_company.company_id = pt.company_id
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

    public Map<String, Object> listTasksForProject(long companyId, long projectId) {
        var rows = jdbcTemplate.query(
                TASK_SELECT_COLUMNS +
                        """
                                WHERE pt.company_id = ?
                                  AND pt.deleted_at IS NULL
                                  AND pt.project_id = ?
                                ORDER BY pt.id DESC
                                """,
                (rs, rowNum) -> mapTaskRow(rs),
                companyId,
                projectId);

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createTask(long companyId, long userId, Map<String, Object> payload) {
        var command = parseTaskCommand(payload, ALLOWED_STATUSES, ALLOWED_PRIORITIES);
        validateReferences(companyId, command);
        var assignedUserCompany = requireActiveUserCompany(
                companyId,
                command.assignedUserCompanyId(),
                "Assigned user not found.");

        var lifecycle = lifecycleForCreate(command.status(), userId, currentUserCompanyId(companyId, userId));
        var folio = nextTaskFolio(companyId);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                            INSERT INTO process_tasks
                            (company_id, process_id, project_id, folio, title, description, assigned_user_id, assigned_user_company_id,
                             assigned_name, status, priority, due_date, started_at, completed_at, cancelled_at,
                             completed_by_user_id, completed_by_user_company_id, completion_notes, business_id, unit_id, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            setNullableDate(statement, 12, command.dueDate());
            setNullableDateTime(statement, 13, lifecycle.startedAt());
            setNullableDateTime(statement, 14, lifecycle.completedAt());
            setNullableDateTime(statement, 15, lifecycle.cancelledAt());
            setNullableLong(statement, 16, lifecycle.completedByUserId());
            setNullableLong(statement, 17, lifecycle.completedByUserCompanyId());
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
        var command = parseTaskCommand(payload, ALLOWED_STATUSES, ALLOWED_PRIORITIES);
        validateReferences(companyId, command);
        var assignedUserCompany = requireActiveUserCompany(
                companyId,
                command.assignedUserCompanyId(),
                "Assigned user not found.");
        var lifecycle = lifecycleForStatus(existingTask, command.status(), userId, currentUserCompanyId(companyId, userId));

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
                                due_date = ?,
                                started_at = ?,
                                completed_at = ?,
                                cancelled_at = ?,
                                completed_by_user_id = ?,
                                completed_by_user_company_id = ?,
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
            setNullableLong(statement, 5, assignedUserCompany != null ? assignedUserCompany.userId() : null);
            setNullableLong(statement, 6, assignedUserCompany != null ? assignedUserCompany.id() : null);
            setNullableString(statement, 7, command.assignedName());
            statement.setString(8, command.status());
            statement.setString(9, command.priority());
            setNullableDate(statement, 10, command.dueDate());
            setNullableDateTime(statement, 11, lifecycle.startedAt());
            setNullableDateTime(statement, 12, lifecycle.completedAt());
            setNullableDateTime(statement, 13, lifecycle.cancelledAt());
            setNullableLong(statement, 14, lifecycle.completedByUserId());
            setNullableLong(statement, 15, lifecycle.completedByUserCompanyId());
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
                                completion_notes = ?
                            WHERE company_id = ?
                              AND id = ?
                              AND deleted_at IS NULL
                            """);

            statement.setLong(1, userId);
            setNullableLong(statement, 2, userCompanyId);
            setNullableString(statement, 3, completionNotes);
            statement.setLong(4, companyId);
            statement.setLong(5, taskId);
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
                               completed_by_user_id,
                               completed_by_user_company_id,
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
                        rs.getObject("completed_by_user_id", Long.class),
                        rs.getObject("completed_by_user_company_id", Long.class),
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

    private Map<String, Object> mapTaskRow(ResultSet rs) throws SQLException {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("companyId", rs.getLong("company_id"));
        row.put("processId", rs.getObject("process_id", Long.class));
        row.put("projectId", rs.getObject("project_id", Long.class));
        row.put("folio", rs.getString("folio"));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("assignedUserCompanyId", rs.getObject("assigned_user_company_id", Long.class));
        row.put("assignedUserId", rs.getObject("assigned_user_id", Long.class));
        row.put("assignedName", rs.getString("resolved_assigned_name"));
        row.put("status", rs.getString("status"));
        row.put("priority", fallback(rs.getString("priority"), "medium"));
        row.put("dueDate", toDateString(rs.getDate("due_date")));
        row.put("startedAt", toDateTimeString(rs.getTimestamp("started_at")));
        row.put("completedAt", toDateTimeString(rs.getTimestamp("completed_at")));
        row.put("cancelledAt", toDateTimeString(rs.getTimestamp("cancelled_at")));
        row.put("completedByUserCompanyId", rs.getObject("completed_by_user_company_id", Long.class));
        row.put("completedByUserId", rs.getObject("completed_by_user_id", Long.class));
        row.put("completionNotes", rs.getString("completion_notes"));
        row.put("businessId", rs.getObject("business_id", Long.class));
        row.put("unitId", rs.getObject("unit_id", Long.class));
        row.put("createdBy", rs.getObject("created_by", Long.class));
        row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toDateTimeString(rs.getTimestamp("updated_at")));
        return row;
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
}
