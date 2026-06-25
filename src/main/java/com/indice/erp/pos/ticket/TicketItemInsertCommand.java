package com.indice.erp.pos.ticket;

import java.math.BigDecimal;

public record TicketItemInsertCommand(
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
        String metadataJson) {
}
