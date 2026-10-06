package com.indice.erp.ai.salesworkflow;
import com.indice.erp.sales.SalesWorkflowContracts.*;
import java.time.Instant;
import java.util.List;
public final class AiSalesWorkflowContracts {
    private AiSalesWorkflowContracts() {}
    public record Preview(String action,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,
        Records before,Records after,Change changes,List<StockEffect> stock,CollectionEffect collection,List<String> effects) {}
    public record CommitRequest(String confirmationToken,String idempotencyKey) implements ClosedInput {}
    public record Committed(String action,boolean replayed,String correlationId,Result result) {}
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) {super("Prepare and confirm the current sales workflow again.");this.code=code;}
        public String code() {return code;}
    }
}
