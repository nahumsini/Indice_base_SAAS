package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import java.math.BigDecimal;

public record MpPaymentResponse(long intentId, String status,
        BigDecimal amount, String currencyCode, String orderId, String paymentId,
        String message, Long posTicketId, PosCheckoutResponse checkout,
        String saleState, boolean canCancel, boolean canRetry, long version) {
}
