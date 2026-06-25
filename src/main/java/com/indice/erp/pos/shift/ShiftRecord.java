package com.indice.erp.pos.shift;

import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record ShiftRecord(
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
        Long createdByUserId,
        Long updatedByUserId,
        Instant createdAt,
        Instant updatedAt,
        Long version,
        String customFieldsJson,
        String metadataJson) {
}
