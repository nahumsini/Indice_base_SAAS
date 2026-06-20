package com.indice.erp.pos.ticket;

import com.indice.erp.pos.status.TicketStatus;
import java.math.BigDecimal;

public record TicketInsertCommand(
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        Long shiftId,
        Long customerId,
        Long salesRecordId,
        String ticketNumber,
        TicketStatus status,
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
        Long createdByUserId,
        String metadataJson) {
}
