package com.indice.erp.pos.cashclosing.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CashClosingSummaryRow(
        Long id,
        Long shiftId,
        Long cashRegisterId,
        Long warehouseId,
        BigDecimal openingCashAmount,
        BigDecimal cashSalesAmount,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal overShortAmount,
        BigDecimal totalSalesAmount,
        int ticketsCount,
        Long closedByUserId,
        String currencyCode,
        Instant closedAt) {
}
