package com.indice.erp.pos.checkout.dto;

import com.indice.erp.pos.payment.dto.PosPaymentResponse;
import com.indice.erp.pos.ticket.dto.PosTicketItemResponse;
import com.indice.erp.pos.ticket.dto.PosTicketResponse;
import java.util.List;

public record PosCheckoutResponse(
        PosTicketResponse ticket,
        List<PosTicketItemResponse> items,
        List<PosPaymentResponse> payments,
        PosPrintableSummary printableSummary) {
}
