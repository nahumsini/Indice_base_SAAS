package com.indice.erp.pos.cashmovement;

import java.math.BigDecimal;
import java.time.Instant;

public record CashMovementRecord(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        Long shiftId,
        CashMovementType movementType,
        BigDecimal amount,
        String currencyCode,
        String reason,
        String reference,
        Long createdByUserId,
        Instant createdAt,
        String metadataJson) {
}
