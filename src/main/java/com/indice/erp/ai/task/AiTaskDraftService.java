package com.indice.erp.ai.task;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.task.AiTaskActionContracts.*;
import com.indice.erp.processTasks.tasks.ProcessTaskAssistantService;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AiTaskDraftService {
    private static final Set<String> PRIORITIES = Set.of("low", "medium", "high");
    private static final Set<String> STATUSES = Set.of("pending", "in_progress", "paused", "completed", "cancelled");
    private final ProcessTaskAssistantService owner;

    public AiTaskDraftService(ProcessTaskAssistantService owner) { this.owner = owner; }

    public TaskDraft create(StoredToken token, PreviewRequest request) {
        if (request == null) throw new IllegalArgumentException("Task details are required.");
        var assigneeId = request.assigneeUserCompanyId() == null
            ? token.user().userCompanyId() : request.assigneeUserCompanyId();
        if (assigneeId != token.user().userCompanyId()) requireScope(token, "tasks.delegate");
        var assignment = owner.creationAssignment(token.user().companyId(), token.user().userId(), assigneeId);
        if (request.unitId() != null || request.businessId() != null) {
            requireScope(token, "tasks.organize");
            assignment = owner.organizationAssignment(token.user().companyId(), token.user().userId(), assigneeId,
                request.unitId(), request.businessId(), null);
        }
        return new TaskDraft(text(request.title(), 180, true), text(request.description(), 2000, false),
            choice(request.priority(), PRIORITIES, "medium"), request.dueDate(), assignment.name(), assigneeId,
            assignment.unitId(), assignment.unitName(), assignment.businessId(), assignment.businessName(),
            null, "pending", null, request.unitId() != null || request.businessId() != null
                ? List.of("unitId", "businessId") : List.of());
    }

    public PreparedEdit edit(StoredToken token, UpdateRequest request) {
        requireScope(token, "tasks.update");
        if (request == null) throw new IllegalArgumentException("Task changes are required.");
        var snapshot = owner.snapshot(token.user().companyId(), token.user().userId(), request.taskId());
        var row = snapshot.task();
        var before = new TaskDraft(string(row.get("title")), string(row.get("description")),
            string(row.get("priority")), date(row.get("dueDate")),
            row.get("assignedName") == null ? "Sin responsable" : string(row.get("assignedName")),
            number(row.get("assignedUserCompanyId")), number(row.get("unitId")), string(row.get("unitName")),
            number(row.get("businessId")), string(row.get("businessName")), request.taskId(),
            string(row.get("status")), snapshot.version(), List.of());
        if (Boolean.TRUE.equals(request.clearDescription()) && request.description() != null
                || Boolean.TRUE.equals(request.clearDueDate()) && request.dueDate() != null) {
            throw new IllegalArgumentException("A field cannot be set and cleared together.");
        }
        var title = request.title() == null ? before.title() : text(request.title(), 180, true);
        var description = Boolean.TRUE.equals(request.clearDescription()) ? null
            : request.description() == null ? before.description() : text(request.description(), 2000, false);
        var priority = choice(request.priority(), PRIORITIES, before.priority());
        var status = choice(request.status(), STATUSES, before.status());
        var dueDate = Boolean.TRUE.equals(request.clearDueDate()) ? null
            : request.dueDate() == null ? before.dueDate() : request.dueDate();
        var assigneeId = before.assigneeUserCompanyId();
        var assignee = before.assignee();
        var unitId = before.unitId();
        var unitName = before.unitName();
        var businessId = before.businessId();
        var businessName = before.businessName();
        if (Boolean.TRUE.equals(request.clearBusiness()) && request.businessId() != null)
            throw new IllegalArgumentException("A business cannot be set and cleared together.");
        if (request.unitId() != null || request.businessId() != null || Boolean.TRUE.equals(request.clearBusiness())) {
            requireScope(token, "tasks.organize");
            var destination = owner.organizationAssignment(token.user().companyId(), token.user().userId(),
                request.assigneeUserCompanyId() == null ? assigneeId : request.assigneeUserCompanyId(),
                request.unitId() == null ? unitId : request.unitId(),
                Boolean.TRUE.equals(request.clearBusiness()) ? null : request.businessId() == null ? businessId : request.businessId(), request.taskId());
            unitId = destination.unitId(); unitName = destination.unitName();
            businessId = destination.businessId(); businessName = destination.businessName();
        }
        if (request.assigneeUserCompanyId() != null && !Objects.equals(assigneeId, request.assigneeUserCompanyId())) {
            requireScope(token, "tasks.delegate");
            var resolved = owner.assignmentForTask(token.user().companyId(), token.user().userId(),
                request.assigneeUserCompanyId(), unitId, businessId);
            assigneeId = resolved.userCompanyId();
            assignee = resolved.name();
        }
        var changes = new ArrayList<String>();
        changed(changes, "title", before.title(), title);
        changed(changes, "description", before.description(), description);
        changed(changes, "priority", before.priority(), priority);
        changed(changes, "status", before.status(), status);
        changed(changes, "dueDate", before.dueDate(), dueDate);
        changed(changes, "assignedUserCompanyId", before.assigneeUserCompanyId(), assigneeId);
        changed(changes, "unitId", before.unitId(), unitId);
        changed(changes, "businessId", before.businessId(), businessId);
        if (changes.isEmpty()) throw new IllegalArgumentException("No task changes were requested.");
        var after = new TaskDraft(title, description, priority, dueDate, assignee, assigneeId,
            unitId, unitName, businessId, businessName, request.taskId(),
            status, snapshot.version(), List.copyOf(changes));
        return new PreparedEdit(before, after);
    }

    public void requireResultAccess(StoredToken token, long taskId) {
        owner.snapshot(token.user().companyId(), token.user().userId(), taskId);
    }

    public PreparedEdit operation(StoredToken token, OperationRequest request, String action) {
        requireScope(token, operationScope(action));
        if (request == null || request.operation() == null || !action.equals(request.operation().action()))
            throw new IllegalArgumentException("Task operation does not match the requested tool.");
        if ("share_task".equals(action)) requireScope(token, "tasks.delegate");
        var snapshot = owner.snapshot(token.user().companyId(), token.user().userId(), request.taskId());
        var row = snapshot.task();
        var prepared = owner.prepareOperation(token.user().companyId(), token.user().userId(), request.taskId(), request.operation());
        var before = new TaskDraft(string(row.get("title")), string(row.get("description")), string(row.get("priority")),
            date(row.get("dueDate")), row.get("assignedName") == null ? "Sin responsable" : string(row.get("assignedName")),
            number(row.get("assignedUserCompanyId")), number(row.get("unitId")), string(row.get("unitName")),
            number(row.get("businessId")), string(row.get("businessName")), request.taskId(), string(row.get("status")), snapshot.version(), List.of());
        return new PreparedEdit(before, new TaskDraft(before.title(), before.description(), before.priority(), before.dueDate(),
            before.assignee(), before.assigneeUserCompanyId(), before.unitId(), before.unitName(), before.businessId(),
            before.businessName(), before.taskId(), before.status(), before.expectedVersion(), List.of(action), prepared,
            "share_task".equals(action) ? owner.reviewTeam(token.user().companyId(), token.user().userId(), row, prepared.collaboratorUserCompanyIds()) : null));
    }

    public static String operationScope(String action) {
        if (!com.indice.erp.processTasks.tasks.ProcessTaskOperation.ACTIONS.contains(action == null ? "" : action))
            throw new IllegalArgumentException("Unsupported task operation.");
        return "audit_task".equals(action) ? "tasks.audit" : "tasks.operate";
    }

    public static void requireScope(StoredToken token, String scope) {
        if (!token.scopes().contains(scope)) throw new SecurityException("This connection requires " + scope + " consent.");
    }

    public static void requireCommitScopes(StoredToken token, TaskDraft draft) {
        if (draft.operation() != null) {
            requireScope(token, operationScope(draft.operation().action()));
            if ("share_task".equals(draft.operation().action())) requireScope(token, "tasks.delegate");
            return;
        }
        requireScope(token, draft.taskId() == null ? "tasks.create" : "tasks.update");
        if (draft.changedFields().contains("unitId") || draft.changedFields().contains("businessId"))
            requireScope(token, "tasks.organize");
        if (draft.taskId() == null && draft.assigneeUserCompanyId() != null
                && draft.assigneeUserCompanyId() != token.user().userCompanyId()
                || draft.changedFields().contains("assignedUserCompanyId")) {
            requireScope(token, "tasks.delegate");
        }
    }

    private static void changed(List<String> fields, String field, Object before, Object after) {
        if (!Objects.equals(before, after)) fields.add(field);
    }
    private static String text(String value, int max, boolean required) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty() && required || normalized.length() > max) throw new IllegalArgumentException("Invalid task text.");
        return normalized.isEmpty() ? null : normalized;
    }
    private static String choice(String value, Set<String> allowed, String fallback) {
        if (value == null) return fallback;
        var normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw new IllegalArgumentException("Invalid task priority or status.");
        return normalized;
    }
    private static String string(Object value) { return value == null ? null : value.toString(); }
    private static Long number(Object value) { return value instanceof Number n ? n.longValue() : null; }
    private static LocalDate date(Object value) { return value == null ? null : LocalDate.parse(value.toString()); }
    public record PreparedEdit(TaskDraft before, TaskDraft after) { }
}
