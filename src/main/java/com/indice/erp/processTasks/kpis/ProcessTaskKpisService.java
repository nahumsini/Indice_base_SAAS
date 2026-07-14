package com.indice.erp.processTasks.kpis;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ProcessTaskKpisService {

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;

    public ProcessTaskKpisService(
            JdbcTemplate jdbcTemplate,
            ProcessTaskAssignmentScopeService assignmentScopeService) {
        this.jdbcTemplate = jdbcTemplate;
        this.assignmentScopeService = assignmentScopeService;
    }

    public Map<String, Object> getDashboard(
            long companyId,
            long userId,
            String fromValue,
            String toValue,
            Boolean includeOverdueBacklog,
            Boolean overdueOnly,
            Long unitId,
            Long businessId,
            Long collaboratorId,
            Long projectId,
            String focus,
            String status,
            String search) {
        var scope = parseScope(
                companyId,
                userId,
                fromValue,
                toValue,
                Boolean.TRUE.equals(includeOverdueBacklog),
                Boolean.TRUE.equals(overdueOnly),
                unitId,
                businessId,
                collaboratorId,
                projectId,
                focus,
                status,
                search);

        var summary = loadSummary(scope);
        var collaborators = loadCollaborators(scope);
        var processes = loadProcesses(scope);
        var projects = loadProjects(scope);
        var units = loadUnits(scope);
        var trend = loadTrend(scope);

        var body = new LinkedHashMap<String, Object>();
        body.put("range", Map.of(
                "from", scope.from().toString(),
                "to", scope.to().toString(),
                "includeOverdueBacklog", scope.includeOverdueBacklog(),
                "overdueOnly", scope.overdueOnly()));
        body.put("filters", Map.of(
                "unitId", nullable(scope.unitId()),
                "businessId", nullable(scope.businessId()),
                "collaboratorId", nullable(scope.collaboratorId()),
                "projectId", nullable(scope.projectId()),
                "focus", scope.focus(),
                "status", scope.statusFilter() == null ? "all" : scope.statusFilter(),
                "search", scope.search()));
        body.put("summary", summary);
        body.put("comparison", buildComparison(scope, summary));
        body.put("cards", buildCards(summary, collaborators, processes, projects));
        body.put("collaborators", collaborators);
        body.put("processes", processes);
        body.put("projects", projects);
        body.put("units", units);
        body.put("trend", trend);
        body.put("generatedAt", LocalDateTime.now().toString());
        return body;
    }

    private KpiScope parseScope(
            long companyId,
            long userId,
            String fromValue,
            String toValue,
            boolean includeOverdueBacklog,
            boolean overdueOnly,
            Long unitId,
            Long businessId,
            Long collaboratorId,
            Long projectId,
            String focus,
            String status,
            String search) {
        var today = LocalDate.now();
        var from = parseDateOrDefault(fromValue, today, "from");
        var to = parseDateOrDefault(toValue, today, "to");

        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be greater than or equal to from.");
        }

        var referenceDate = today;
        if (referenceDate.isBefore(from)) {
            referenceDate = from;
        } else if (referenceDate.isAfter(to)) {
            referenceDate = to;
        }

        return new KpiScope(
                companyId,
                userId,
                from,
                to,
                referenceDate,
                includeOverdueBacklog,
                overdueOnly,
                positiveOrNull(unitId),
                positiveOrNull(businessId),
                positiveOrNull(collaboratorId),
                positiveOrNull(projectId),
                normalizeFocus(focus),
                normalizeStatusFilter(overdueOnly ? "overdue" : status),
                normalizeSearch(search),
                assignmentScopeService.taskVisibilityFilter(companyId, userId, "pt", "business"));
    }

    private Map<String, Object> loadSummary(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var statusExpression = agendaStatusExpression(scope, "pt");
        var agendaDateExpression = agendaDateExpression("pt");
        var referenceDate = sqlDate(scope.referenceDate());
        var sql = """
                SELECT COUNT(*) AS total_task_count,
                       COUNT(*) AS actionable_task_count,
                       SUM(CASE WHEN %1$s = 'pending' THEN 1 ELSE 0 END) AS pending_task_count,
                       SUM(CASE WHEN %1$s = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_task_count,
                       SUM(CASE WHEN %1$s = 'paused' THEN 1 ELSE 0 END) AS paused_task_count,
                       SUM(CASE WHEN %1$s IN ('pending', 'in_progress', 'paused', 'overdue') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE
                             WHEN %1$s IN ('pending', 'in_progress', 'paused')
                             THEN 1 ELSE 0
                           END) AS active_on_track_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE WHEN %1$s IN ('completed', 'audited') THEN 1 ELSE 0 END) AS closed_task_count,
                       0 AS cancelled_task_count,
                       SUM(CASE WHEN pt.assigned_user_company_id IS NULL THEN 1 ELSE 0 END) AS unassigned_task_count,
                       SUM(CASE
                             WHEN pt.assigned_user_company_id IS NULL
                              AND %1$s IN ('pending', 'in_progress', 'paused', 'overdue')
                             THEN 1 ELSE 0
                           END) AS unassigned_open_task_count,
                       SUM(CASE
                             WHEN pt.assigned_user_company_id IS NULL
                              AND %1$s = 'overdue'
                             THEN 1 ELSE 0
                           END) AS unassigned_overdue_task_count,
                       SUM(CASE WHEN %1$s = 'overdue' THEN 1 ELSE 0 END) AS overdue_task_count,
                       SUM(CASE
                             WHEN %1$s = 'overdue'
                              AND DATEDIFF(%3$s, %2$s) BETWEEN 1 AND 3
                             THEN 1 ELSE 0
                           END) AS overdue_1_to_3_day_count,
                       SUM(CASE
                             WHEN %1$s = 'overdue'
                              AND DATEDIFF(%3$s, %2$s) BETWEEN 4 AND 7
                             THEN 1 ELSE 0
                           END) AS overdue_4_to_7_day_count,
                       SUM(CASE
                             WHEN %1$s = 'overdue'
                              AND DATEDIFF(%3$s, %2$s) >= 8
                             THEN 1 ELSE 0
                           END) AS overdue_8_plus_day_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS pending_audit_task_count,
                       SUM(CASE WHEN %1$s = 'audited' THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN %1$s IS NOT NULL
                             THEN COALESCE(pt.completion_percent, CASE WHEN %1$s IN ('completed', 'audited') THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN %1$s = 'audited'
                              AND pt.weighting IS NOT NULL
                             THEN LEAST(5, GREATEST(0, pt.weighting))
                             ELSE NULL
                           END), 1) AS average_weighting,
                       SUM(CASE WHEN COALESCE(attachment_summary.attachments, 0) > 0 THEN 1 ELSE 0 END) AS evidence_task_count,
                       SUM(CASE WHEN pt.process_id IS NOT NULL THEN 1 ELSE 0 END) AS process_task_count,
                       SUM(CASE WHEN pt.project_id IS NOT NULL THEN 1 ELSE 0 END) AS project_task_count
                FROM process_tasks pt
                LEFT JOIN (
                    SELECT company_id, task_id, COUNT(*) AS attachments
                    FROM process_task_attachments
                    WHERE deleted_at IS NULL
                    GROUP BY company_id, task_id
                ) attachment_summary ON attachment_summary.company_id = pt.company_id
                    AND attachment_summary.task_id = pt.id
                LEFT JOIN businesses business ON business.id = pt.business_id
                    AND (business.company_id = pt.company_id OR business.company_id IS NULL)
                WHERE
                """.formatted(statusExpression, agendaDateExpression, referenceDate) + filter.sql();

        return jdbcTemplate.queryForObject(sql, this::mapSummaryRow, filter.params().toArray());
    }

    private List<Map<String, Object>> loadCollaborators(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var statusExpression = agendaStatusExpression(scope, "pt");
        var sql = """
                SELECT pt.assigned_user_company_id AS collaborator_id,
                       COALESCE(
                           MAX(NULLIF(TRIM(hr_user.full_name), '')),
                           MAX(NULLIF(TRIM(user_record.full_name), '')),
                           MAX(NULLIF(TRIM(user_record.email), '')),
                           MAX(NULLIF(TRIM(pt.assigned_name), '')),
                           'Sin responsable'
                       ) AS collaborator_name,
                       COALESCE(MAX(hr_user.unit_id), MAX(pt.unit_id)) AS unit_id,
                       COALESCE(MAX(hr_unit.name), MAX(task_unit.name)) AS unit_name,
                       COALESCE(MAX(hr_user.business_id), MAX(pt.business_id)) AS business_id,
                       COALESCE(MAX(hr_business.name), MAX(task_business.name)) AS business_name,
                       COUNT(*) AS total_task_count,
                       COUNT(*) AS actionable_task_count,
                       SUM(CASE WHEN %1$s = 'pending' THEN 1 ELSE 0 END) AS pending_task_count,
                       SUM(CASE WHEN %1$s = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_task_count,
                       SUM(CASE WHEN %1$s = 'paused' THEN 1 ELSE 0 END) AS paused_task_count,
                       SUM(CASE WHEN %1$s IN ('pending', 'in_progress', 'paused', 'overdue') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE WHEN %1$s IN ('completed', 'audited') THEN 1 ELSE 0 END) AS closed_task_count,
                       SUM(CASE WHEN %1$s = 'overdue' THEN 1 ELSE 0 END) AS overdue_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS pending_audit_task_count,
                       SUM(CASE WHEN %1$s = 'audited' THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN %1$s IS NOT NULL
                             THEN COALESCE(pt.completion_percent, CASE WHEN %1$s IN ('completed', 'audited') THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN %1$s = 'audited'
                              AND pt.weighting IS NOT NULL
                             THEN LEAST(5, GREATEST(0, pt.weighting))
                             ELSE NULL
                           END), 1) AS average_weighting,
                       SUM(CASE WHEN COALESCE(attachment_summary.attachments, 0) > 0 THEN 1 ELSE 0 END) AS evidence_task_count
                FROM process_tasks pt
                LEFT JOIN user_companies assigned_user_company ON assigned_user_company.id = pt.assigned_user_company_id
                    AND assigned_user_company.company_id = pt.company_id
                LEFT JOIN users user_record ON user_record.id = assigned_user_company.user_id
                LEFT JOIN hr_users hr_user ON hr_user.id = pt.assigned_user_company_id
                    AND hr_user.company_id = pt.company_id
                LEFT JOIN units task_unit ON task_unit.id = pt.unit_id
                LEFT JOIN units hr_unit ON hr_unit.id = hr_user.unit_id
                LEFT JOIN businesses task_business ON task_business.id = pt.business_id
                LEFT JOIN businesses hr_business ON hr_business.id = hr_user.business_id
                LEFT JOIN businesses business ON business.id = pt.business_id
                    AND (business.company_id = pt.company_id OR business.company_id IS NULL)
                LEFT JOIN (
                    SELECT company_id, task_id, COUNT(*) AS attachments
                    FROM process_task_attachments
                    WHERE deleted_at IS NULL
                    GROUP BY company_id, task_id
                ) attachment_summary ON attachment_summary.company_id = pt.company_id
                    AND attachment_summary.task_id = pt.id
                WHERE
                """.formatted(statusExpression) + filter.sql() + """
                GROUP BY pt.assigned_user_company_id
                """;

        var rows = jdbcTemplate.query(sql, this::mapCollaboratorRow, filter.params().toArray());
        rows.sort(Comparator
                .comparingInt((Map<String, Object> row) -> (Integer) row.get("productivityScore"))
                .reversed()
                .thenComparing(row -> String.valueOf(row.get("collaboratorName"))));

        for (var index = 0; index < rows.size(); index += 1) {
            rows.get(index).put("rank", index + 1);
        }

        return rows;
    }

    private List<Map<String, Object>> loadProcesses(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var statusExpression = agendaStatusExpression(scope, "pt");
        var sql = """
                SELECT pt.process_id,
                       MAX(process.folio) AS process_folio,
                       MAX(process.title) AS process_title,
                       MAX(process.is_active) AS is_active,
                       MAX(process.next_occurrence_date) AS next_occurrence_date,
                       MAX(process.generated_until_date) AS generated_until_date,
                       MAX(process.evidence_required) AS evidence_required,
                       COUNT(*) AS total_task_count,
                       COUNT(*) AS actionable_task_count,
                       SUM(CASE WHEN %1$s = 'pending' THEN 1 ELSE 0 END) AS pending_task_count,
                       SUM(CASE WHEN %1$s = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_task_count,
                       SUM(CASE WHEN %1$s = 'paused' THEN 1 ELSE 0 END) AS paused_task_count,
                       SUM(CASE WHEN %1$s IN ('pending', 'in_progress', 'paused', 'overdue') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE WHEN %1$s IN ('completed', 'audited') THEN 1 ELSE 0 END) AS closed_task_count,
                       SUM(CASE WHEN %1$s = 'overdue' THEN 1 ELSE 0 END) AS overdue_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS pending_audit_task_count,
                       SUM(CASE WHEN %1$s = 'audited' THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN %1$s IS NOT NULL
                             THEN COALESCE(pt.completion_percent, CASE WHEN %1$s IN ('completed', 'audited') THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN %1$s = 'audited'
                              AND pt.weighting IS NOT NULL
                             THEN LEAST(5, GREATEST(0, pt.weighting))
                             ELSE NULL
                           END), 1) AS average_weighting,
                       SUM(CASE WHEN COALESCE(attachment_summary.attachments, 0) > 0 THEN 1 ELSE 0 END) AS evidence_task_count
                FROM process_tasks pt
                INNER JOIN processes process ON process.id = pt.process_id
                    AND process.company_id = pt.company_id
                    AND process.deleted_at IS NULL
                LEFT JOIN (
                    SELECT company_id, task_id, COUNT(*) AS attachments
                    FROM process_task_attachments
                    WHERE deleted_at IS NULL
                    GROUP BY company_id, task_id
                ) attachment_summary ON attachment_summary.company_id = pt.company_id
                    AND attachment_summary.task_id = pt.id
                LEFT JOIN businesses business ON business.id = pt.business_id
                    AND (business.company_id = pt.company_id OR business.company_id IS NULL)
                WHERE
                """.formatted(statusExpression) + filter.sql() + """
                  AND pt.process_id IS NOT NULL
                GROUP BY pt.process_id
                """;

        var rows = jdbcTemplate.query(sql, this::mapProcessRow, filter.params().toArray());
        rows.sort(Comparator
                .comparingInt((Map<String, Object> row) -> (Integer) row.get("productivityScore"))
                .reversed()
                .thenComparing(row -> String.valueOf(row.get("processTitle"))));
        return rows;
    }

    private List<Map<String, Object>> loadProjects(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var statusExpression = agendaStatusExpression(scope, "pt");
        var sql = """
                SELECT pt.project_id,
                       MAX(project.folio) AS project_folio,
                       MAX(project.name) AS project_name,
                       MAX(project.status) AS project_status,
                       MAX(project.due_date) AS project_due_date,
                       COUNT(*) AS total_task_count,
                       COUNT(*) AS actionable_task_count,
                       SUM(CASE WHEN %1$s = 'pending' THEN 1 ELSE 0 END) AS pending_task_count,
                       SUM(CASE WHEN %1$s = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_task_count,
                       SUM(CASE WHEN %1$s = 'paused' THEN 1 ELSE 0 END) AS paused_task_count,
                       SUM(CASE WHEN %1$s IN ('pending', 'in_progress', 'paused', 'overdue') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE WHEN %1$s IN ('completed', 'audited') THEN 1 ELSE 0 END) AS closed_task_count,
                       SUM(CASE WHEN %1$s = 'overdue' THEN 1 ELSE 0 END) AS overdue_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS pending_audit_task_count,
                       SUM(CASE WHEN %1$s = 'audited' THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN %1$s IS NOT NULL
                             THEN COALESCE(pt.completion_percent, CASE WHEN %1$s IN ('completed', 'audited') THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN %1$s = 'audited'
                              AND pt.weighting IS NOT NULL
                             THEN LEAST(5, GREATEST(0, pt.weighting))
                             ELSE NULL
                           END), 1) AS average_weighting,
                       SUM(CASE WHEN COALESCE(attachment_summary.attachments, 0) > 0 THEN 1 ELSE 0 END) AS evidence_task_count
                FROM process_tasks pt
                INNER JOIN projects project ON project.id = pt.project_id
                    AND project.company_id = pt.company_id
                    AND project.deleted_at IS NULL
                LEFT JOIN (
                    SELECT company_id, task_id, COUNT(*) AS attachments
                    FROM process_task_attachments
                    WHERE deleted_at IS NULL
                    GROUP BY company_id, task_id
                ) attachment_summary ON attachment_summary.company_id = pt.company_id
                    AND attachment_summary.task_id = pt.id
                LEFT JOIN businesses business ON business.id = pt.business_id
                    AND (business.company_id = pt.company_id OR business.company_id IS NULL)
                WHERE
                """.formatted(statusExpression) + filter.sql() + """
                  AND pt.project_id IS NOT NULL
                GROUP BY pt.project_id
                """;

        var rows = jdbcTemplate.query(sql, this::mapProjectRow, filter.params().toArray());
        rows.sort(Comparator
                .comparingInt((Map<String, Object> row) -> (Integer) row.get("healthScore"))
                .reversed()
                .thenComparing(row -> String.valueOf(row.get("projectName"))));
        return rows;
    }

    private List<Map<String, Object>> loadUnits(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var statusExpression = agendaStatusExpression(scope, "pt");
        var sql = """
                SELECT pt.unit_id,
                       COALESCE(MAX(task_unit.name), 'Sin unidad') AS unit_name,
                       COUNT(*) AS total_task_count,
                       COUNT(*) AS actionable_task_count,
                       SUM(CASE WHEN %1$s = 'pending' THEN 1 ELSE 0 END) AS pending_task_count,
                       SUM(CASE WHEN %1$s = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_task_count,
                       SUM(CASE WHEN %1$s = 'paused' THEN 1 ELSE 0 END) AS paused_task_count,
                       SUM(CASE WHEN %1$s IN ('pending', 'in_progress', 'paused', 'overdue') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE WHEN %1$s IN ('completed', 'audited') THEN 1 ELSE 0 END) AS closed_task_count,
                       SUM(CASE WHEN %1$s = 'overdue' THEN 1 ELSE 0 END) AS overdue_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS pending_audit_task_count,
                       SUM(CASE WHEN %1$s = 'audited' THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(COALESCE(pt.completion_percent, CASE WHEN %1$s IN ('completed', 'audited') THEN 100 ELSE 0 END)), 0) AS average_completion,
                       ROUND(AVG(CASE WHEN %1$s = 'audited' AND pt.weighting IS NOT NULL THEN LEAST(5, GREATEST(0, pt.weighting)) ELSE NULL END), 1) AS average_weighting,
                       SUM(CASE WHEN COALESCE(attachment_summary.attachments, 0) > 0 THEN 1 ELSE 0 END) AS evidence_task_count
                FROM process_tasks pt
                LEFT JOIN units task_unit ON task_unit.id = pt.unit_id
                LEFT JOIN businesses business ON business.id = pt.business_id
                    AND (business.company_id = pt.company_id OR business.company_id IS NULL)
                LEFT JOIN (
                    SELECT company_id, task_id, COUNT(*) AS attachments
                    FROM process_task_attachments
                    WHERE deleted_at IS NULL
                    GROUP BY company_id, task_id
                ) attachment_summary ON attachment_summary.company_id = pt.company_id
                    AND attachment_summary.task_id = pt.id
                WHERE
                """.formatted(statusExpression) + filter.sql() + """
                GROUP BY pt.unit_id
                """;

        var rows = jdbcTemplate.query(sql, (rs, rowNum) -> {
            var row = mapAggregateBase(rs);
            row.put("unitId", nullable(rs.getObject("unit_id", Long.class)));
            row.put("unitName", fallback(rs.getString("unit_name"), "Sin unidad"));
            addComputedScores(row);
            row.put("status", statusFromScore((Integer) row.get("productivityScore")));
            return row;
        }, filter.params().toArray());
        rows.sort(Comparator
                .comparingInt((Map<String, Object> row) -> (Integer) row.get("productivityScore"))
                .reversed()
                .thenComparing(row -> String.valueOf(row.get("unitName"))));
        return rows;
    }

    private List<Map<String, Object>> loadTrend(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var statusExpression = agendaStatusExpression(scope, "pt");
        var eventDateExpression = "COALESCE(%s, DATE(pt.completed_at), DATE(pt.audited_at))"
                .formatted(agendaDateExpression("pt"));
        var sql = """
                SELECT %2$s AS date,
                       SUM(CASE WHEN %1$s = 'pending' THEN 1 ELSE 0 END) AS total_task_count,
                       SUM(CASE WHEN %1$s = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE WHEN %1$s = 'overdue' THEN 1 ELSE 0 END) AS overdue_task_count,
                       SUM(CASE WHEN %1$s = 'audited' THEN 1 ELSE 0 END) AS audited_task_count
                FROM process_tasks pt
                LEFT JOIN businesses business ON business.id = pt.business_id
                    AND (business.company_id = pt.company_id OR business.company_id IS NULL)
                WHERE
                """.formatted(statusExpression, eventDateExpression) + filter.sql() + """
                  AND %s IS NOT NULL
                GROUP BY %s
                ORDER BY %s ASC
                """;
        sql = sql.formatted(eventDateExpression, eventDateExpression, eventDateExpression);

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            var row = new LinkedHashMap<String, Object>();
            row.put("date", rs.getDate("date").toLocalDate().toString());
            row.put("totalTasks", intValue(rs, "total_task_count"));
            row.put("completedTasks", intValue(rs, "completed_task_count"));
            row.put("overdueTasks", intValue(rs, "overdue_task_count"));
            row.put("auditedTasks", intValue(rs, "audited_task_count"));
            return row;
        }, filter.params().toArray());
    }

    private Map<String, Object> mapSummaryRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapAggregateBase(rs);
        addComputedScores(row);
        row.put("insight", buildInsight(row));
        return row;
    }

    private Map<String, Object> buildComparison(KpiScope scope, Map<String, Object> summary) {
        var comparison = new LinkedHashMap<String, Object>();
        var openEnded = scope.from().getYear() <= 1900 || scope.to().getYear() >= 2999;
        comparison.put("available", !scope.overdueOnly() && !openEnded);

        if (scope.overdueOnly() || openEnded) {
            comparison.put("from", null);
            comparison.put("to", null);
            comparison.put("productivityScore", 0);
            comparison.put("productivityDelta", 0);
            comparison.put("completionRate", 0);
            comparison.put("completionDelta", 0);
            comparison.put("overdueTasks", 0);
            comparison.put("overdueDelta", 0);
            comparison.put("totalTasks", 0);
            comparison.put("totalDelta", 0);
            return comparison;
        }

        LocalDate previousFrom;
        LocalDate previousTo;
        var currentMonth = YearMonth.from(scope.from());
        var isFullCalendarMonth = scope.from().equals(currentMonth.atDay(1))
                && scope.to().equals(currentMonth.atEndOfMonth());
        if (isFullCalendarMonth) {
            var previousMonth = currentMonth.minusMonths(1);
            previousFrom = previousMonth.atDay(1);
            previousTo = previousMonth.atEndOfMonth();
        } else {
            var days = ChronoUnit.DAYS.between(scope.from(), scope.to()) + 1;
            previousTo = scope.from().minusDays(1);
            previousFrom = previousTo.minusDays(Math.max(0, days - 1));
        }
        var previousSummary = loadSummary(scope.withRange(previousFrom, previousTo));

        comparison.put("from", previousFrom.toString());
        comparison.put("to", previousTo.toString());
        comparison.put("productivityScore", intFrom(summary, "productivityScore"));
        comparison.put("productivityDelta", intFrom(summary, "productivityScore") - intFrom(previousSummary, "productivityScore"));
        comparison.put("completionRate", intFrom(summary, "completionRate"));
        comparison.put("completionDelta", intFrom(summary, "completionRate") - intFrom(previousSummary, "completionRate"));
        comparison.put("overdueTasks", intFrom(summary, "overdueTasks"));
        comparison.put("overdueDelta", intFrom(summary, "overdueTasks") - intFrom(previousSummary, "overdueTasks"));
        comparison.put("totalTasks", intFrom(summary, "totalTasks"));
        comparison.put("totalDelta", intFrom(summary, "totalTasks") - intFrom(previousSummary, "totalTasks"));
        return comparison;
    }

    private Map<String, Object> mapCollaboratorRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapAggregateBase(rs);
        row.put("collaboratorId", nullable(rs.getObject("collaborator_id", Long.class)));
        row.put("collaboratorName", fallback(rs.getString("collaborator_name"), "Sin responsable"));
        row.put("unitId", nullable(rs.getObject("unit_id", Long.class)));
        row.put("unitName", rs.getString("unit_name"));
        row.put("businessId", nullable(rs.getObject("business_id", Long.class)));
        row.put("businessName", rs.getString("business_name"));
        addComputedScores(row);
        row.put("status", statusFromScore((Integer) row.get("productivityScore")));
        return row;
    }

    private Map<String, Object> mapProcessRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapAggregateBase(rs);
        row.put("processId", rs.getObject("process_id", Long.class));
        row.put("processFolio", rs.getString("process_folio"));
        row.put("processTitle", fallback(rs.getString("process_title"), "Proceso sin nombre"));
        row.put("isActive", rs.getBoolean("is_active"));
        row.put("nextOccurrenceDate", dateString(rs, "next_occurrence_date"));
        row.put("generatedUntilDate", dateString(rs, "generated_until_date"));
        row.put("evidenceRequired", rs.getBoolean("evidence_required"));
        addComputedScores(row);
        row.put("status", statusFromScore((Integer) row.get("productivityScore")));
        return row;
    }

    private Map<String, Object> mapProjectRow(ResultSet rs, int rowNum) throws SQLException {
        var row = mapAggregateBase(rs);
        row.put("projectId", rs.getObject("project_id", Long.class));
        row.put("projectFolio", rs.getString("project_folio"));
        row.put("projectName", fallback(rs.getString("project_name"), "Proyecto sin nombre"));
        row.put("projectStatus", rs.getString("project_status"));
        row.put("dueDate", dateString(rs, "project_due_date"));
        addComputedScores(row);
        row.put("healthScore", row.get("productivityScore"));
        row.put("status", statusFromScore((Integer) row.get("healthScore")));
        return row;
    }

    private Map<String, Object> mapAggregateBase(ResultSet rs) throws SQLException {
        var totalTasks = intValue(rs, "total_task_count");
        var actionableTasks = intValue(rs, "actionable_task_count");
        var pendingTasks = intValue(rs, "pending_task_count");
        var inProgressTasks = intValue(rs, "in_progress_task_count");
        var pausedTasks = intValue(rs, "paused_task_count");
        var openTasks = intValue(rs, "open_task_count");
        var completedTasks = intValue(rs, "completed_task_count");
        var closedTasks = intValue(rs, "closed_task_count");
        var overdueTasks = intValue(rs, "overdue_task_count");
        var pendingAuditTasks = intValue(rs, "pending_audit_task_count");
        var auditedTasks = intValue(rs, "audited_task_count");
        var averageCompletion = clampPercent(doubleValue(rs, "average_completion"));
        var averageWeighting = nullableDouble(rs, "average_weighting");
        var evidenceTasks = intValue(rs, "evidence_task_count");

        var row = new LinkedHashMap<String, Object>();
        row.put("totalTasks", totalTasks);
        row.put("actionableTasks", actionableTasks);
        row.put("pendingTasks", pendingTasks);
        row.put("inProgressTasks", inProgressTasks);
        row.put("pausedTasks", pausedTasks);
        row.put("openTasks", openTasks);
        row.put("completedTasks", completedTasks);
        row.put("closedTasks", closedTasks);
        row.put("overdueTasks", overdueTasks);
        row.put("pendingAuditTasks", pendingAuditTasks);
        row.put("auditedTasks", auditedTasks);
        row.put("averageCompletion", averageCompletion);
        row.put("averageWeighting", averageWeighting);
        row.put("evidenceTasks", evidenceTasks);

        if (hasColumn(rs, "active_on_track_task_count")) {
            row.put("activeOnTrackTasks", intValue(rs, "active_on_track_task_count"));
        }
        if (hasColumn(rs, "cancelled_task_count")) {
            row.put("cancelledTasks", intValue(rs, "cancelled_task_count"));
        }
        if (hasColumn(rs, "unassigned_task_count")) {
            row.put("unassignedTasks", intValue(rs, "unassigned_task_count"));
        }
        if (hasColumn(rs, "unassigned_open_task_count")) {
            row.put("unassignedOpenTasks", intValue(rs, "unassigned_open_task_count"));
        }
        if (hasColumn(rs, "unassigned_overdue_task_count")) {
            row.put("unassignedOverdueTasks", intValue(rs, "unassigned_overdue_task_count"));
        }
        if (hasColumn(rs, "overdue_1_to_3_day_count")) {
            row.put("overdue1To3Days", intValue(rs, "overdue_1_to_3_day_count"));
        }
        if (hasColumn(rs, "overdue_4_to_7_day_count")) {
            row.put("overdue4To7Days", intValue(rs, "overdue_4_to_7_day_count"));
        }
        if (hasColumn(rs, "overdue_8_plus_day_count")) {
            row.put("overdue8PlusDays", intValue(rs, "overdue_8_plus_day_count"));
        }
        if (hasColumn(rs, "process_task_count")) {
            row.put("processTasks", intValue(rs, "process_task_count"));
        }
        if (hasColumn(rs, "project_task_count")) {
            row.put("projectTasks", intValue(rs, "project_task_count"));
        }

        return row;
    }

    private void addComputedScores(Map<String, Object> row) {
        var totalTasks = (Integer) row.getOrDefault("totalTasks", 0);
        var actionableTasks = (Integer) row.getOrDefault("actionableTasks", 0);
        var completedTasks = (Integer) row.getOrDefault("completedTasks", 0);
        var closedTasks = (Integer) row.getOrDefault("closedTasks", completedTasks);
        var overdueTasks = (Integer) row.getOrDefault("overdueTasks", 0);
        var auditedTasks = (Integer) row.getOrDefault("auditedTasks", 0);
        var evidenceTasks = (Integer) row.getOrDefault("evidenceTasks", 0);
        var averageCompletion = ((Number) row.getOrDefault("averageCompletion", 0)).doubleValue();
        var averageWeighting = (Double) row.get("averageWeighting");

        var completionRate = percent(closedTasks, actionableTasks);
        var timelinessRate = actionableTasks > 0
                ? percent(Math.max(0, actionableTasks - overdueTasks), actionableTasks)
                : 0;
        var auditRate = percent(auditedTasks, closedTasks);
        var qualityScore = averageWeighting != null ? clampPercent(averageWeighting * 20) : auditRate;
        var evidenceRate = percent(evidenceTasks, totalTasks);
        var productivityScore = actionableTasks > 0
                ? clampPercent(
                        averageCompletion * 0.30
                                + completionRate * 0.25
                                + timelinessRate * 0.20
                                + auditRate * 0.10
                                + qualityScore * 0.10
                                + evidenceRate * 0.05)
                : 0;

        row.put("completionRate", completionRate);
        row.put("timelinessRate", timelinessRate);
        row.put("auditRate", auditRate);
        row.put("qualityScore", qualityScore);
        row.put("evidenceRate", evidenceRate);
        row.put("productivityScore", productivityScore);
    }

    private List<Map<String, Object>> buildCards(
            Map<String, Object> summary,
            List<Map<String, Object>> collaborators,
            List<Map<String, Object>> processes,
            List<Map<String, Object>> projects) {
        var cards = new ArrayList<Map<String, Object>>();
        cards.add(card(
                "volume",
                "Tareas del periodo",
                String.valueOf(summary.get("totalTasks")),
                summary.get("openTasks") + " abiertas",
                "Volumen de trabajo visible dentro del alcance seleccionado.",
                intFrom(summary, "totalTasks") > 0 ? "healthy" : "watch"));
        cards.add(card(
                "closed",
                "Tareas cerradas",
                String.valueOf(summary.get("closedTasks")),
                summary.get("completionRate") + "% de cumplimiento",
                "Tareas completadas o auditadas dentro del periodo.",
                statusFromScore((Integer) summary.get("completionRate"))));
        cards.add(card(
                "open",
                "Tareas abiertas",
                String.valueOf(summary.get("openTasks")),
                summary.get("closedTasks") + " cerradas",
                "Carga pendiente, en curso, pausada o vencida que requiere seguimiento.",
                inverseRatioStatus(intFrom(summary, "openTasks"), intFrom(summary, "actionableTasks"))));
        cards.add(card(
                "overdue",
                "Tareas vencidas",
                String.valueOf(summary.get("overdueTasks")),
                summary.get("overdue8PlusDays") + " con 8+ dias",
                "Compromisos que superaron su fecha de entrega sin cierre oportuno.",
                riskCountStatus(intFrom(summary, "overdueTasks"), intFrom(summary, "actionableTasks"))));
        cards.add(card(
                "timeliness",
                "Puntualidad",
                summary.get("timelinessRate") + "%",
                summary.get("overdueTasks") + " vencidas",
                "Disciplina de entrega contra la fecha de vencimiento.",
                statusFromScore((Integer) summary.get("timelinessRate"))));
        cards.add(card(
                "audit",
                "Auditoria completa",
                summary.get("auditRate") + "%",
                summary.get("pendingAuditTasks") + " por auditar",
                "Cierres revisados por jefatura o auditor responsable.",
                statusFromScore((Integer) summary.get("auditRate"))));
        cards.add(card(
                "evidence",
                "Evidencia completa",
                summary.get("evidenceRate") + "%",
                summary.get("evidenceTasks") + " con archivos",
                "Cobertura documental de las tareas incluidas en el alcance.",
                statusFromScore((Integer) summary.get("evidenceRate"))));
        cards.add(card(
                "productivity",
                "Salud operativa",
                summary.get("productivityScore") + "/100",
                "Meta 85/100",
                "Score combinado de avance, cierre, puntualidad, auditoria, calidad y evidencia.",
                statusFromScore((Integer) summary.get("productivityScore"))));
        return cards;
    }

    private String inverseRatioStatus(int value, int total) {
        if (total <= 0) {
            return "watch";
        }
        var ratio = (value * 100.0) / total;
        if (ratio <= 25) {
            return "healthy";
        }
        return ratio <= 50 ? "watch" : "critical";
    }

    private String riskCountStatus(int value, int total) {
        if (value <= 0) {
            return "healthy";
        }
        if (total <= 0) {
            return "critical";
        }
        return (value * 100.0) / total <= 10 ? "watch" : "critical";
    }

    private Map<String, Object> card(
            String id,
            String title,
            String value,
            String target,
            String description,
            String status) {
        var card = new LinkedHashMap<String, Object>();
        card.put("id", id);
        card.put("title", title);
        card.put("value", value);
        card.put("target", target);
        card.put("description", description);
        card.put("status", status);
        return card;
    }

    private String buildInsight(Map<String, Object> summary) {
        var totalTasks = (Integer) summary.get("totalTasks");
        var overdueTasks = (Integer) summary.get("overdueTasks");
        var pendingAuditTasks = (Integer) summary.get("pendingAuditTasks");
        var productivityScore = (Integer) summary.get("productivityScore");
        var averageCompletion = (Integer) summary.get("averageCompletion");

        if (totalTasks == 0) {
            return "No hay tareas en el filtro actual. Ajusta periodo, unidad, negocio o colaborador para evaluar productividad.";
        }

        if (overdueTasks > 0) {
            return overdueTasks + " tareas vencidas estan presionando la productividad; el avance promedio es "
                    + averageCompletion + "% y quedan " + pendingAuditTasks + " cierres por auditar.";
        }

        if (pendingAuditTasks > 0) {
            return "La operacion no tiene vencidas en el filtro, pero faltan "
                    + pendingAuditTasks + " auditorias para cerrar el ciclo completo.";
        }

        if (productivityScore >= 85) {
            return "El filtro se ve sano: productividad estimada de " + productivityScore
                    + "% con auditoria y calidad controladas.";
        }

        return "La productividad estimada es " + productivityScore
                + "%. Conviene revisar avance, cierres y evidencia para subir el desempeno.";
    }

    private SqlFragment taskFilter(KpiScope scope, String alias) {
        var params = new ArrayList<Object>();
        var sql = new StringBuilder();
        var agendaDate = agendaDateExpression(alias);
        var statusExpression = agendaStatusExpression(scope, alias);
        sql.append(alias).append(".company_id = ?")
                .append(" AND ").append(alias).append(".deleted_at IS NULL")
                .append(" AND (").append(alias).append(".created_at IS NULL OR DATE(")
                .append(alias).append(".created_at) <= ").append(sqlDate(scope.to())).append(")");
        params.add(scope.companyId());

        sql.append(" AND (")
                .append(agendaDate).append(" BETWEEN ").append(sqlDate(scope.from())).append(" AND ").append(sqlDate(scope.to()))
                .append(" OR (")
                .append(agendaDate).append(" <= ").append(sqlDate(scope.to()))
                .append(" AND (").append(alias).append(".completed_at IS NULL OR DATE(").append(alias).append(".completed_at) >= ").append(sqlDate(scope.from())).append(")")
                .append(" AND (").append(alias).append(".cancelled_at IS NULL OR DATE(").append(alias).append(".cancelled_at) >= ").append(sqlDate(scope.from())).append(")")
                .append(")")
                .append(" OR DATE(").append(alias).append(".completed_at) BETWEEN ").append(sqlDate(scope.from())).append(" AND ").append(sqlDate(scope.to()))
                .append(" OR DATE(").append(alias).append(".cancelled_at) BETWEEN ").append(sqlDate(scope.from())).append(" AND ").append(sqlDate(scope.to()))
                .append(" OR DATE(").append(alias).append(".audited_at) BETWEEN ").append(sqlDate(scope.from())).append(" AND ").append(sqlDate(scope.to()))
                .append(" OR (").append(alias).append(".status IN ('in_progress', 'paused') AND DATE(").append(alias).append(".created_at) <= ").append(sqlDate(scope.to())).append(")")
                .append(" OR (").append(alias).append(".status = 'completed' AND ").append(alias).append(".completed_at IS NULL)")
                .append(")");

        if (scope.unitId() != null) {
            sql.append(" AND ").append(alias).append(".unit_id = ?");
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            sql.append(" AND ").append(alias).append(".business_id = ?");
            params.add(scope.businessId());
        }
        if (scope.collaboratorId() != null) {
            sql.append(" AND (")
                    .append(alias).append(".assigned_user_company_id = ?")
                    .append(" OR ").append(alias).append(".created_by = (")
                    .append("SELECT uc.user_id FROM user_companies uc WHERE uc.company_id = ")
                    .append(alias).append(".company_id AND uc.id = ? LIMIT 1)")
                    .append(")");
            params.add(scope.collaboratorId());
            params.add(scope.collaboratorId());
        }
        if (scope.projectId() != null) {
            sql.append(" AND ").append(alias).append(".project_id = ?");
            params.add(scope.projectId());
        }
        if (!scope.search().isBlank()) {
            var searchPattern = "%" + scope.search() + "%";
            sql.append(" AND (")
                    .append("LOWER(CONCAT_WS(' ', COALESCE(").append(alias).append(".folio, ''), COALESCE(")
                    .append(alias).append(".title, ''), COALESCE(").append(alias).append(".description, ''), COALESCE(")
                    .append(alias).append(".assigned_name, ''))) LIKE ?")
                    .append(" OR EXISTS (SELECT 1 FROM processes search_process WHERE search_process.id = ")
                    .append(alias).append(".process_id AND search_process.company_id = ").append(alias)
                    .append(".company_id AND LOWER(CONCAT_WS(' ', COALESCE(search_process.folio, ''), COALESCE(search_process.title, ''))) LIKE ?)")
                    .append(" OR EXISTS (SELECT 1 FROM projects search_project WHERE search_project.id = ")
                    .append(alias).append(".project_id AND search_project.company_id = ").append(alias)
                    .append(".company_id AND LOWER(CONCAT_WS(' ', COALESCE(search_project.folio, ''), COALESCE(search_project.name, ''))) LIKE ?)")
                    .append(" OR EXISTS (SELECT 1 FROM user_companies search_uc INNER JOIN users search_user ON search_user.id = search_uc.user_id WHERE search_uc.id = ")
                    .append(alias).append(".assigned_user_company_id AND search_uc.company_id = ").append(alias)
                    .append(".company_id AND LOWER(CONCAT_WS(' ', COALESCE(search_user.full_name, ''), COALESCE(search_user.email, ''))) LIKE ?))");
            params.add(searchPattern);
            params.add(searchPattern);
            params.add(searchPattern);
            params.add(searchPattern);
        }
        appendFocusFilter(sql, params, scope, alias);
        sql.append(" AND ").append(statusExpression).append(" IS NOT NULL");
        if (scope.statusFilter() != null) {
            sql.append(" AND ").append(statusExpression).append(" = '").append(scope.statusFilter()).append("'");
        }
        sql.append(" AND ").append(scope.visibility().condition());
        params.addAll(scope.visibility().params());

        return new SqlFragment(sql.append(System.lineSeparator()).toString(), params);
    }

    private String agendaDateExpression(String alias) {
        return "COALESCE(%s.agenda_date, %s.due_date)".formatted(alias, alias);
    }

    private String agendaStatusExpression(KpiScope scope, String alias) {
        var from = sqlDate(scope.from());
        var to = sqlDate(scope.to());
        var reference = sqlDate(scope.referenceDate());
        var agendaDate = agendaDateExpression(alias);

        return """
                CASE
                  WHEN DATE(%1$s.audited_at) BETWEEN %2$s AND %3$s THEN 'audited'
                  WHEN DATE(%1$s.completed_at) BETWEEN %2$s AND %3$s THEN
                    CASE
                      WHEN COALESCE(%1$s.audited, 0) = 1
                       AND %1$s.audited_at IS NOT NULL
                       AND DATE(%1$s.audited_at) <= %3$s
                      THEN 'audited'
                      ELSE 'completed'
                    END
                  WHEN %1$s.completed_at IS NOT NULL
                   AND DATE(%1$s.completed_at) < %2$s THEN NULL
                  WHEN %1$s.cancelled_at IS NOT NULL
                   AND DATE(%1$s.cancelled_at) <= %3$s THEN NULL
                  WHEN %1$s.status = 'completed'
                   AND %1$s.completed_at IS NULL THEN
                    CASE WHEN COALESCE(%1$s.audited, 0) = 1 THEN 'audited' ELSE 'completed' END
                  WHEN %1$s.status IN ('in_progress', 'paused') THEN %1$s.status
                  WHEN %4$s IS NOT NULL
                   AND %4$s < %2$s
                   AND (%1$s.completed_at IS NULL OR DATE(%1$s.completed_at) >= %2$s)
                  THEN 'overdue'
                  WHEN %4$s BETWEEN %2$s AND %3$s THEN
                    CASE
                      WHEN %4$s < %5$s
                       AND (%1$s.completed_at IS NULL OR DATE(%1$s.completed_at) > %5$s)
                      THEN 'overdue'
                      ELSE 'pending'
                    END
                  ELSE NULL
                END
                """.formatted(alias, from, to, agendaDate, reference);
    }

    private void appendFocusFilter(StringBuilder sql, List<Object> params, KpiScope scope, String alias) {
        if ("team".equals(scope.focus())) {
            return;
        }

        if ("delegated".equals(scope.focus())) {
            sql.append(" AND ")
                    .append(alias).append(".created_by = ?")
                    .append(" AND ").append(alias).append(".assigned_user_company_id IS NOT NULL")
                    .append(" AND NOT EXISTS (")
                    .append("SELECT 1 FROM user_companies focus_uc ")
                    .append("WHERE focus_uc.company_id = ").append(alias).append(".company_id ")
                    .append("AND focus_uc.id = ").append(alias).append(".assigned_user_company_id ")
                    .append("AND focus_uc.user_id = ?)");
            params.add(scope.userId());
            params.add(scope.userId());
            return;
        }

        sql.append(" AND (")
                .append("EXISTS (SELECT 1 FROM user_companies focus_assigned_uc ")
                .append("WHERE focus_assigned_uc.company_id = ").append(alias).append(".company_id ")
                .append("AND focus_assigned_uc.id = ").append(alias).append(".assigned_user_company_id ")
                .append("AND focus_assigned_uc.user_id = ?)")
                .append(" OR (").append(alias).append(".created_by = ? AND (")
                .append(alias).append(".assigned_user_company_id IS NULL")
                .append(" OR EXISTS (SELECT 1 FROM user_companies focus_created_uc ")
                .append("WHERE focus_created_uc.company_id = ").append(alias).append(".company_id ")
                .append("AND focus_created_uc.id = ").append(alias).append(".assigned_user_company_id ")
                .append("AND focus_created_uc.user_id = ?))))");
        params.add(scope.userId());
        params.add(scope.userId());
        params.add(scope.userId());
    }

    private String normalizeFocus(String value) {
        if ("delegated".equals(value) || "team".equals(value)) {
            return value;
        }
        return "mine";
    }

    private String normalizeStatusFilter(String value) {
        if (value == null || value.isBlank() || "all".equals(value)) {
            return null;
        }

        return switch (value) {
            case "pending", "in_progress", "paused", "completed", "overdue", "audited" -> value;
            case "pending_audit" -> "completed";
            default -> throw new IllegalArgumentException("status must be a valid agenda status.");
        };
    }

    private String normalizeSearch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        var normalized = value.trim().replaceAll("\\s+", " ").toLowerCase();
        return normalized.length() > 120 ? normalized.substring(0, 120) : normalized;
    }

    private String sqlDate(LocalDate value) {
        return "'" + value + "'";
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

    private int intValue(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column);
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    private double doubleValue(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0;
    }

    private Double nullableDouble(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column);
        if (value instanceof Number number) {
            return Math.round(number.doubleValue() * 10.0) / 10.0;
        }
        return null;
    }

    private boolean hasColumn(ResultSet rs, String column) throws SQLException {
        var metadata = rs.getMetaData();
        for (var index = 1; index <= metadata.getColumnCount(); index += 1) {
            if (metadata.getColumnLabel(index).equalsIgnoreCase(column)) {
                return true;
            }
        }
        return false;
    }

    private String dateString(ResultSet rs, String column) throws SQLException {
        var value = rs.getDate(column);
        return value != null ? value.toLocalDate().toString() : null;
    }

    private int percent(int numerator, int denominator) {
        if (denominator <= 0) {
            return 0;
        }
        return clampPercent((numerator * 100.0) / denominator);
    }

    private int clampPercent(double value) {
        return (int) Math.round(Math.min(100, Math.max(0, value)));
    }

    private String statusFromScore(int score) {
        if (score >= 85) {
            return "healthy";
        }
        if (score >= 65) {
            return "watch";
        }
        return "critical";
    }

    private Long positiveOrNull(Long value) {
        return value != null && value > 0 ? value : null;
    }

    private int intFrom(Map<String, Object> row, String key) {
        var value = row.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    private Object nullable(Object value) {
        return value == null ? "" : value;
    }

    private String fallback(String value, String fallbackValue) {
        return value == null || value.isBlank() ? fallbackValue : value;
    }

    private record KpiScope(
            long companyId,
            long userId,
            LocalDate from,
            LocalDate to,
            LocalDate referenceDate,
            boolean includeOverdueBacklog,
            boolean overdueOnly,
            Long unitId,
            Long businessId,
            Long collaboratorId,
            Long projectId,
            String focus,
            String statusFilter,
            String search,
            ProcessTaskAssignmentScopeService.TaskVisibilityFilter visibility) {

        KpiScope withRange(LocalDate nextFrom, LocalDate nextTo) {
            var nextReferenceDate = referenceDate;
            if (nextReferenceDate.isBefore(nextFrom)) {
                nextReferenceDate = nextFrom;
            } else if (nextReferenceDate.isAfter(nextTo)) {
                nextReferenceDate = nextTo;
            }

            return new KpiScope(
                    companyId,
                    userId,
                    nextFrom,
                    nextTo,
                    nextReferenceDate,
                    includeOverdueBacklog,
                    overdueOnly,
                    unitId,
                    businessId,
                    collaboratorId,
                    projectId,
                    focus,
                    statusFilter,
                    search,
                    visibility);
        }
    }

    private record SqlFragment(String sql, List<Object> params) {
    }
}
