package com.indice.erp.processTasks.kiosk;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** All public read models for tasks and assignment choices. */
@Service
class ProcessTaskKioskQueryService {

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;

    ProcessTaskKioskQueryService(
            JdbcTemplate jdbcTemplate,
            ProcessTaskAssignmentScopeService assignmentScopeService) {
        this.jdbcTemplate = jdbcTemplate;
        this.assignmentScopeService = assignmentScopeService;
    }

    List<Map<String, Object>> listTasks(
            ProcessTaskKioskRow kiosk,
            ProcessTaskKioskEmployee employee) {
        var params = new ArrayList<Object>();
        params.add(employee.userCompanyId());
        params.add(kiosk.companyId());
        params.add(kiosk.companyId());
        params.add(employee.userId());
        params.add(employee.userCompanyId());
        appendScopeParams(params, kiosk);
        return jdbcTemplate.query(
            taskSql(
                "(current_assignment.id IS NOT NULL OR task.created_by = ? OR task.completed_by_user_company_id = ?)",
                "AND task.status IN ('pending', 'in_progress', 'paused', 'completed')",
                scopeSql(kiosk)
            ) + " ORDER BY CASE WHEN task.status = 'completed' THEN 1 ELSE 0 END,"
                + " COALESCE(task.due_date, CURRENT_DATE) ASC, task.id DESC",
            (rs, rowNum) -> mapTask(rs, employee),
            params.toArray()
        );
    }

    Map<String, Object> visibleTask(
            ProcessTaskKioskRow kiosk,
            ProcessTaskKioskEmployee employee,
            long taskId) {
        var params = new ArrayList<Object>();
        params.add(employee.userCompanyId());
        params.add(kiosk.companyId());
        params.add(kiosk.companyId());
        params.add(employee.userId());
        params.add(employee.userCompanyId());
        params.add(taskId);
        appendScopeParams(params, kiosk);
        var rows = jdbcTemplate.query(
            taskSql(
                "(current_assignment.id IS NOT NULL OR task.created_by = ? OR task.completed_by_user_company_id = ?)",
                "AND task.status IN ('pending', 'in_progress', 'paused', 'completed')",
                "AND task.id = ?\n" + scopeSql(kiosk)
            ),
            (rs, rowNum) -> mapTask(rs, employee),
            params.toArray()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found for this kiosk.");
        }
        return rows.getFirst();
    }

    Map<String, Object> completableTask(
            ProcessTaskKioskRow kiosk,
            ProcessTaskKioskEmployee employee,
            long taskId) {
        var params = new ArrayList<Object>();
        params.add(employee.userCompanyId());
        params.add(kiosk.companyId());
        params.add(kiosk.companyId());
        params.add(taskId);
        appendScopeParams(params, kiosk);
        var rows = jdbcTemplate.query(
            taskSql(
                "current_assignment.id IS NOT NULL",
                "AND task.status IN ('pending', 'in_progress', 'paused')",
                "AND task.id = ?\n" + scopeSql(kiosk)
            ) + " FOR UPDATE",
            (rs, rowNum) -> mapTask(rs, employee),
            params.toArray()
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Task not found for this kiosk.");
        }
        return rows.getFirst();
    }

    Map<String, Object> assignmentOptions(ProcessTaskKioskRow kiosk, long userId) {
        var companyId = kiosk.companyId();
        var scope = assignmentScopeService.actorScope(companyId, userId);
        var units = loadUnits(companyId, scope).stream()
            .filter(item -> kiosk.unitId() == null || Objects.equals(number(item.get("id")), kiosk.unitId()))
            .toList();
        var businesses = loadBusinesses(companyId, scope).stream()
            .filter(item -> kiosk.businessId() == null
                || Objects.equals(number(item.get("id")), kiosk.businessId()))
            .toList();
        var collaborators = loadCollaborators(companyId, scope).stream()
            .filter(item -> kiosk.unitId() == null
                || Objects.equals(number(item.get("unit_id")), kiosk.unitId()))
            .filter(item -> kiosk.businessId() == null
                || Objects.equals(number(item.get("business_id")), kiosk.businessId()))
            .toList();
        var body = new LinkedHashMap<String, Object>();
        body.put("default_unit_id", kiosk.unitId() == null ? scope.unitId() : kiosk.unitId());
        body.put("default_business_id", kiosk.businessId() == null ? scope.businessId() : kiosk.businessId());
        body.put("units", units);
        body.put("businesses", businesses);
        body.put("collaborators", collaborators);
        return body;
    }

