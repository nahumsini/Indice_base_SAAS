package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.checkout.dto.PosPrintableSummary;
import com.indice.erp.pos.ticket.TicketService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

@Service
public class PersistedCheckoutReader {
    private final TicketService tickets;
    public PersistedCheckoutReader(TicketService tickets) {
        this.tickets = tickets;
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public PosCheckoutResponse readCommitted(PosContext context, long ticketId) {
        return read(context, ticketId);
    }
    @Transactional(readOnly = true)
    public PosCheckoutResponse read(PosContext context, long ticketId) {
        var detail = tickets.get(context, ticketId);
        var ticket = detail.ticket();
        return new PosCheckoutResponse(ticket, detail.items(), detail.payments(), new PosPrintableSummary(
            ticket.ticketNumber(), ticket.customerNameSnapshot(), ticket.currencyCode(), ticket.subtotalAmount(),
            ticket.discountAmount(), ticket.taxAmount(), ticket.totalAmount(), ticket.paidAmount(), ticket.completedAt()));
    }
}
