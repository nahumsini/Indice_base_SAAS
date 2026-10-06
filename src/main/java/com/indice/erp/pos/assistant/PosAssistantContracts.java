package com.indice.erp.pos.assistant;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.indice.erp.pos.checkout.CheckoutAssistantPreparation;
import com.indice.erp.pos.cashclosing.dto.ShiftClosingSummaryResponse;
import com.indice.erp.pos.receipt.PaidInventoryReceiptDtos;
import com.indice.erp.pos.receipt.PaidInventoryReceiptService;
import com.indice.erp.pos.returns.PosReturnDtos;
import com.indice.erp.pos.settlement.SettlementRuleResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class PosAssistantContracts {
    private PosAssistantContracts() {}
    public interface ClosedInput { @JsonAnySetter default void reject(String name,Object value) {throw new IllegalArgumentException("Unknown POS workflow field: "+name);} }
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SettlementInput(String paymentMethod,Long destinationPaymentAccountId,String settlementTiming,Boolean enabled) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RegisterInput(Long warehouseId,String code,String name,String notes,BigDecimal retainedCashAmount,
        String settlementCurrency,List<SettlementInput> settlementRules) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record OpenInput(Long cashRegisterId,BigDecimal openingAmount,String currency,String note) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CloseInput(BigDecimal countedCashAmount,String note) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CashInput(Long shiftId,Long cashRegisterId,String type,BigDecimal amount,String currency,String reason,String reference) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CheckoutItem(Long productId,BigDecimal quantity,BigDecimal unitPrice,BigDecimal discountAmount,BigDecimal taxAmount,Long discountRuleId) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PaymentInput(String method,Long paymentAccountId,BigDecimal amount,String reference) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CheckoutInput(Long cashRegisterId,Long customerId,Long preticketId,Long restaurantOrderId,String currency,
        List<CheckoutItem> items,List<PaymentInput> payments,String notes) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReceiptItem(Long productId,Boolean enableInventory,BigDecimal quantity,BigDecimal unitCost,
        BigDecimal taxRate,Boolean taxIncluded,String taxProfileId,String taxName) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReceiptInput(Long cashRegisterId,Long shiftId,Long providerId,String currency,String paymentMethod,
        Long paymentAccountId,String reference,String notes,List<ReceiptItem> items) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReturnInput(Long ticketId,String reason,Boolean goodsReceived) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TransferEvidence(Long paymentId,String reference) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReturnConfirmation(Boolean cashReturned,List<TransferEvidence> transferReferences) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id,RegisterInput register,OpenInput opening,CloseInput closing,CashInput cash,
        CheckoutInput checkout,ReceiptInput receipt,ReturnInput returns,ReturnConfirmation returnConfirmation,String reason) implements ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(Long id,Long shiftId,Long cashRegisterId,String currency,String query,Integer limit,String cursor,String requestKey) implements ClosedInput {}
    public record Register(Long id,Long warehouseId,Long unitId,Long businessId,String code,String name,String status,
        boolean active,BigDecimal retainedCashAmount,List<SettlementRuleResponse> settlementRules,String notes,Long version) {}
    public record Shift(Long id,Long cashRegisterId,Long warehouseId,Long unitId,Long businessId,String status,
        BigDecimal openingAmount,BigDecimal expectedCashAmount,BigDecimal countedCashAmount,BigDecimal overShortAmount,
        String currency,Instant openedAt,Instant closedAt,String openingNote,String closingNote,Long version) {}
    public record Ticket(Long id,String number,Long cashRegisterId,Long shiftId,Long warehouseId,Long salesRecordId,
        String status,String channel,String currency,BigDecimal subtotal,BigDecimal discount,BigDecimal tax,BigDecimal total,
        BigDecimal paid,BigDecimal balance,String customerName,String notes,Instant completedAt,List<TicketItem> items,List<Payment> payments) {}
    public record TicketItem(Long id,Long productId,String name,BigDecimal quantity,BigDecimal unitPrice,
        BigDecimal discount,BigDecimal tax,BigDecimal total) {}
    public record Payment(Long id,String method,Long paymentAccountId,BigDecimal amount,String currency,String status,String reference) {}
    public record CashMovement(Long id,Long shiftId,Long cashRegisterId,String type,BigDecimal amount,String currency,String reason,String reference) {}
    public record Receipt(long id,String number,long cashRegisterId,long shiftId,long warehouseId,Long providerId,String providerName,
        String method,Long paymentAccountId,String currency,BigDecimal subtotal,BigDecimal tax,BigDecimal total,String status,
        String reference,String reversalReason,List<PaidInventoryReceiptDtos.ItemResponse> items) {}
    public record Records(List<Register> registers,List<Shift> shifts,List<Ticket> tickets,List<CashMovement> cashMovements,
        List<Receipt> receipts,List<PosReturnDtos.Response> returns,List<ShiftClosingSummaryResponse> closings) {
        public static Records empty() {return new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());}
    }
    public record Page(Records records,int totalCount,boolean hasMore,String nextCursor,String scope) {}
    public record Prepared(String action,Change change,Records before,Records after,
        CheckoutAssistantPreparation.Draft checkout,PaidInventoryReceiptService.Preview receipt,com.indice.erp.pos.returns.PosReturnService.Inspection returnPlan,List<com.indice.erp.pos.settlement.ClosingSettlementPreview.Effect> settlements,Map<String,String> versions) {}
    public record Result(String action,String requestKey,Records records) {}
    public static final class Changed extends IllegalStateException { public Changed(){super("POS data changed. Prepare and confirm the current operation again.");} }
}
