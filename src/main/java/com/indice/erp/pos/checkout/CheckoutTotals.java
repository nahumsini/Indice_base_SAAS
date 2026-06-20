package com.indice.erp.pos.checkout;

import java.math.BigDecimal;

public record CheckoutTotals(
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal balanceAmount,
        BigDecimal cashPaidAmount) {
}
