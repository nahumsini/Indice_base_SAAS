package com.indice.erp.pos.mercadopago;

import java.math.BigDecimal;

public record MpEvidence(String orderId, String paymentId, String status,
        String providerState, String message, String sanitizedJson,
        BigDecimal refundedAmount, boolean blocksFinalization) {
}
