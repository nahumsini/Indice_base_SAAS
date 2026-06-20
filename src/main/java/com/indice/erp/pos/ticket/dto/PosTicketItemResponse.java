package com.indice.erp.pos.ticket.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Instant;

public record PosTicketItemResponse(
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
        JsonNode metadata,
        Instant createdAt) {
}
