package com.indice.erp.pos.ticket.dto;

import com.indice.erp.pos.payment.dto.PosPaymentResponse;
import java.util.List;

public record PosTicketDetailResponse(
        PosTicketResponse ticket,
        List<PosTicketItemResponse> items,
        List<PosPaymentResponse> payments) {
}
