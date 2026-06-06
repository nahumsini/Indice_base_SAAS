package com.indice.erp.processTasks.agenda;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AgendaService {

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;

    public AgendaService(JdbcTemplate jdbcTemplate, ProcessTaskAssignmentScopeService assignmentScopeService) {
        this.jdbcTemplate = jdbcTemplate;
        this.assignmentScopeService = assignmentScopeService;
    }

    public Map<String, Object> listAgendaTasks(long companyId, long userId, String fromValue, String toValue) {
        var range = parseRange(fromValue, toValue);
        var visibility = assignmentScopeService.taskVisibilityFilter(companyId, userId, "task", "business");
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.add(java.sql.Date.valueOf(range.from()));
        params.add(java.sql.Date.valueOf(range.to()));
        params.addAll(visibility.params());

        var rows = jdbcTemplate.query(
                """
                        SELECT task.id,
                               task.id AS task_id,
                               task.folio,
                               task.title,
                               task.description,
                               task.status,
                               task.priority,
                               task.start_date,
                               task.due_date,
                               task.agenda_date,
                               task.agenda_start_time,
                               task.agenda_end_time,
                               task.agenda_time_zone,
                               task.started_at,
                               task.completed_at,
                               task.cancelled_at,
                               task.completed_by_user_company_id,
                               COALESCE(completed_user_company.user_id, task.completed_by_user_id) AS completed_by_user_id,
                               COALESCE(
                                   NULLIF(TRIM(completed_user.full_name), ''),
                                   NULLIF(TRIM(completed_user.email), ''),
                                   NULL
                               ) AS resolved_completed_by_name,
                               task.completion_notes,
                               task.assigned_user_company_id,
                               assigned_user_company.user_id AS assigned_user_id,
                               COALESCE(
                                   NULLIF(task.assigned_name, ''),
                                   NULLIF(TRIM(assigned_user.full_name), ''),
                                   NULLIF(TRIM(assigned_user.email), ''),
                                   NULL
                               ) AS resolved_assigned_name,
                               task.process_id,
                               process.folio AS process_folio,
                               process.title AS process_title,
                               task.project_id,
                               project.folio AS project_folio,
                               project.name AS project_name,
                               task.business_id,
                               business.name AS business_name,
                               task.unit_id,
                               unit.name AS unit_name,
                               task.notes,
                               task.completion_percent,
                               task.weighting,
                               task.audited,
                               task.audit_notes,
                               task.audited_at,
                               task.audited_by_user_company_id,
                               audited_user_company.user_id AS audited_by_user_id,
                               COALESCE(
                                   NULLIF(TRIM(audited_user.full_name), ''),
                                   NULLIF(TRIM(audited_user.email), ''),
                                   NULL
                               ) AS resolved_audited_by_name,
                               task.created_by,
                               COALESCE(
                                   NULLIF(TRIM(created_user.full_name), ''),
                                   NULLIF(TRIM(created_user.email), ''),
                                   NULL
                               ) AS resolved_created_by_name,
                               task.created_at,
                               task.updated_at,
                               (
                                   SELECT COUNT(*)
                                   FROM process_task_attachments attachment
                                   WHERE attachment.company_id = task.company_id
                                     AND attachment.task_id = task.id
                                     AND attachment.deleted_at IS NULL
                               ) AS attachments
                        FROM process_tasks task
                        LEFT JOIN processes process ON process.id = task.process_id
                            AND process.company_id = task.company_id
                            AND process.deleted_at IS NULL
                        LEFT JOIN projects project ON project.id = task.project_id
                            AND project.company_id = task.company_id
                            AND project.deleted_at IS NULL
                        LEFT JOIN user_companies assigned_user_company ON assigned_user_company.id = task.assigned_user_company_id
                            AND assigned_user_company.company_id = task.company_id
                        LEFT JOIN users assigned_user ON assigned_user.id = assigned_user_company.user_id
                        LEFT JOIN user_companies completed_user_company ON completed_user_company.id = task.completed_by_user_company_id
                            AND completed_user_company.company_id = task.company_id
                        LEFT JOIN users completed_user ON completed_user.id = COALESCE(completed_user_company.user_id, task.completed_by_user_id)
                        LEFT JOIN user_companies audited_user_company ON audited_user_company.id = task.audited_by_user_company_id
                            AND audited_user_company.company_id = task.company_id
                        LEFT JOIN users audited_user ON audited_user.id = audited_user_company.user_id
                        LEFT JOIN users created_user ON created_user.id = task.created_by
                        LEFT JOIN businesses business ON business.id = task.business_id
                            AND (business.company_id = task.company_id OR business.company_id IS NULL)
                        LEFT JOIN units unit ON unit.id = task.unit_id
                            AND (unit.company_id = task.company_id OR unit.company_id IS NULL)
                        WHERE task.company_id = ?
                          AND task.deleted_at IS NULL
                          AND COALESCE(task.agenda_date, task.due_date) IS NOT NULL
                          AND COALESCE(task.agenda_date, task.due_date) BETWEEN ? AND ?
                          AND %s
                        ORDER BY COALESCE(task.agenda_date, task.due_date) ASC,
                                 task.agenda_start_time ASC,
                                 task.id DESC
                        """.formatted(visibility.condition()),
                (rs, rowNum) -> mapAgendaRow(rs),
                params.toArray());

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
        Long processId = rs.getObject("process_id", Long.class);
        Long projectId = rs.getObject("project_id", Long.class);
        var dueDate = rs.getDate("due_date") != null ? rs.getDate("due_date").toLocalDate() : null;
        var agendaDate = rs.getDate("agenda_date") != null ? rs.getDate("agenda_date").toLocalDate() : dueDate;
        var status = rs.getString("status");
        int completionPercent = rs.getInt("completion_percent");

        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("taskId", rs.getLong("task_id"));
        row.put("taskType", taskType(projectId, processId));
        row.put("type", taskType(projectId, processId));
        row.put("folio", rs.getString("folio"));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("status", status);
        row.put("priority", fallback(rs.getString("priority"), "medium"));
        row.put("agendaDate", agendaDate != null ? agendaDate.toString() : null);
        row.put("agendaStartTime", toTimeString(rs.getTime("agenda_start_time")));
        row.put("agendaEndTime", toTimeString(rs.getTime("agenda_end_time")));
        row.put("agendaTimeZone", rs.getString("agenda_time_zone"));
        row.put("startDate", toDateString(rs.getDate("start_date")));
        row.put("dueDate", dueDate != null ? dueDate.toString() : null);
        row.put("startedAt", toDateTimeString(rs.getTimestamp("started_at")));
        row.put("completedAt", toDateTimeString(rs.getTimestamp("completed_at")));
        row.put("cancelledAt", toDateTimeString(rs.getTimestamp("cancelled_at")));
        row.put("completedByUserCompanyId", rs.getObject("completed_by_user_company_id", Long.class));
        row.put("completedByUserId", rs.getObject("completed_by_user_id", Long.class));
        row.put("completedByName", rs.getString("resolved_completed_by_name"));
        row.put("closedByName", rs.getString("resolved_completed_by_name"));
        row.put("completionNotes", rs.getString("completion_notes"));
        row.put("assignedUserCompanyId", rs.getObject("assigned_user_company_id", Long.class));
        row.put("assignedUserId", rs.getObject("assigned_user_id", Long.class));
        row.put("assignedName", rs.getString("resolved_assigned_name"));
        row.put("responsible", rs.getString("resolved_assigned_name"));
        row.put("processId", processId);
        row.put("processFolio", rs.getString("process_folio"));
        row.put("processTitle", rs.getString("process_title"));
        row.put("projectId", projectId);
        row.put("projectFolio", rs.getString("project_folio"));
        row.put("projectName", rs.getString("project_name"));
        row.put("project", rs.getString("project_name"));
        row.put("businessId", rs.getObject("business_id", Long.class));
        row.put("businessName", rs.getString("business_name"));
        row.put("business", rs.getString("business_name"));
        row.put("unitId", rs.getObject("unit_id", Long.class));
        row.put("unitName", rs.getString("unit_name"));
        row.put("unit", rs.getString("unit_name"));
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
        row.put("auditStatus", auditStatus(status, rs.getBoolean("audited")));
        row.put("createdBy", rs.getObject("created_by", Long.class));
        row.put("createdByName", rs.getString("resolved_created_by_name"));
        row.put("creator", rs.getString("resolved_created_by_name"));
        row.put("createdAt", toDateTimeString(rs.getTimestamp("created_at")));
        row.put("updatedAt", toDateTimeString(rs.getTimestamp("updated_at")));
        row.put("attachments", rs.getInt("attachments"));
        row.put("isOverdue", dueDate != null
                && dueDate.isBefore(LocalDate.now())
                && !"completed".equals(status)
                && !"cancelled".equals(status));
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

    private String toDateString(java.sql.Date value) {
        return value != null ? value.toLocalDate().toString() : null;
    }

    private String toDateTimeString(Timestamp value) {
        return value != null ? value.toLocalDateTime().toString() : null;
    }

    private String toTimeString(java.sql.Time value) {
        return value != null ? value.toLocalTime().toString() : null;
    }

    private String fallback(String value, String fallbackValue) {
        return value == null || value.isBlank() ? fallbackValue : value;
    }

    private record AgendaRange(LocalDate from, LocalDate to) {
    }
}
