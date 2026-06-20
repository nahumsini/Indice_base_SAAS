package com.indice.erp.pos.cashmovement;

import java.math.BigDecimal;

public record CashMovementCommand(
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
        String metadataJson) {
}
