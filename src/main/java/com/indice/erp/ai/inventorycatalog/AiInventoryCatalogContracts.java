package com.indice.erp.ai.inventorycatalog;
import com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantContracts.*;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
public final class AiInventoryCatalogContracts {
 private AiInventoryCatalogContracts() {}
 public record Preview(String action,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,Records before,Records after,Change changes,List<String> effects) {}
 public record CommitRequest(String confirmationToken,String idempotencyKey){@JsonAnySetter public void reject(String k,JsonNode v){throw new IllegalArgumentException("Unexpected commit field: "+k);}}
 public record Committed(String action,boolean replayed,String correlationId,Result result) {}
 public static final class Conflict extends RuntimeException {private final String code;public Conflict(String code){super("Prepare and confirm inventory catalog again.");this.code=code;}public String code(){return code;}}
}
