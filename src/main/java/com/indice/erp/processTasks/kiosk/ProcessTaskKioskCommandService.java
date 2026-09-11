package com.indice.erp.processTasks.kiosk;

import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Typed task mutations; the Engine transports them but the module owns their rules. */
@Service
class ProcessTaskKioskCommandService {

    private final ProcessTasksService processTasksService;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;
    private final ProcessTaskKioskIdentityService identities;
    private final ProcessTaskKioskQueryService queries;
    private final ProcessTaskKioskModuleAuditService audit;

    ProcessTaskKioskCommandService(
            ProcessTasksService processTasksService,
            ProcessTaskAssignmentScopeService assignmentScopeService,
            ProcessTaskKioskIdentityService identities,
            ProcessTaskKioskQueryService queries,
            ProcessTaskKioskModuleAuditService audit) {
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

    /**
     * Native employee capture accepts only task content. Assignment and organization scope are
     * derived from the authenticated membership so client payloads cannot delegate or widen it.
     */
    @Transactional
    Map<String, Object> createForSelf(
            ProcessTaskPublicKioskContext context,
            Map<String, Object> payload) {
        var normalized = payload == null ? Map.<String, Object>of() : payload;
        var title = text(normalized, "title");
        if (title.isBlank()) {
            throw new IllegalArgumentException("title is required.");
        }
        if (title.length() > 220) {
            throw new IllegalArgumentException("title must contain 220 characters or fewer.");
        }
        var description = nullable(normalized, "description");
        if (description != null && description.length() > 2000) {
            throw new IllegalArgumentException("description must contain 2000 characters or fewer.");
        }

        var safePayload = new LinkedHashMap<String, Object>();
        safePayload.put("title", title);
        safePayload.put("description", description);
        var priority = fallback(text(normalized, "priority"), "medium")
            .toLowerCase(java.util.Locale.ROOT);
        if (!List.of("low", "medium", "high").contains(priority)) {
            throw new IllegalArgumentException("priority is invalid.");
        }
        safePayload.put("priority", priority);
        var dueDateValue = nullable(normalized, "dueDate", "due_date");
        if (dueDateValue != null) {
            try {
                safePayload.put("dueDate", LocalDate.parse(dueDateValue).toString());
            } catch (java.time.format.DateTimeParseException invalidDate) {
                throw new IllegalArgumentException("due_date must be an ISO date.", invalidDate);
            }
        }
        safePayload.put("assignedUserCompanyId", context.employee().userCompanyId());
        safePayload.put("assignedName", context.employee().fullName());
        return create(context, safePayload);
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
        processTasksService.patchTask(
            context.kiosk().companyId(),
            context.employee().userId(),
            taskId,
            Map.of(
                "assignedUserCompanyId", assigned.userCompanyId(),
                "assigneeUserCompanyIds", List.of(assigned.userCompanyId()),
                "assignedName", assignedName
            )
        );
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
        var sharedTask = processTasksService.getTask(context.kiosk().companyId(), taskId);
        var currentAssignment = currentAssignment(sharedTask, context.employee().userCompanyId());
        if ("team".equals(sharedTask.get("assignmentMode")) && currentAssignment == null) {
            throw new IllegalStateException("The current team assignment could not be resolved.");
        }
        if ("team".equals(sharedTask.get("assignmentMode"))
                && !"lead".equals(currentAssignment.role())) {
            if ("ready".equals(currentAssignment.contributionStatus())) {
                throw new IllegalStateException("This contribution is already ready for review.");
            }
            processTasksService.updateCurrentUserContribution(
                context.kiosk().companyId(),
                context.employee().userId(),
                taskId,
                Map.of("status", "ready", "note", notes)
            );
            audit.record(context, taskId, "TASK_CONTRIBUTION_READY", Map.of(
                "has_completion_notes", !notes.isBlank()
            ));
            return Map.of(
                "action_outcome", "CONTRIBUTION_READY",
                "current_contribution_status", "ready",
                "task", queries.visibleTask(context.kiosk(), context.employee(), taskId),
                "items", queries.listTasks(context.kiosk(), context.employee())
            );
        }
        processTasksService.completeTask(
            context.kiosk().companyId(),
            context.employee().userId(),
            taskId,
            Map.of(
                "completionNotes", notes,
                "completionPercent", percent
            )
        );
        audit.record(context, taskId, "TASK_COMPLETED", Map.of(
            "completion_percent", percent,
            "has_completion_notes", !notes.isBlank()
        ));
        var completed = new LinkedHashMap<>(before);
        completed.put("status", "completed");
        completed.put("completion_percent", percent);
        completed.put("completion_notes", notes.isBlank() ? null : notes);
        return Map.of(
            "action_outcome", "TASK_COMPLETED",
            "task", completed,
            "items", queries.listTasks(context.kiosk(), context.employee())
        );
    }

    @Transactional
    Map<String, Object> updateAgenda(
            ProcessTaskPublicKioskContext context,
            long taskId,
            Map<String, Object> payload) {
        var before = queries.completableTask(context.kiosk(), context.employee(), taskId);
        var normalized = payload == null ? Map.<String, Object>of() : payload;
        var placement = new LinkedHashMap<String, Object>();
        placement.put("agendaDate", nullable(normalized, "agenda_date", "agendaDate"));
        placement.put("agendaStartTime", nullable(
            normalized, "agenda_start_time", "agendaStartTime"));
        placement.put("agendaEndTime", nullable(
            normalized, "agenda_end_time", "agendaEndTime"));
        placement.put("agendaTimeZone", nullable(
            normalized, "agenda_time_zone", "agendaTimeZone"));

        processTasksService.updateAgendaPlacement(
            context.kiosk().companyId(), context.employee().userId(), taskId, placement);
        var updated = queries.visibleTask(context.kiosk(), context.employee(), taskId);
        var auditDetails = new LinkedHashMap<String, Object>();
        auditDetails.put("previous_agenda_date", fallback(
            text(before, "agenda_date"), ""));
        auditDetails.put("agenda_date", fallback(text(updated, "agenda_date"), ""));
        auditDetails.put("agenda_start_time", fallback(
            text(updated, "agenda_start_time"), ""));
        auditDetails.put("agenda_end_time", fallback(
            text(updated, "agenda_end_time"), ""));
        audit.record(context, taskId, "TASK_AGENDA_UPDATED", auditDetails);
        return Map.of(
            "task", updated,
            "items", queries.listTasks(context.kiosk(), context.employee())
        );
    }

    private CurrentAssignment currentAssignment(Map<String, Object> task, long userCompanyId) {
        var assignees = task.get("assignees");
        if (!(assignees instanceof Iterable<?> values)) {
            return null;
        }
        for (var value : values) {
            if (!(value instanceof Map<?, ?> member)) {
                continue;
            }
            if (Objects.equals(number(member.get("userCompanyId")), userCompanyId)) {
                return new CurrentAssignment(
                    normalizedMemberValue(member.get("role")),
                    normalizedMemberValue(member.get("contributionStatus"))
                );
            }
        }
        return null;
    }

    private String normalizedMemberValue(Object value) {
        return value == null ? null : String.valueOf(value).trim().toLowerCase();
    }

    private record CurrentAssignment(String role, String contributionStatus) {
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
