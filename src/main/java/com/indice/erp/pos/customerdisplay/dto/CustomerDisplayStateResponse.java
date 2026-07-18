package com.indice.erp.pos.customerdisplay.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Instant;

public record CustomerDisplayStateResponse(
        String deviceToken,
        String kioskName,
        String companyName,
        String unitName,
        String businessName,
        String warehouseName,
        Long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName,
        String status,
        String currencyCode,
        int itemCount,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal changeAmount,
        BigDecimal balanceAmount,
        String ticketNumber,
        String customerMessage,
        JsonNode items,
        JsonNode payments,
        Instant updatedAt,
        boolean connected) {
}
