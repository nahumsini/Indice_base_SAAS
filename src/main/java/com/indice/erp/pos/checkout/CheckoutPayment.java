package com.indice.erp.pos.checkout;

import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;

public record CheckoutPayment(
        PaymentMethod paymentMethod,
        Long paymentAccountId,
        BigDecimal amount,
        String currencyCode,
        String reference) {
}
