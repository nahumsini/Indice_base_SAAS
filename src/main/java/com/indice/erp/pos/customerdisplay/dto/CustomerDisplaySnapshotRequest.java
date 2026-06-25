package com.indice.erp.pos.customerdisplay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record CustomerDisplaySnapshotRequest(
        @NotNull Long cashRegisterId,
        @NotNull Long shiftId,
        @NotBlank String status,
        @NotBlank String currencyCode,
        List<CustomerDisplayItemPayload> items,
        List<CustomerDisplayPaymentPayload> payments,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal changeAmount,
        BigDecimal balanceAmount,
        String ticketNumber,
        String customerMessage) {
}
