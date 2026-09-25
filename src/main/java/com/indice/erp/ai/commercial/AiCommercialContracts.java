package com.indice.erp.ai.commercial;

import com.indice.erp.sales.SalesAssistantContracts.RecordView;
import java.time.Instant;
import java.util.List;

public final class AiCommercialContracts {
    private AiCommercialContracts() { }
    public record CommitRequest(String confirmationToken, String idempotencyKey) { }
    public record Preview(String action, String confirmationToken, Instant expiresAt, boolean requiresConfirmation,
        RecordView before, RecordView after, List<String> effects) { }
    public record Committed(String action, boolean replayed, String correlationId, RecordView record) { }
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) { super(code); this.code = code; }
        public String code() { return code; }
    }
}
