package com.indice.erp.ai.procurement;
import com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantContracts.*;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
public final class AiProcurementContracts {
    private AiProcurementContracts() {}
    public record Preview(String action,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,Records before,Records after,Change changes,List<StockEffect> stock,List<FinancialEffect> finance,List<CatalogEffect> catalog,List<String> effects) {}
    public record CommitRequest(String confirmationToken,String idempotencyKey) {@JsonAnySetter public void reject(String k,JsonNode v){throw new IllegalArgumentException("Unknown commit field: "+k);}}
    public record Committed(String action,boolean replayed,String correlationId,Result result) {}
    public static final class Conflict extends RuntimeException {private final String code;public Conflict(String code){super("Prepare and confirm procurement again.");this.code=code;}public String code(){return code;}}
}
