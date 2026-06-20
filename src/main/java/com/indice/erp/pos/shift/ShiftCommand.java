package com.indice.erp.pos.shift;

import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;

record ShiftCommand(
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        Long openedByUserId,
        Long closedByUserId,
        ShiftStatus status,
        BigDecimal openingAmount,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal overShortAmount,
        String currencyCode,
        String openingNote,
        String closingNote,
        Long createdByUserId,
        Long updatedByUserId,
        String customFieldsJson,
        String metadataJson) {
}
