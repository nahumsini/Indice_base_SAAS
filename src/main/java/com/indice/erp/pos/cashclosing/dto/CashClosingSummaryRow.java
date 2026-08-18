package com.indice.erp.pos.cashclosing.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CashClosingSummaryRow(
        Long id,
        Long shiftId,
        Long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName,
        Long warehouseId,
        String warehouseName,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        String companyName,
        BigDecimal openingCashAmount,
        BigDecimal cashSalesAmount,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal overShortAmount,
        BigDecimal totalSalesAmount,
        int ticketsCount,
        Long closedByUserId,
        String closedByUserName,
        String currencyCode,
        Instant closedAt) {
}
