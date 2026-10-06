package com.indice.erp.ai.task;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AiTaskActionContracts {

    private AiTaskActionContracts() {
    }

    public record PreviewRequest(
        String title,
        String description,
        String priority,
        LocalDate dueDate,
        Long assigneeUserCompanyId,
        Long unitId,
        Long businessId
    ) {
        public PreviewRequest(String title, String description, String priority, LocalDate dueDate, Long assigneeUserCompanyId) {
            this(title, description, priority, dueDate, assigneeUserCompanyId, null, null);
        }
        public PreviewRequest(String title, String description, String priority, LocalDate dueDate) {
            this(title, description, priority, dueDate, null, null, null);
        }
    }

    public record UpdateRequest(long taskId, String title, String description, String priority,
        LocalDate dueDate, String status, Long assigneeUserCompanyId, Boolean clearDescription, Boolean clearDueDate,
        Long unitId, Long businessId, Boolean clearBusiness) {
        public UpdateRequest(long taskId, String title, String description, String priority, LocalDate dueDate,
                String status, Long assigneeUserCompanyId, Boolean clearDescription, Boolean clearDueDate) {
            this(taskId, title, description, priority, dueDate, status, assigneeUserCompanyId,
                clearDescription, clearDueDate, null, null, null);
        }
    }

    public record TaskDraft(
        String title,
        String description,
        String priority,
        LocalDate dueDate,
        String assignee,
        Long assigneeUserCompanyId,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        Long taskId,
        String status,
        String expectedVersion,
        List<String> changedFields,
        com.indice.erp.processTasks.tasks.ProcessTaskOperation operation,
        com.indice.erp.processTasks.tasks.ProcessTaskAssistantService.TeamReview teamReview
    ) {
        public TaskDraft {
            status = status == null ? "pending" : status;
            changedFields = changedFields == null ? List.of() : List.copyOf(changedFields);
        }
        public TaskDraft(String title, String description, String priority, LocalDate dueDate, String assignee) {
            this(title, description, priority, dueDate, assignee, null, null, null, null, null,
                null, "pending", null, List.of(), null, null);
        }
        public TaskDraft(String title, String description, String priority, LocalDate dueDate, String assignee,
                Long assigneeUserCompanyId, Long unitId, String unitName, Long businessId, String businessName,
                Long taskId, String status, String expectedVersion, List<String> changedFields) {
            this(title, description, priority, dueDate, assignee, assigneeUserCompanyId, unitId, unitName,
                businessId, businessName, taskId, status, expectedVersion, changedFields, null, null);
        }
        public TaskDraft(String title, String description, String priority, LocalDate dueDate, String assignee,
                Long assigneeUserCompanyId, Long unitId, String unitName, Long businessId, String businessName,
                Long taskId, String status, String expectedVersion, List<String> changedFields,
                com.indice.erp.processTasks.tasks.ProcessTaskOperation operation) {
            this(title, description, priority, dueDate, assignee, assigneeUserCompanyId, unitId, unitName,
                businessId, businessName, taskId, status, expectedVersion, changedFields, operation, null);
        }
        public String tool() { return operation != null ? operation.action() : taskId == null ? "create_task" : "update_task"; }
    }

    public record OperationRequest(long taskId, com.indice.erp.processTasks.tasks.ProcessTaskOperation operation) { }

    public record PreviewResponse(
        String confirmationToken,
        Instant expiresAt,
        boolean requiresConfirmation,
        TaskDraft task,
        TaskDraft before
    ) {
        public PreviewResponse(String confirmationToken, Instant expiresAt, boolean requiresConfirmation, TaskDraft task) {
            this(confirmationToken, expiresAt, requiresConfirmation, task, null);
        }
    }

    public record CommitRequest(String confirmationToken, String idempotencyKey) {
    }

    public record TaskResult(
        long id,
        String folio,
        String title,
        String status,
        LocalDate dueDate,
        Long assigneeUserCompanyId,
        String assignee
    ) {
        public TaskResult(long id, String folio, String title, String status, LocalDate dueDate) {
            this(id, folio, title, status, dueDate, null, null);
        }
    }

    public record CommitResponse(
        boolean replayed,
        String correlationId,
        TaskResult task
    ) {
    }
}
