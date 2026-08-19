package com.indice.erp.pos.checkout.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PosCheckoutItemRequest(
        Long productId,
        @NotBlank String productName,
        String sku,
        String productType,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal quantity,
        @NotNull @DecimalMin("0.0") BigDecimal unitPrice,
        @DecimalMin("0.0") BigDecimal discountAmount,
        @DecimalMin("0.0") BigDecimal taxAmount,
        Long discountRuleId) {

    public PosCheckoutItemRequest(
            Long productId,
            String productName,
            String sku,
            String productType,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal discountAmount,
            BigDecimal taxAmount) {
        this(productId, productName, sku, productType, quantity, unitPrice, discountAmount, taxAmount, null);
    }
}
