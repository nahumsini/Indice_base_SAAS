package com.indice.erp.pos.cashclosing.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CashClosingDetailResponse(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        Long shiftId,
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
        Long closedByUserId,
        Instant closedAt,
        ShiftBasicInfo shift,
        CashRegisterBasicInfo cashRegister,
        JsonNode metadata) {

    public record ShiftBasicInfo(
            Long id,
            String status,
            String currencyCode,
            Long openedByUserId,
            Instant openedAt,
            Instant closedAt) {
    }

    public record CashRegisterBasicInfo(
            Long id,
            String code,
            String name,
            Long warehouseId) {
    }
}
