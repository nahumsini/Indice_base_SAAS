package com.indice.erp.pos.assistant;
import static com.indice.erp.pos.assistant.PosAssistantContracts.*;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import com.indice.erp.pos.ticket.dto.*;
import com.indice.erp.pos.payment.dto.PosPaymentResponse;
import com.indice.erp.pos.cashmovement.dto.CashMovementResponse;
import com.indice.erp.pos.receipt.PaidInventoryReceiptDtos.ReceiptResponse;
import java.util.List;

final class PosAssistantViews {
    private PosAssistantViews() {}
    static Register register(CashRegisterResponse r) {return new Register(r.id(),r.warehouseId(),r.unitId(),r.businessId(),r.code(),r.name(),r.status().name(),r.active(),r.retainedCashAmount(),r.settlementRules(),r.notes(),r.version());}
    static Shift shift(ShiftResponse r) {return new Shift(r.id(),r.cashRegisterId(),r.warehouseId(),r.unitId(),r.businessId(),r.status().name(),r.openingAmount(),r.expectedCashAmount(),r.countedCashAmount(),r.overShortAmount(),r.currencyCode(),r.openedAt(),r.closedAt(),r.openingNote(),r.closingNote(),r.version());}
    static Ticket ticket(PosTicketResponse r,List<PosTicketItemResponse> items,List<PosPaymentResponse> payments) {
        return new Ticket(r.id(),r.ticketNumber(),r.cashRegisterId(),r.shiftId(),r.warehouseId(),r.salesRecordId(),r.status().name(),r.channel(),r.currencyCode(),r.subtotalAmount(),r.discountAmount(),r.taxAmount(),r.totalAmount(),r.paidAmount(),r.balanceAmount(),r.customerNameSnapshot(),r.notes(),r.completedAt(),
            items.stream().map(x->new TicketItem(x.id(),x.productId(),x.productNameSnapshot(),x.quantity(),x.unitPrice(),x.discountAmount(),x.taxAmount(),x.lineTotalAmount())).toList(),
            payments.stream().map(x->new Payment(x.id(),x.paymentMethod().name(),x.paymentAccountId(),x.amount(),x.currencyCode(),x.status().name(),x.reference())).toList());
    }
    static Ticket ticket(PosTicketDetailResponse d) {return ticket(d.ticket(),d.items(),d.payments());}
    static CashMovement movement(CashMovementResponse r) {return new CashMovement(r.id(),r.shiftId(),r.cashRegisterId(),r.movementType().name(),r.amount(),r.currencyCode(),r.reason(),r.reference());}
    static Receipt receipt(ReceiptResponse r) {return new Receipt(r.id(),r.receiptNumber(),r.cashRegisterId(),r.shiftId(),r.warehouseId(),r.providerId(),r.providerName(),r.paymentMethod(),r.paymentAccountId(),r.currencyCode(),r.subtotalAmount(),r.taxAmount(),r.totalAmount(),r.status(),r.paymentReference(),r.reversalReason(),r.items());}
}
