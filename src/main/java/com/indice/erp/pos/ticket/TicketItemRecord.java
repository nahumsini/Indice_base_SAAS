package com.indice.erp.pos.ticket;

import java.math.BigDecimal;
import java.time.Instant;

public record TicketItemRecord(
        Long id,
        Long companyId,
        Long ticketId,
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
        String metadataJson,
        Instant createdAt) {
}
