package com.indice.erp.pos.cashclosing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

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
        BigDecimal totalRefundsAmount,
        int ticketsCount,
        List<PaymentMethodSummary> paymentsSummary,
        Long closedByUserId,
        String closedByUserName,
        String currencyCode,
        Instant closedAt) {
}
