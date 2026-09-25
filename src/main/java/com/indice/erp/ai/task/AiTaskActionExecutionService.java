package com.indice.erp.ai.task;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitResponse;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskResult;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import com.indice.erp.processTasks.tasks.ProcessTaskAssistantService;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiTaskActionExecutionService {

    private final AiTaskActionRepository repository;
    private final ProcessTasksService processTasksService;
    private final Clock clock;
    private final ProcessTaskAssistantService owner;

    public AiTaskActionExecutionService(
        AiTaskActionRepository repository,
        ProcessTasksService processTasksService,
        Clock clock,
        ProcessTaskAssistantService owner
    ) {
        this.repository = repository;
        this.processTasksService = processTasksService;
        this.clock = clock;
        this.owner = owner;
    }

    @Transactional
    public CommitResponse execute(
        AiAccessTokenRepository.StoredToken token,
        AiTaskActionRepository.Confirmation confirmation,
        String idempotencyHash,
        String correlationId
    ) {
        AiTaskDraftService.requireCommitScopes(token, confirmation.draft());
        var executionId = repository.insertPendingExecution(
            token,
            confirmation,
            idempotencyHash,
            correlationId
        );
        if (repository.consumeConfirmation(confirmation.id(), clock.instant()) != 1) {
            throw new AiTaskActionConflictException(
                "confirmation_unavailable",
                "The confirmation expired or was already used. Prepare the task again."
            );
        }

        var draft = confirmation.draft();
        var payload = new LinkedHashMap<String, Object>();
        payload.put("title", draft.title());
        payload.put("status", draft.status());
        payload.put("priority", draft.priority());
        payload.put("assignedUserCompanyId", draft.assigneeUserCompanyId() == null
            ? token.user().userCompanyId() : draft.assigneeUserCompanyId());
        payload.put("description", draft.description());
        payload.put("dueDate", draft.dueDate() == null ? null : draft.dueDate().toString());
        Map<String, Object> created;
        if (draft.taskId() == null) {
            if (draft.assigneeUserCompanyId() != null) {
                owner.assignmentForTask(token.user().companyId(), token.user().userId(), draft.assigneeUserCompanyId(),
                    draft.unitId(), draft.businessId());
            }
            payload.put("unitId", draft.unitId());
            payload.put("businessId", draft.businessId());
            created = processTasksService.createTask(token.user().companyId(), token.user().userId(), payload);
        } else {
            payload.keySet().retainAll(draft.changedFields());
            created = owner.patchConfirmed(token.user().companyId(), token.user().userId(), draft.taskId(),
                draft.expectedVersion(), payload);
        }
        var result = taskResult(created);
        if (repository.completeExecution(executionId, result, clock.instant()) != 1) {
            throw new IllegalStateException("Task execution could not be completed.");
        }
        // Success audit is part of the owner transaction: an audit failure rolls back the mutation.
        repository.insertAudit(token, confirmation.id(), "COMMIT", "SUCCESS", correlationId, idempotencyHash,
            draft, result, null, null);
        return new CommitResponse(false, correlationId, result);
    }

    private TaskResult taskResult(Map<String, Object> task) {
        var id = task.get("id");
        if (!(id instanceof Number number) || number.longValue() <= 0) {
            throw new IllegalStateException("Created task did not return a valid identifier.");
        }
        return new TaskResult(
            number.longValue(),
            text(task.get("folio")),
            text(task.get("title")),
            text(task.get("status")),
            date(task.get("dueDate")),
            task.get("assignedUserCompanyId") instanceof Number assignee ? assignee.longValue() : null,
            text(task.get("assignedName"))
        );
    }

    private LocalDate date(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        var normalized = text(value);
        return normalized == null ? null : LocalDate.parse(normalized);
    }

    private String text(Object value) {
        if (value == null) {
            return null;
        }
        var normalized = String.valueOf(value).trim();
        return normalized.isEmpty() ? null : normalized;
    }

}
