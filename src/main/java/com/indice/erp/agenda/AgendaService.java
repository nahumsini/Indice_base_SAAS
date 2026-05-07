package com.indice.erp.agenda;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AgendaService {

    private final JdbcTemplate jdbcTemplate;

    public AgendaService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> listAgendaTasks(long companyId, String fromValue, String toValue) {
        var range = parseRange(fromValue, toValue);

        var rows = jdbcTemplate.query(
                """
                        SELECT task.id,
                               task.id AS task_id,
                               task.folio,
                               task.title,
                               task.description,
                               task.status,
                               task.priority,
                               task.due_date,
                               task.completed_at,
                               task.cancelled_at,
                               task.assigned_employee_id,
                               task.assigned_user_id,
                               COALESCE(
                                   NULLIF(task.assigned_name, ''),
                                   NULLIF(TRIM(CONCAT_WS(' ', COALESCE(employee.first_name, ''), COALESCE(employee.last_name, ''))), ''),
                                   NULLIF(TRIM(user_ref.full_name), ''),
                                   NULLIF(TRIM(user_ref.email), ''),
                                   NULL
                               ) AS resolved_assigned_name,
                               task.process_id,
                               process.folio AS process_folio,
                               process.title AS process_title,
                               task.project_id,
                               project.folio AS project_folio,
                               project.name AS project_name,
                               task.business_id,
                               task.unit_id,
                               task.created_at,
                               task.updated_at
                        FROM process_tasks task
                        LEFT JOIN processes process ON process.id = task.process_id
                            AND process.company_id = task.company_id
                            AND process.deleted_at IS NULL
                        LEFT JOIN projects project ON project.id = task.project_id
                            AND project.company_id = task.company_id
                            AND project.deleted_at IS NULL
                        LEFT JOIN hr_employees employee ON employee.id = task.assigned_employee_id
                            AND employee.company_id = task.company_id
                        LEFT JOIN users user_ref ON user_ref.id = task.assigned_user_id
                        WHERE task.company_id = ?
                          AND task.deleted_at IS NULL
                          AND task.due_date IS NOT NULL
                          AND task.due_date BETWEEN ? AND ?
                        ORDER BY task.due_date ASC, task.id DESC
                        """,
                (rs, rowNum) -> mapAgendaRow(rs),
                companyId,
                java.sql.Date.valueOf(range.from()),
                java.sql.Date.valueOf(range.to()));

        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        body.put("from", range.from().toString());
        body.put("to", range.to().toString());
        return body;
    }

    private AgendaRange parseRange(String fromValue, String toValue) {
        var currentMonth = YearMonth.now();
        LocalDate from = parseDateOrDefault(fromValue, currentMonth.atDay(1), "from");
        LocalDate to = parseDateOrDefault(toValue, currentMonth.atEndOfMonth(), "to");

        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be greater than or equal to from.");
        }

        return new AgendaRange(from, to);
    }

    private LocalDate parseDateOrDefault(String value, LocalDate fallback, String fieldName) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(fieldName + " must use YYYY-MM-DD format.");
        }
    }

    private Map<String, Object> mapAgendaRow(ResultSet rs) throws SQLException {
        var dueDate = rs.getDate("due_date") != null ? rs.getDate("due_date").toLocalDate() : null;
        var status = rs.getString("status");

        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("taskId", rs.getLong("task_id"));
        row.put("folio", rs.getString("folio"));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("status", status);
        row.put("priority", fallback(rs.getString("priority"), "medium"));
        row.put("agendaDate", dueDate != null ? dueDate.toString() : null);
        row.put("dueDate", dueDate != null ? dueDate.toString() : null);
        row.put("completedAt", toDateTimeString(rs.getTimestamp("completed_at")));
        row.put("cancelledAt", toDateTimeString(rs.getTimestamp("cancelled_at")));
        row.put("assignedEmployeeId", rs.getObject("assigned_employee_id", Long.class));
        row.put("assignedUserId", rs.getObject("assigned_user_id", Long.class));
        row.put("assignedName", rs.getString("resolved_assigned_name"));
        row.put("processId", rs.getObject("process_id", Long.class));
        row.put("processFolio", rs.getString("process_folio"));
        row.put("processTitle", rs.getString("process_title"));
        row.put("projectId", rs.getObject("project_id", Long.class));
        row.put("projectFolio", rs.getString("project_folio"));
        row.put("projectName", rs.getString("project_name"));
        row.put("businessId", rs.getObject("business_id", Long.class));
        row.put("unitId", rs.getObject("unit_id", Long.class));
        row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toDateTimeString(rs.getTimestamp("updated_at")));
        row.put("isOverdue", dueDate != null
                && dueDate.isBefore(LocalDate.now())
                && !"completed".equals(status)
                && !"cancelled".equals(status));
        return row;
    }

    private String toDateTimeString(Timestamp value) {
        return value != null ? value.toLocalDateTime().toString() : null;
    }

    private String fallback(String value, String fallbackValue) {
        return value == null || value.isBlank() ? fallbackValue : value;
    }

    private record AgendaRange(LocalDate from, LocalDate to) {
    }
}
