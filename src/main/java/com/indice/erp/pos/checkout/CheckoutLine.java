package com.indice.erp.pos.checkout;

import java.math.BigDecimal;

public record CheckoutLine(
        Long productId,
        String skuSnapshot,
        String productNameSnapshot,
        String productTypeSnapshot,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal lineTotalAmount,
        String currencyCode,
        boolean stockTracked) {
}