    private String taskSql(String visibilityCondition, String statusCondition, String extraWhere) {
        return """
            SELECT task.id, task.folio, task.title, task.description, task.status, task.priority,
                   task.start_date, task.due_date, task.completed_at, task.completion_percent,
                   task.agenda_date, task.agenda_start_time, task.agenda_end_time,
                   task.agenda_time_zone,
                   task.notes, task.assigned_user_company_id,
                   COALESCE(
                            NULLIF(TRIM(assigned_user_display_profile.full_name), ''), NULLIF(TRIM(assigned_user.full_name), ''),
                            NULLIF(TRIM(assigned_user.email), ''), NULLIF(task.assigned_name, ''), NULL) AS assigned_name,
                   task.unit_id, unit.name AS unit_name,
                   task.business_id, business.name AS business_name,
                   task.process_id, process.title AS process_title,
                   task.project_id, project.name AS project_name,
                   task.created_by,
                   COALESCE(NULLIF(TRIM(created_user.full_name), ''),
                            NULLIF(TRIM(created_user.email), ''), NULL) AS created_by_name,
                   task.completed_by_user_company_id, task.created_at,
                   current_assignment.id AS current_assignment_id,
                   current_assignment.assignment_role AS current_assignment_role,
                   current_assignment.contribution_status AS current_contribution_status,
                   CASE WHEN current_assignment.id IS NULL THEN 0
                        ELSE COALESCE(assignment_team.team_size, 0) END AS current_team_size,
                   (SELECT COUNT(*) FROM process_task_attachments attachment
                     WHERE attachment.company_id = task.company_id
                       AND attachment.task_id = task.id AND attachment.deleted_at IS NULL) AS attachments
            FROM process_tasks task
            LEFT JOIN user_companies assigned_user_company
              ON assigned_user_company.id = task.assigned_user_company_id
             AND assigned_user_company.company_id = task.company_id
            LEFT JOIN users assigned_user ON assigned_user.id = assigned_user_company.user_id
                        LEFT JOIN user_profiles assigned_user_display_profile ON assigned_user_display_profile.user_id = assigned_user.id
            LEFT JOIN users created_user ON created_user.id = task.created_by
            LEFT JOIN units unit ON unit.id = task.unit_id
             AND (unit.company_id = task.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = task.business_id
             AND (business.company_id = task.company_id OR business.company_id IS NULL)
            LEFT JOIN processes process ON process.id = task.process_id
             AND process.company_id = task.company_id
            LEFT JOIN projects project ON project.id = task.project_id
             AND project.company_id = task.company_id
            LEFT JOIN process_task_assignees current_assignment
              ON current_assignment.company_id = task.company_id
             AND current_assignment.task_id = task.id
             AND current_assignment.user_company_id = ?
             AND current_assignment.removed_at IS NULL
             AND NOT EXISTS (
                 SELECT 1
                 FROM process_task_assignees earlier_current_assignment
                 WHERE earlier_current_assignment.company_id = current_assignment.company_id
                   AND earlier_current_assignment.task_id = current_assignment.task_id
                   AND earlier_current_assignment.user_company_id = current_assignment.user_company_id
                   AND earlier_current_assignment.removed_at IS NULL
                   AND earlier_current_assignment.id < current_assignment.id
             )
            LEFT JOIN (
                SELECT team_assignment.company_id, team_assignment.task_id,
                       COUNT(*) AS team_size
                FROM process_task_assignees team_assignment
                WHERE team_assignment.company_id = ?
                  AND team_assignment.removed_at IS NULL
                GROUP BY team_assignment.company_id, team_assignment.task_id
            ) assignment_team
              ON assignment_team.company_id = task.company_id
             AND assignment_team.task_id = task.id
            WHERE task.company_id = ? AND %s AND task.deleted_at IS NULL %s
            %s
            """.formatted(visibilityCondition, statusCondition, extraWhere);
    }

    private String scopeSql(ProcessTaskKioskRow kiosk) {
        var scope = new StringBuilder();
        if (kiosk.unitId() != null) {
            scope.append("AND (task.unit_id = ? OR business.unit_id = ?)\n");
        }
        if (kiosk.businessId() != null) {
            scope.append("AND task.business_id = ?\n");
        }
        return scope.toString();
    }

