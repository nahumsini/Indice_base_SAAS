package com.indice.erp.processTasks.kpis;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
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

    public ProcessTaskKpisService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getDashboard(
            long companyId,
            String fromValue,
            String toValue,
            Boolean includeOverdueBacklog,
            Boolean overdueOnly,
            Long unitId,
            Long businessId,
            Long collaboratorId) {
        var scope = parseScope(
                companyId,
                fromValue,
                toValue,
                Boolean.TRUE.equals(includeOverdueBacklog),
                Boolean.TRUE.equals(overdueOnly),
                unitId,
                businessId,
                collaboratorId);

        var summary = loadSummary(scope);
        var collaborators = loadCollaborators(scope);
        var processes = loadProcesses(scope);
        var projects = loadProjects(scope);
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
                "collaboratorId", nullable(scope.collaboratorId())));
        body.put("summary", summary);
        body.put("cards", buildCards(summary, collaborators, processes, projects));
        body.put("collaborators", collaborators);
        body.put("processes", processes);
        body.put("projects", projects);
        body.put("trend", trend);
        body.put("generatedAt", LocalDateTime.now().toString());
        return body;
    }

    private KpiScope parseScope(
            long companyId,
            String fromValue,
            String toValue,
            boolean includeOverdueBacklog,
            boolean overdueOnly,
            Long unitId,
            Long businessId,
            Long collaboratorId) {
        var today = LocalDate.now();
        var from = parseDateOrDefault(fromValue, today, "from");
        var to = parseDateOrDefault(toValue, today, "to");

        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be greater than or equal to from.");
        }

        return new KpiScope(
                companyId,
                from,
                to,
                includeOverdueBacklog,
                overdueOnly,
                positiveOrNull(unitId),
                positiveOrNull(businessId),
                positiveOrNull(collaboratorId));
    }

    private Map<String, Object> loadSummary(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var sql = """
                SELECT COUNT(*) AS total_task_count,
                       SUM(CASE WHEN pt.status <> 'cancelled' THEN 1 ELSE 0 END) AS actionable_task_count,
                       SUM(CASE WHEN pt.status IN ('pending', 'in_progress', 'paused') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE
                             WHEN pt.status IN ('pending', 'in_progress', 'paused')
                              AND pt.due_date >= CURRENT_DATE
                             THEN 1 ELSE 0
                           END) AS active_on_track_task_count,
                       SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE WHEN pt.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_task_count,
                       SUM(CASE
                             WHEN pt.due_date < CURRENT_DATE
                              AND pt.status NOT IN ('completed', 'cancelled')
                             THEN 1 ELSE 0
                           END) AS overdue_task_count,
                       SUM(CASE
                             WHEN pt.status = 'completed'
                              AND COALESCE(pt.audited, 0) = 0
                             THEN 1 ELSE 0
                           END) AS pending_audit_task_count,
                       SUM(CASE WHEN COALESCE(pt.audited, 0) = 1 THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN pt.status <> 'cancelled'
                             THEN COALESCE(pt.completion_percent, CASE WHEN pt.status = 'completed' THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN COALESCE(pt.audited, 0) = 1
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
                WHERE
                """ + filter.sql();

        return jdbcTemplate.queryForObject(sql, this::mapSummaryRow, filter.params().toArray());
    }

    private List<Map<String, Object>> loadCollaborators(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
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
                       SUM(CASE WHEN pt.status <> 'cancelled' THEN 1 ELSE 0 END) AS actionable_task_count,
                       SUM(CASE WHEN pt.status IN ('pending', 'in_progress', 'paused') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE
                             WHEN pt.due_date < CURRENT_DATE
                              AND pt.status NOT IN ('completed', 'cancelled')
                             THEN 1 ELSE 0
                           END) AS overdue_task_count,
                       SUM(CASE
                             WHEN pt.status = 'completed'
                              AND COALESCE(pt.audited, 0) = 0
                             THEN 1 ELSE 0
                           END) AS pending_audit_task_count,
                       SUM(CASE WHEN COALESCE(pt.audited, 0) = 1 THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN pt.status <> 'cancelled'
                             THEN COALESCE(pt.completion_percent, CASE WHEN pt.status = 'completed' THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN COALESCE(pt.audited, 0) = 1
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
                LEFT JOIN (
                    SELECT company_id, task_id, COUNT(*) AS attachments
                    FROM process_task_attachments
                    WHERE deleted_at IS NULL
                    GROUP BY company_id, task_id
                ) attachment_summary ON attachment_summary.company_id = pt.company_id
                    AND attachment_summary.task_id = pt.id
                WHERE
                """ + filter.sql() + """
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
        var sql = """
                SELECT pt.process_id,
                       MAX(process.folio) AS process_folio,
                       MAX(process.title) AS process_title,
                       MAX(process.is_active) AS is_active,
                       MAX(process.next_occurrence_date) AS next_occurrence_date,
                       MAX(process.generated_until_date) AS generated_until_date,
                       MAX(process.evidence_required) AS evidence_required,
                       COUNT(*) AS total_task_count,
                       SUM(CASE WHEN pt.status <> 'cancelled' THEN 1 ELSE 0 END) AS actionable_task_count,
                       SUM(CASE WHEN pt.status IN ('pending', 'in_progress', 'paused') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE
                             WHEN pt.due_date < CURRENT_DATE
                              AND pt.status NOT IN ('completed', 'cancelled')
                             THEN 1 ELSE 0
                           END) AS overdue_task_count,
                       SUM(CASE
                             WHEN pt.status = 'completed'
                              AND COALESCE(pt.audited, 0) = 0
                             THEN 1 ELSE 0
                           END) AS pending_audit_task_count,
                       SUM(CASE WHEN COALESCE(pt.audited, 0) = 1 THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN pt.status <> 'cancelled'
                             THEN COALESCE(pt.completion_percent, CASE WHEN pt.status = 'completed' THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN COALESCE(pt.audited, 0) = 1
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
                WHERE
                """ + filter.sql() + """
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
        var sql = """
                SELECT pt.project_id,
                       MAX(project.folio) AS project_folio,
                       MAX(project.name) AS project_name,
                       MAX(project.status) AS project_status,
                       MAX(project.due_date) AS project_due_date,
                       COUNT(*) AS total_task_count,
                       SUM(CASE WHEN pt.status <> 'cancelled' THEN 1 ELSE 0 END) AS actionable_task_count,
                       SUM(CASE WHEN pt.status IN ('pending', 'in_progress', 'paused') THEN 1 ELSE 0 END) AS open_task_count,
                       SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE
                             WHEN pt.due_date < CURRENT_DATE
                              AND pt.status NOT IN ('completed', 'cancelled')
                             THEN 1 ELSE 0
                           END) AS overdue_task_count,
                       SUM(CASE
                             WHEN pt.status = 'completed'
                              AND COALESCE(pt.audited, 0) = 0
                             THEN 1 ELSE 0
                           END) AS pending_audit_task_count,
                       SUM(CASE WHEN COALESCE(pt.audited, 0) = 1 THEN 1 ELSE 0 END) AS audited_task_count,
                       ROUND(AVG(CASE
                             WHEN pt.status <> 'cancelled'
                             THEN COALESCE(pt.completion_percent, CASE WHEN pt.status = 'completed' THEN 100 ELSE 0 END)
                             ELSE NULL
                           END), 0) AS average_completion,
                       ROUND(AVG(CASE
                             WHEN COALESCE(pt.audited, 0) = 1
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
                WHERE
                """ + filter.sql() + """
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

    private List<Map<String, Object>> loadTrend(KpiScope scope) {
        var filter = taskFilter(scope, "pt");
        var sql = """
                SELECT pt.due_date AS date,
                       COUNT(*) AS total_task_count,
                       SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) AS completed_task_count,
                       SUM(CASE
                             WHEN pt.due_date < CURRENT_DATE
                              AND pt.status NOT IN ('completed', 'cancelled')
                             THEN 1 ELSE 0
                           END) AS overdue_task_count,
                       SUM(CASE WHEN COALESCE(pt.audited, 0) = 1 THEN 1 ELSE 0 END) AS audited_task_count
                FROM process_tasks pt
                WHERE
                """ + filter.sql() + """
                GROUP BY pt.due_date
                ORDER BY pt.due_date ASC
                """;

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
        var openTasks = intValue(rs, "open_task_count");
        var completedTasks = intValue(rs, "completed_task_count");
        var overdueTasks = intValue(rs, "overdue_task_count");
        var pendingAuditTasks = intValue(rs, "pending_audit_task_count");
        var auditedTasks = intValue(rs, "audited_task_count");
        var averageCompletion = clampPercent(doubleValue(rs, "average_completion"));
        var averageWeighting = nullableDouble(rs, "average_weighting");
        var evidenceTasks = intValue(rs, "evidence_task_count");

        var row = new LinkedHashMap<String, Object>();
        row.put("totalTasks", totalTasks);
        row.put("actionableTasks", actionableTasks);
        row.put("openTasks", openTasks);
        row.put("completedTasks", completedTasks);
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
        var overdueTasks = (Integer) row.getOrDefault("overdueTasks", 0);
        var auditedTasks = (Integer) row.getOrDefault("auditedTasks", 0);
        var evidenceTasks = (Integer) row.getOrDefault("evidenceTasks", 0);
        var averageCompletion = ((Number) row.getOrDefault("averageCompletion", 0)).doubleValue();
        var averageWeighting = (Double) row.get("averageWeighting");

        var completionRate = percent(completedTasks, actionableTasks);
        var timelinessRate = actionableTasks > 0
                ? percent(Math.max(0, actionableTasks - overdueTasks), actionableTasks)
                : 0;
        var auditRate = percent(auditedTasks, completedTasks);
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
                "productivity",
                "Productividad operativa",
                summary.get("productivityScore") + "%",
                "Meta 85%",
                "Score combinado de avance, cierre, puntualidad, auditoria, calidad y evidencia.",
                statusFromScore((Integer) summary.get("productivityScore"))));
        cards.add(card(
                "compliance",
                "Cumplimiento de agenda",
                summary.get("completionRate") + "%",
                summary.get("completedTasks") + " cerradas",
                "Relacion entre tareas accionables y tareas cerradas.",
                statusFromScore((Integer) summary.get("completionRate"))));
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
                "quality",
                "Calidad auditada",
                summary.get("averageWeighting") == null ? "N/A" : summary.get("averageWeighting") + "/5",
                "Ponderacion maxima 5",
                "Promedio de ponderacion sobre tareas auditadas.",
                statusFromScore((Integer) summary.get("qualityScore"))));
        cards.add(card(
                "collaborators",
                "Colaboradores medidos",
                String.valueOf(collaborators.size()),
                projects.size() + " proyectos / " + processes.size() + " procesos",
                "Personas con tareas dentro del filtro seleccionado.",
                collaborators.isEmpty() ? "critical" : "healthy"));
        return cards;
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
        sql.append(alias).append(".company_id = ?")
                .append(" AND ").append(alias).append(".deleted_at IS NULL")
                .append(" AND ").append(alias).append(".due_date IS NOT NULL");
        params.add(scope.companyId());

        if (scope.overdueOnly()) {
            sql.append(" AND ").append(alias).append(".due_date < CURRENT_DATE")
                    .append(" AND ").append(alias).append(".status NOT IN ('completed', 'cancelled')");
        } else {
            sql.append(" AND (")
                    .append(alias).append(".due_date BETWEEN ? AND ?");
            params.add(java.sql.Date.valueOf(scope.from()));
            params.add(java.sql.Date.valueOf(scope.to()));

            if (scope.includeOverdueBacklog()) {
                sql.append(" OR (")
                        .append(alias).append(".due_date < ?")
                        .append(" AND ").append(alias).append(".status NOT IN ('completed', 'cancelled'))");
                params.add(java.sql.Date.valueOf(scope.from()));
            }

            sql.append(")");
        }

        if (scope.unitId() != null) {
            sql.append(" AND ").append(alias).append(".unit_id = ?");
            params.add(scope.unitId());
        }
        if (scope.businessId() != null) {
            sql.append(" AND ").append(alias).append(".business_id = ?");
            params.add(scope.businessId());
        }
        if (scope.collaboratorId() != null) {
            sql.append(" AND ").append(alias).append(".assigned_user_company_id = ?");
            params.add(scope.collaboratorId());
        }

        return new SqlFragment(sql.toString(), params);
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

    private Object nullable(Object value) {
        return value == null ? "" : value;
    }

    private String fallback(String value, String fallbackValue) {
        return value == null || value.isBlank() ? fallbackValue : value;
    }

    private record KpiScope(
            long companyId,
            LocalDate from,
            LocalDate to,
            boolean includeOverdueBacklog,
            boolean overdueOnly,
            Long unitId,
            Long businessId,
            Long collaboratorId) {
    }

    private record SqlFragment(String sql, List<Object> params) {
    }
}
