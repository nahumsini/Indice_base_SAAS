package com.indice.erp.pos.cashmovement.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.cashmovement.CashMovementType;
import java.math.BigDecimal;
import java.time.Instant;

public record CashMovementResponse(
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
        JsonNode metadata) {
}
