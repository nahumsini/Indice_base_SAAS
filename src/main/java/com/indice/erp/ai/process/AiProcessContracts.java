package com.indice.erp.ai.process;
import com.indice.erp.processTasks.assistant.ProcessAssistantContracts.*;
import java.time.Instant;
import java.util.List;
public final class AiProcessContracts {
    private AiProcessContracts(){ }
    public record Preview(String action,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,Result before,Result after,Change changes,List<String> effects){ }
    public record CommitRequest(String confirmationToken,String idempotencyKey){ }
    public record Committed(String action,boolean replayed,String correlationId,Result result){ }
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code){super("Prepare and confirm this workflow again.");this.code=code;}
        public String code(){return code;}
    }
}
