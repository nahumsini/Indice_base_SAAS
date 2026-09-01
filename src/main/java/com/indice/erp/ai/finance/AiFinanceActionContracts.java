package com.indice.erp.ai.finance;

import java.time.Instant;
import java.util.Map;

public final class AiFinanceActionContracts {

    private AiFinanceActionContracts() {
    }

    public record PreviewResponse(
        String confirmationToken,
        Instant expiresAt,
        boolean requiresConfirmation,
        String action,
        Map<String, Object> preview
    ) {
    }

    public record CommitRequest(String confirmationToken, String idempotencyKey) {
    }

    public record CommitResponse(
        boolean replayed,
        String correlationId,
        String action,
        Map<String, Object> result
    ) {
    }
}
