package com.indice.erp.pos.purchaseorder.assistant;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
public final class ProcurementAssistantContracts {
    private ProcurementAssistantContracts() {}
    private static void unknown(String field) {throw new IllegalArgumentException("Unsupported procurement field: "+field);}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Line(Long productId, BigDecimal quantity, BigDecimal unitCost, BigDecimal taxRate) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Draft(Long providerId, Long warehouseId, String currency, LocalDate expectedDate, String notes,List<Line> items) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReceiveLine(Long orderItemId, BigDecimal receivedQuantity) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Receipt(String notes,List<ReceiveLine> items) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Invoice(Long providerId,Long purchaseOrderId,String number,LocalDate date,LocalDate dueDate,BigDecimal subtotal,BigDecimal tax,String currency,String notes) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Resolution(Long itemId,String decision,Long productId,BigDecimal salePrice,String note) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Conversion(Long warehouseId,LocalDate expectedDate,String notes,List<Resolution> items) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SupplierLink(Long productId,Long providerId,String sku,BigDecimal cost,String currency,Integer leadTimeDays,BigDecimal minimumQuantity,Boolean preferred,Boolean active,String notes) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SubmissionLine(Long productId,String sku,String name,String description,BigDecimal quantity,BigDecimal unitCost,BigDecimal taxRate,Integer leadTimeDays,BigDecimal minimumQuantity) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Submission(Long providerId,String currency,String notes,List<SubmissionLine> items) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id,Draft draft,Receipt receipt,Invoice invoice,Conversion conversion,SupplierLink supplierLink,Submission submission,String status,String note) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(Long id,Long providerId,Long warehouseId,String status,LocalDate from,LocalDate to,Integer limit,String cursor) {@JsonAnySetter public void reject(String k,JsonNode v){unknown(k);}}
    public record Records(List<PurchaseOrderResponse> orders,List<SupplierSubmissionResponse> submissions,List<SupplierInvoiceResponse> invoices,List<ProductSupplierResponse> supplierLinks) {
        public static Records empty(){return new Records(List.of(),List.of(),List.of(),List.of());}
    }
    public record StockEffect(Long productId,Long warehouseId,BigDecimal quantity,BigDecimal unitCost,String currency) {}
    public record CatalogEffect(Long productId,BigDecimal previousCost,BigDecimal nextCost,BigDecimal previousPrice,BigDecimal nextPrice,String currency) {}
    public record FinancialEffect(String kind,String currency,BigDecimal amount,boolean createsPendingExpense,boolean recordsPayment) {}
    public record Prepared(String action,Change change,Records before,Records after,List<StockEffect> stock,List<FinancialEffect> finance,List<CatalogEffect> catalog,Map<String,String> versions,String scope) {}
    public record Result(String action,Records records) {}
    public record Page(Records records,long totalCount,boolean hasMore,String nextCursor,String scope) {}
    public static final class Changed extends IllegalStateException {public Changed(){super("Procurement changed. Prepare and confirm the current operation again.");}}
}
