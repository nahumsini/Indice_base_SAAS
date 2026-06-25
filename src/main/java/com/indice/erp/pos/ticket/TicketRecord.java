package com.indice.erp.pos.ticket;

import com.indice.erp.pos.status.TicketStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record TicketRecord(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        Long shiftId,
        Long customerId,
        Long salesRecordId,
        String ticketNumber,
        TicketStatus status,
        String channel,
        String currencyCode,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal balanceAmount,
        String customerNameSnapshot,
        String customerTaxIdSnapshot,
        String notes,
        Instant completedAt,
        Long createdByUserId,
        Long updatedByUserId,
        Instant createdAt,
        Instant updatedAt,
        Long version,
        String customFieldsJson,
        String metadataJson) {
}
