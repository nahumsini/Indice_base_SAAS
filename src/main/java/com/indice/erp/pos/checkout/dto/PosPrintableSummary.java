package com.indice.erp.pos.checkout.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PosPrintableSummary(
        String ticketNumber,
        String customerName,
        String currencyCode,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        Instant completedAt) {
}
