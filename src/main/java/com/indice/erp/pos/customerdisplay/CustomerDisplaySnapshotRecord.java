package com.indice.erp.pos.customerdisplay;

import java.math.BigDecimal;
import java.time.Instant;

public record CustomerDisplaySnapshotRecord(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        Long shiftId,
        String status,
        String currencyCode,
        int itemCount,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal changeAmount,
        BigDecimal balanceAmount,
        String ticketNumber,
        String customerMessage,
        String itemsJson,
        String paymentsJson,
        Instant createdAt,
        Instant updatedAt) {
}
