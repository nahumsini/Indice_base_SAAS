package com.indice.erp.ai.inventory;
import com.indice.erp.sales.InventoryAssistantContracts.*;
import java.time.Instant;
import java.util.List;
public final class AiInventoryContracts {
    private AiInventoryContracts(){ }
    public record Preview(String action,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,Snapshot before,Snapshot after,Change changes,List<String> effects){ }
    public record CommitRequest(String confirmationToken,String idempotencyKey){ }
    public record Committed(String action,boolean replayed,String correlationId,Result result){ }
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code){super("Prepare and confirm this inventory workflow again.");this.code=code;}
        public String code(){return code;}
    }
}
