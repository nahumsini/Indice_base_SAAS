package com.indice.erp.pos.cashclosing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ShiftClosingSummaryResponse(
        Long shiftId,
        Long cashRegisterId,
        String cashRegisterName,
        String currencyCode,
        BigDecimal openingCashAmount,
        BigDecimal cashSalesAmount,
        BigDecimal cashInAmount,
        BigDecimal cashOutAmount,
        BigDecimal safeDropAmount,
        BigDecimal correctionAmount,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal overShortAmount,
        BigDecimal totalSalesAmount,
        BigDecimal totalRefundsAmount,
        int ticketsCount,
        List<PaymentMethodSummary> paymentsSummary,
        String notes,
        boolean closed,
        Instant closedAt) {
}
