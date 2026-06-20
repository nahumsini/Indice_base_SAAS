package com.indice.erp.pos.checkout;

import java.math.BigDecimal;

public record SalesRecordSummaryCommand(
        Long unitId,
        Long businessId,
        String saleNumber,
        String customerName,
        String sellerName,
        BigDecimal totalAmount,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        String currencyCode,
        String paymentMethod,
        String paymentReference,
        String saleLinesJson,
        String notes,
        String metadataJson,
        boolean inventoryDeducted) {
}
