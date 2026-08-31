package com.indice.erp.ai.task;

import java.time.Instant;
import java.time.LocalDate;

public final class AiTaskActionContracts {

    private AiTaskActionContracts() {
    }

    public record PreviewRequest(
        String title,
        String description,
        String priority,
        LocalDate dueDate
    ) {
    }

    public record TaskDraft(
        String title,
        String description,
        String priority,
        LocalDate dueDate,
        String assignee
    ) {
    }

    public record PreviewResponse(
        String confirmationToken,
        Instant expiresAt,
        boolean requiresConfirmation,
        TaskDraft task
    ) {
    }

    public record CommitRequest(String confirmationToken, String idempotencyKey) {
    }

    public record TaskResult(
        long id,
        String folio,
        String title,
        String status,
        LocalDate dueDate
    ) {
    }

    public record CommitResponse(
        boolean replayed,
        String correlationId,
        TaskResult task
    ) {
    }
}
