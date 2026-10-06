package com.indice.erp.ai.hr;

import com.indice.erp.hr.assistant.HrAssistantContracts.Result;
import java.time.Instant;
import java.util.List;

public final class AiHrContracts {
    private AiHrContracts() { }
    public record Preview(String action, String confirmationToken, Instant expiresAt, boolean requiresConfirmation, Result before, Result after, com.indice.erp.hr.assistant.HrAssistantContracts.Change changes, List<String> effects) { }
    public record CommitRequest(String confirmationToken, String idempotencyKey) { }
    public record Committed(String action, boolean replayed, String correlationId, Result result) { }
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) { super("The HR confirmation is no longer valid for this action. Prepare it again."); this.code=code; }
        public String code() { return code; }
    }
}
