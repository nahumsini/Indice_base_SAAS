package com.indice.erp.sales;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Explicit operational inputs. Compatibility maps are internal to the Sales owner. */
public final class SalesWorkflowContracts {
    private SalesWorkflowContracts() {}
    public interface ClosedInput {
        @JsonAnySetter default void reject(String field, Object ignored) {
            throw new IllegalArgumentException("Unknown sales workflow field: " + field);
        }
    }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record LineInput(Long productId, BigDecimal quantity, BigDecimal unitPrice,
        BigDecimal discountPercent, BigDecimal taxPercent) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SaleInput(Long customerId, Long quoteId, Long warehouseId, LocalDate date,
        String currency, List<LineInput> items, String notes) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CollectionInput(String paymentMethod, Long paymentAccountId, String reference) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ContractInput(Long customerId, Long quoteId, String title, String contractType,
        String country, LocalDate expirationDate, String notes) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FollowUpInput(Long customerId, String relationType, String postSaleType,
        LocalDate nextFollowUpDate, LocalDate renewalDate, String nextAction, String notes) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RuleInput(String name, List<Long> userCompanyIds, List<Long> productIds,
        String type, BigDecimal value, LocalDate validFrom, LocalDate validUntil, Integer priority,
        String notes) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id, SaleInput sale, CollectionInput collection, ContractInput contract,
        FollowUpInput followUp, RuleInput rule, String status, String reason) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(Long id, String query, String status, LocalDate from, LocalDate to,
        Integer limit, String cursor) implements ClosedInput {}
    public record Line(Long productId, String name, BigDecimal quantity, BigDecimal unitPrice,
        BigDecimal discountPercent, BigDecimal taxPercent, BigDecimal subtotal, BigDecimal taxAmount,
        BigDecimal unitCost, String costCurrency, String costSource) {}
    public record Sale(Long id, String code, Long customerId, Long quoteId, Long unitId, Long businessId,
        Long warehouseId, String customerName, String sellerName, LocalDate date, String currency,
        BigDecimal subtotal, BigDecimal discountTotal, BigDecimal taxTotal, BigDecimal total,
        boolean marginReady, BigDecimal marginTotal, String commercialStatus, String financeStatus,
        String inventoryStatus, String inventoryMovementStatus, String deliveryStatus,
        String commissionStatus, BigDecimal commissionAmount, String paymentMethod,
        String paymentReference, List<Line> items, String notes, boolean posOwned) {}
    public record Contract(Long id, String code, Long customerId, Long quoteId, String title,
        String customerName, String contractType, String country, String status, String signatureStatus,
        LocalDate expirationDate, String notes) {}
    public record FollowUp(Long id, String code, Long customerId, String customerName, String relationType,
        String postSaleType, String status, LocalDate nextFollowUpDate, LocalDate renewalDate,
        String nextAction, String notes) {}
    public record Rule(Long id, String code, String name, List<Long> userCompanyIds, List<Long> productIds,
        String type, BigDecimal value, String status, LocalDate validFrom, LocalDate validUntil,
        Integer priority, String notes) {}
    public record Records(List<Sale> sales, List<Contract> contracts, List<FollowUp> followUps, List<Rule> rules) {
        public static Records empty() { return new Records(List.of(), List.of(), List.of(), List.of()); }
    }
    public record StockEffect(Long productId, Long warehouseId, BigDecimal required, BigDecimal available,
        BigDecimal reserved, BigDecimal unitCost, boolean consumesStock, boolean ready) {}
    public record CollectionEffect(Long paymentAccountId, String method, String currency, BigDecimal amount,
        boolean createsUniversalCash, boolean reversesCollection) {}
    public record Page(Records records, int totalCount, boolean hasMore, String nextCursor, String scope) {}
    // Payload/ref versions never appear in the public preview.
    public record Prepared(String action, Change change, Records before, Records after,
        List<StockEffect> stock, CollectionEffect collection, Map<String, Object> payload,
        Map<String, String> versions) {}
    public record Result(String action, Records records) {}
    public static final class Changed extends IllegalStateException {
        public Changed() { super("Sales data changed. Prepare and confirm the current workflow again."); }
    }
}
