package com.indice.erp.pos.customerdisplay.dto;

import java.math.BigDecimal;

public record CustomerDisplayPaymentPayload(
        String paymentMethod,
        BigDecimal amount,
        BigDecimal cashReceived,
        BigDecimal changeAmount,
        Boolean pending) {
}