    private void appendScopeParams(List<Object> params, ProcessTaskKioskRow kiosk) {
        if (kiosk.unitId() != null) {
            params.add(kiosk.unitId());
            params.add(kiosk.unitId());
        }
        if (kiosk.businessId() != null) {
            params.add(kiosk.businessId());
        }
    }

    private Map<String, Object> mapTask(
            ResultSet rs,
            ProcessTaskKioskEmployee employee) throws SQLException {
        var due = rs.getDate("due_date");
        var dueDate = due == null ? null : due.toLocalDate();
        var assignedId = rs.getObject("assigned_user_company_id", Long.class);
        var createdBy = rs.getObject("created_by", Long.class);
        var completedBy = rs.getObject("completed_by_user_company_id", Long.class);
        var assignedToCurrent = rs.getObject("current_assignment_id", Long.class) != null;
        var currentAssignmentRole = assignedToCurrent ? rs.getString("current_assignment_role") : null;
        var currentContributionStatus = assignedToCurrent
            ? rs.getString("current_contribution_status") : null;
        var currentTeamSize = assignedToCurrent ? rs.getInt("current_team_size") : 0;
        var contributionAction = assignedToCurrent
            && currentTeamSize > 1
            && !"lead".equalsIgnoreCase(currentAssignmentRole);
        var contributionReady = contributionAction
            && "ready".equalsIgnoreCase(currentContributionStatus);
        var taskStatus = rs.getString("status");
        var row = new LinkedHashMap<String, Object>();
        row.put("id", rs.getLong("id"));
        row.put("task_id", rs.getLong("id"));
        row.put("task_type", taskType(rs.getObject("project_id", Long.class), rs.getObject("process_id", Long.class)));
        row.put("folio", rs.getString("folio"));
        row.put("title", rs.getString("title"));
        row.put("description", rs.getString("description"));
        row.put("status", taskStatus);
        row.put("priority", fallback(rs.getString("priority"), "medium"));
        row.put("start_date", date(rs, "start_date"));
        row.put("due_date", dueDate == null ? null : dueDate.toString());
        row.put("agenda_date", date(rs, "agenda_date"));
        row.put("agenda_start_time", time(rs, "agenda_start_time"));
        row.put("agenda_end_time", time(rs, "agenda_end_time"));
        row.put("agenda_time_zone", rs.getString("agenda_time_zone"));
        row.put("completed_at", dateTime(rs, "completed_at"));
        row.put("completion_percent", rs.getInt("completion_percent"));
        row.put("notes", rs.getString("notes"));
        row.put("assigned_user_company_id", assignedId);
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
        row.put("completed_by_user_company_id", completedBy);
        row.put("created_at", dateTime(rs, "created_at"));
        row.put("attachments", rs.getInt("attachments"));
        row.put("is_overdue", dueDate != null && dueDate.isBefore(LocalDate.now()));
        row.put("current_assignment_role", currentAssignmentRole);
        row.put("current_contribution_status", currentContributionStatus);
        row.put("assignment_mode", assignedToCurrent
            ? currentTeamSize > 1 ? "team" : "individual" : null);
        row.put("team_size", currentTeamSize);
        row.put("completion_action", contributionAction ? "CONTRIBUTION_READY" : "TASK_COMPLETE");
        row.put("can_complete", assignedToCurrent && !"completed".equals(taskStatus) && !contributionReady);
        row.put("is_assigned_to_current_user", assignedToCurrent);
        row.put("is_created_by_current_user", Objects.equals(createdBy, employee.userId()));
        row.put("is_completed_by_current_user", Objects.equals(completedBy, employee.userCompanyId()));
        return row;
    }

