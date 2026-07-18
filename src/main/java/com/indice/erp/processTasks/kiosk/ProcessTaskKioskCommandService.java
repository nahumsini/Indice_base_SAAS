package com.indice.erp.processTasks.kiosk;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Typed task mutations; the Engine transports them but the module owns their rules. */
@Service
class ProcessTaskKioskCommandService {

    private final JdbcTemplate jdbcTemplate;
    private final ProcessTasksService processTasksService;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;
    private final ProcessTaskKioskIdentityService identities;
    private final ProcessTaskKioskQueryService queries;
    private final ProcessTaskKioskModuleAuditService audit;

    ProcessTaskKioskCommandService(
            JdbcTemplate jdbcTemplate,
            ProcessTasksService processTasksService,
            ProcessTaskAssignmentScopeService assignmentScopeService,
            ProcessTaskKioskIdentityService identities,
            ProcessTaskKioskQueryService queries,
            ProcessTaskKioskModuleAuditService audit) {
        this.jdbcTemplate = jdbcTemplate;
        this.processTasksService = processTasksService;
        this.assignmentScopeService = assignmentScopeService;
        this.identities = identities;
        this.queries = queries;
        this.audit = audit;
    }

    @Transactional
    Map<String, Object> create(ProcessTaskPublicKioskContext context, Map<String, Object> payload) {
        var created = processTasksService.createTask(
            context.kiosk().companyId(), context.employee().userId(), createPayload(context, payload));
        var taskId = number(created.get("id"));
        var task = taskId == null ? created : queries.visibleTask(context.kiosk(), context.employee(), taskId);
        if (taskId != null) {
            audit.record(context, taskId, "TASK_CREATED", Map.of(
                "status", String.valueOf(task.getOrDefault("status", "pending")),
                "unit_id", context.kiosk().unitId() == null ? "" : context.kiosk().unitId(),
                "business_id", context.kiosk().businessId() == null ? "" : context.kiosk().businessId()
            ));
        }
        return Map.of("task", task, "items", queries.listTasks(context.kiosk(), context.employee()));
    }

    @Transactional
    Map<String, Object> assignResponsible(
            ProcessTaskPublicKioskContext context,
            long taskId,
            Map<String, Object> payload) {
        var normalized = payload == null ? Map.<String, Object>of() : payload;
        var task = queries.visibleTask(context.kiosk(), context.employee(), taskId);
        if (!List.of("pending", "in_progress", "paused")
                .contains(String.valueOf(task.getOrDefault("status", "")))) {
            throw new IllegalArgumentException("Only open tasks can be reassigned from the kiosk.");
        }
        var assignedId = positive(number(normalized, "assignedUserCompanyId", "assigned_user_company_id"));
        if (assignedId == null) {
            throw new IllegalArgumentException("assignedUserCompanyId is required.");
        }
        assignmentScopeService.requireCanAssign(
            context.kiosk().companyId(), context.employee().userId(),
            number(task.get("unit_id")), number(task.get("business_id")), assignedId);
        var assigned = identities.loadEmployee(context.kiosk().companyId(), assignedId);
        var assignedName = fallback(assigned.fullName(), "User " + assigned.userCompanyId());
        var updatedRows = jdbcTemplate.update(
            """
                UPDATE process_tasks
                SET assigned_user_id = ?, assigned_user_company_id = ?, assigned_name = ?
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                  AND status IN ('pending', 'in_progress', 'paused')
                  AND (assigned_user_company_id = ? OR created_by = ?)
                """,
            assigned.userId(), assigned.userCompanyId(), assignedName,
            context.kiosk().companyId(), taskId,
            context.employee().userCompanyId(), context.employee().userId()
        );
        if (updatedRows != 1) {
            throw new NoSuchElementException("Task not found for this kiosk.");
        }
        audit.record(context, taskId, "TASK_RESPONSIBLE_ASSIGNED", Map.of(
            "assigned_user_company_id", assigned.userCompanyId()
        ));
        var items = queries.listTasks(context.kiosk(), context.employee());
        var updated = items.stream()
            .filter(item -> Objects.equals(number(item.get("id")), taskId))
            .findFirst()
            .orElseGet(() -> {
                var detached = new LinkedHashMap<>(task);
                detached.put("assigned_user_company_id", assigned.userCompanyId());
                detached.put("assigned_name", assignedName);
                detached.put("is_assigned_to_current_user",
                    Objects.equals(assigned.userCompanyId(), context.employee().userCompanyId()));
                detached.put("can_complete", false);
                return detached;
            });
        return Map.of("task", updated, "items", items);
    }

