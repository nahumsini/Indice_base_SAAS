package com.indice.erp.pos.purchaseorder.assistant;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.discount.DiscountDtos.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
public final class InventoryCatalogAssistantContracts {
    private InventoryCatalogAssistantContracts() {}
    interface Closed { @JsonAnySetter default void reject(String k,JsonNode v){throw new IllegalArgumentException("Unsupported inventory catalog field: "+k);} }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ProviderInput(Long warehouseId,String name,String legalName,String taxId,String email,String phone,String contactName,Integer paymentTermsDays,String notes) implements Closed {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DiscountInput(Long warehouseId,String name,String description,String scope,String discountType,BigDecimal value,String currency,Instant startsAt,Instant endsAt,BigDecimal minimumAmount,BigDecimal maximumDiscountAmount,String customerType,Long productId,String category,Boolean requiresAuthorization,Boolean stackable,Integer priority,List<String> channels) implements Closed {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id,ProviderInput provider,DiscountInput discount,String status,String reason) implements Closed {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(Long id,String query,String status,Integer limit,String cursor,Long warehouseId,String channel,String currency,BigDecimal amount,Long productId,String category,String customerType,String evaluationScope) implements Closed {}
    public record Provider(Long id,Long unitId,Long businessId,String name,String legalName,String taxId,String email,String phone,String contactName,Integer paymentTermsDays,String status,String notes,Long version) {}
    public record Records(List<Provider> providers,List<RuleResponse> discounts,List<EvaluatedRuleResponse> evaluation) {public static Records empty(){return new Records(List.of(),List.of(),List.of());}}
    public record Prepared(String action,Change change,Records before,Records after,Map<String,String> versions,String scope) {}
    public record Result(String action,Records records) {}
    public record Page(Records records,long totalCount,boolean hasMore,String nextCursor,String scope) {}
    public static final class Changed extends IllegalStateException {public Changed(){super("Inventory catalog changed. Prepare the current operation again.");}}
}