    private List<Map<String, Object>> loadUnits(
            long companyId,
            ProcessTaskAssignmentScopeService.AssignmentScope scope) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        var where = "";
        if (scope.level() != ProcessTaskAssignmentScopeService.ScopeLevel.CORPORATE) {
            if (scope.unitId() == null) return List.of();
            where = "AND unit.id = ?";
            params.add(scope.unitId());
        }
        return jdbcTemplate.query(
            "SELECT unit.id, unit.name FROM units unit"
                + " WHERE (unit.company_id = ? OR unit.company_id IS NULL) " + where
                + " ORDER BY unit.name ASC",
            (rs, rowNum) -> map("id", rs.getLong("id"), "name", fallback(rs.getString("name"), "Unit " + rs.getLong("id"))),
            params.toArray());
    }

    private List<Map<String, Object>> loadBusinesses(
            long companyId,
            ProcessTaskAssignmentScopeService.AssignmentScope scope) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        var where = "";
        if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.UNIT) {
            if (scope.unitId() == null) return List.of();
            where = "AND business.unit_id = ?";
            params.add(scope.unitId());
        } else if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.BUSINESS) {
            if (scope.businessId() == null) return List.of();
            where = "AND business.id = ?";
            params.add(scope.businessId());
        }
        return jdbcTemplate.query(
            """
                SELECT business.id, business.name, business.unit_id, unit.name AS unit_name
                FROM businesses business
                LEFT JOIN units unit ON unit.id = business.unit_id
                 AND (unit.company_id = business.company_id OR unit.company_id IS NULL)
                WHERE (business.company_id = ? OR business.company_id IS NULL) %s
                ORDER BY unit.name ASC, business.name ASC
                """.formatted(where),
            (rs, rowNum) -> map(
                "id", rs.getLong("id"), "name", fallback(rs.getString("name"), "Business " + rs.getLong("id")),
                "unit_id", rs.getObject("unit_id", Long.class), "unit_name", rs.getString("unit_name")),
            params.toArray());
    }

    private List<Map<String, Object>> loadCollaborators(
            long companyId,
            ProcessTaskAssignmentScopeService.AssignmentScope scope) {
        var params = new ArrayList<Object>();
        params.add(companyId);
        var where = "";
        if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.UNIT) {
            if (scope.unitId() == null) return List.of();
            where = "AND (wp.unit_id = ? OR business.unit_id = ?)";
            params.add(scope.unitId());
            params.add(scope.unitId());
        } else if (scope.level() == ProcessTaskAssignmentScopeService.ScopeLevel.BUSINESS) {
            if (scope.businessId() == null) return List.of();
            where = "AND wp.business_id = ?";
            params.add(scope.businessId());
        }
        return jdbcTemplate.query(
            """
                SELECT e.id AS user_company_id, uc.user_id,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       wp.unit_id, unit.name AS unit_name,
                       wp.business_id, business.name AS business_name
                FROM hr_users e
                JOIN user_companies uc ON uc.id = e.id AND uc.company_id = e.company_id
                LEFT JOIN user_work_profiles wp ON wp.company_id = e.company_id AND wp.user_company_id = e.id
                LEFT JOIN units unit ON unit.id = wp.unit_id
                 AND (unit.company_id = e.company_id OR unit.company_id IS NULL)
                LEFT JOIN businesses business ON business.id = wp.business_id
                 AND (business.company_id = e.company_id OR business.company_id IS NULL)
                WHERE e.company_id = ?
                  AND LOWER(COALESCE(e.status, 'active')) IN ('active', 'activo')
                  AND LOWER(COALESCE(uc.status, 'active')) IN ('active', 'activo')
                  %s
                ORDER BY full_name ASC, e.id ASC
                """.formatted(where),
            (rs, rowNum) -> map(
                "user_company_id", rs.getLong("user_company_id"), "user_id", rs.getLong("user_id"),
                "full_name", fallback(rs.getString("full_name"), "User " + rs.getLong("user_company_id")),
                "position_title", rs.getString("position_title"), "department", rs.getString("department"),
                "unit_id", rs.getObject("unit_id", Long.class), "unit_name", rs.getString("unit_name"),
                "business_id", rs.getObject("business_id", Long.class), "business_name", rs.getString("business_name")),
            params.toArray());
    }

    private Map<String, Object> map(Object... entries) {
        var result = new LinkedHashMap<String, Object>();
        for (var index = 0; index < entries.length; index += 2) {
            result.put(String.valueOf(entries[index]), entries[index + 1]);
        }
        return result;
    }

    private Long number(Object value) {
        if (value instanceof Number number) return number.longValue();
        try { return value == null ? null : Long.parseLong(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return null; }
    }

    private String taskType(Long projectId, Long processId) {
        return projectId != null ? "project-task" : processId != null ? "process" : "task";
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String date(ResultSet rs, String column) throws SQLException {
        var value = rs.getDate(column);
        return value == null ? null : value.toLocalDate().toString();
    }

    private String dateTime(ResultSet rs, String column) throws SQLException {
        var value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime().toString();
    }

    private String time(ResultSet rs, String column) throws SQLException {
        var value = rs.getTime(column);
        return value == null ? null : value.toLocalTime().toString();
    }
}
