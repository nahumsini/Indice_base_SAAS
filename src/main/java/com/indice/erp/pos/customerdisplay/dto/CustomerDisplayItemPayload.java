package com.indice.erp.pos.customerdisplay.dto;

import java.math.BigDecimal;

public record CustomerDisplayItemPayload(
        String productName,
        String sku,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal lineTotalAmount) {
}
