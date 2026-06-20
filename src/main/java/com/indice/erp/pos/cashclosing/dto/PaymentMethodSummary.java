package com.indice.erp.pos.cashclosing.dto;

import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;

public record PaymentMethodSummary(
        PaymentMethod paymentMethod,
        BigDecimal amount,
        long count) {
}
