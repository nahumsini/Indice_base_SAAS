package com.indice.erp.pos.assistant;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.indice.erp.pos.checkout.CheckoutAssistantPreparation;
import com.indice.erp.pos.returns.PosReturnDtos;
import com.indice.erp.pos.terminal.TerminalBinding;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
public final class PosTerminalContracts {
    private PosTerminalContracts() {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CardInput(Long cashRegisterId,Long customerId,Long preticketId,Long restaurantOrderId,String currency,
        List<PosAssistantContracts.CheckoutItem> items,String notes) implements PosAssistantContracts.ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RefundInput(BigDecimal amount,String reason) implements PosAssistantContracts.ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id,String provider,CardInput checkout,RefundInput refund,String reason) implements PosAssistantContracts.ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(Long id,String provider,Long cashRegisterId,Long shiftId,String requestKey,Integer limit) implements PosAssistantContracts.ClosedInput {}
    public record Payment(String provider,long id,long cashRegisterId,long shiftId,String requestKey,String status,
        BigDecimal amount,String currency,Long ticketId,String saleState,long version) {}
    public record Refund(String provider,long id,long intentId,String requestKey,BigDecimal amount,String currency,String status,long version) {}
    public record Records(List<Payment> payments,List<Refund> refunds,List<PosReturnDtos.Response> returns,List<TerminalBinding> bindings) {
        public static Records empty(){return new Records(List.of(),List.of(),List.of(),List.of());}
    }
    public record ReadResult(Records records,boolean mayHaveMore,int limit) {}
    public record Prepared(String action,Change change,Records before,CheckoutAssistantPreparation.Draft checkout,
        BigDecimal refundAmount,String currency,Map<String,String> versions) {}
    public record Result(String action,String requestKey,Records records) {}
}