    @Transactional
    Map<String, Object> complete(
            ProcessTaskPublicKioskContext context,
            long taskId,
            Map<String, Object> payload) {
        var before = queries.completableTask(context.kiosk(), context.employee(), taskId);
        var normalized = payload == null ? Map.<String, Object>of() : payload;
        var notes = text(normalized, "completion_notes", "completionNotes", "notes");
        var percent = integer(normalized, "completion_percent", "completionPercent", "completion");
        percent = percent == null ? 100 : Math.max(0, Math.min(100, percent));
        var updatedRows = jdbcTemplate.update(
            """
                UPDATE process_tasks
                SET status = 'completed', started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                    completed_at = CURRENT_TIMESTAMP, cancelled_at = NULL,
                    completed_by_user_id = ?, completed_by_user_company_id = ?,
                    completion_notes = ?, completion_percent = ?
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                  AND assigned_user_company_id = ?
                  AND status IN ('pending', 'in_progress', 'paused')
                """,
            context.employee().userId(), context.employee().userCompanyId(),
            notes.isBlank() ? null : notes, percent, context.kiosk().companyId(), taskId,
            context.employee().userCompanyId()
        );
        if (updatedRows != 1) {
            throw new NoSuchElementException("Task not found for this kiosk.");
        }
        audit.record(context, taskId, "TASK_COMPLETED", Map.of(
            "completion_percent", percent,
            "has_completion_notes", !notes.isBlank()
        ));
        var completed = new LinkedHashMap<>(before);
        completed.put("status", "completed");
        completed.put("completion_percent", percent);
        completed.put("completion_notes", notes.isBlank() ? null : notes);
        return Map.of("task", completed, "items", queries.listTasks(context.kiosk(), context.employee()));
    }

    private Map<String, Object> createPayload(
            ProcessTaskPublicKioskContext context,
            Map<String, Object> payload) {
        var actorScope = assignmentScopeService.actorScope(
            context.kiosk().companyId(), context.employee().userId());
        var unitId = context.kiosk().unitId();
        var businessId = context.kiosk().businessId();
        var assignedId = positive(number(payload, "assignedUserCompanyId", "assigned_user_company_id"));
        var title = text(payload, "title");
        if (title.isBlank()) throw new IllegalArgumentException("title is required.");
        if (unitId == null && actorScope.unitId() != null) unitId = actorScope.unitId();
        if (businessId == null && actorScope.businessId() != null) businessId = actorScope.businessId();
        if (assignedId == null) assignedId = context.employee().userCompanyId();
        var assignedName = text(payload, "assignedName", "assigned_name");
        if (assignedName.isBlank() && Objects.equals(assignedId, context.employee().userCompanyId())) {
            assignedName = context.employee().fullName();
        }
        var dueDate = nullable(payload, "dueDate", "due_date");
        if (dueDate == null || dueDate.isBlank()) dueDate = LocalDate.now().toString();
        var result = new LinkedHashMap<String, Object>();
        result.put("title", title);
        result.put("description", nullable(payload, "description"));
        result.put("processId", null);
        result.put("projectId", null);
        result.put("assignedUserCompanyId", assignedId);
        result.put("assignedName", assignedName.isBlank() ? null : assignedName);
        result.put("status", "pending");
        result.put("priority", fallback(text(payload, "priority"), "medium"));
        result.put("startDate", nullable(payload, "startDate", "start_date"));
        result.put("dueDate", dueDate);
        result.put("notes", nullable(payload, "notes"));
        result.put("completionPercent", 0);
        result.put("weighting", null);
        result.put("audited", false);
        result.put("auditNotes", null);
        result.put("businessId", businessId);
        result.put("unitId", unitId);
        return result;
    }

    private Long number(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            if (payload != null && payload.get(key) != null) return number(payload.get(key));
        }
        return null;
    }

    private Long number(Object value) {
        if (value instanceof Number number) return number.longValue();
        try { return value == null ? null : Long.parseLong(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return null; }
    }

    private Long positive(Long value) {
        return value == null || value <= 0 ? null : value;
    }

    private Integer integer(Map<String, Object> payload, String... keys) {
        var value = number(payload, keys);
        return value == null ? null : Math.toIntExact(value);
    }

    private String text(Map<String, Object> payload, String... keys) {
        if (payload != null) for (var key : keys) {
            var value = payload.get(key);
            if (value != null) return String.valueOf(value).trim();
        }
        return "";
    }

    private String nullable(Map<String, Object> payload, String... keys) {
        var value = text(payload, keys);
        return value.isBlank() ? null : value;
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
