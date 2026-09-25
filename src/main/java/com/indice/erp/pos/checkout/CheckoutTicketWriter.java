package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.status.TicketStatus;
import com.indice.erp.pos.ticket.TicketInsertCommand;
import com.indice.erp.pos.ticket.TicketItemInsertCommand;
import com.indice.erp.pos.ticket.TicketRecord;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class CheckoutTicketWriter {
    private final CheckoutDependencies dependencies;
    CheckoutTicketWriter(CheckoutDependencies dependencies) {
        this.dependencies = dependencies;
    }
    String nextNumber(PosContext context) {
        for (var i = 0; i < 5; i++) {
            var suffix = UUID.randomUUID().toString().substring(0, 5).toUpperCase();
            var number = "POS-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + "-" + suffix;
            if (!dependencies.tickets().existsTicketNumber(context, number)) return number;
        }
        throw PosApiException.conflict("Could not generate POS ticket number.");
    }
    TicketRecord insert(PosContext context, PosCheckoutRequest request, CheckoutDraft draft, long salesId, String number, boolean inventory) {
        var shift = draft.shift();
        var totals = draft.totals();
        return dependencies.tickets().insert(context, new TicketInsertCommand(
            shift.unitId(), shift.businessId(), shift.warehouseId(), shift.cashRegisterId(), shift.id(),
            draft.customer() == null ? null : draft.customer().id(), salesId, number, TicketStatus.COMPLETED,
            draft.currency(), totals.subtotalAmount(), totals.discountAmount(), totals.taxAmount(), totals.totalAmount(),
            totals.paidAmount(), totals.balanceAmount(), CheckoutText.customerName(draft.customer()), CheckoutText.taxId(draft.customer()),
            CheckoutText.trim(request.notes()), context.userId(), CheckoutText.metadata(inventory)));
    }
    java.util.List<TicketItemInsertCommand> items(CheckoutDraft draft) {
        return draft.lines().stream().map(line -> new TicketItemInsertCommand(line.productId(),
            CheckoutText.truncate(line.skuSnapshot(), 120), CheckoutText.truncate(line.productNameSnapshot(), 240),
            CheckoutText.truncate(line.productTypeSnapshot(), 40), line.quantity(), line.unitPrice(), line.discountAmount(),
            line.taxAmount(), line.lineTotalAmount(), line.currencyCode(), null)).toList();
    }
}
