package com.indice.erp.pos.shift.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record ShiftResponse(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        String cashRegisterName,
        Long openedByUserId,
        Long closedByUserId,
        ShiftStatus status,
        BigDecimal openingAmount,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal overShortAmount,
        String currencyCode,
        Instant openedAt,
        Instant closedAt,
        String openingNote,
        String closingNote,
        Long version,
        JsonNode customFields,
        JsonNode metadata) {
}
