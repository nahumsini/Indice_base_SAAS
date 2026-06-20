package com.indice.erp.pos.checkout.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PosCheckoutPaymentRequest(
        @NotBlank String paymentMethod,
        Long paymentAccountId,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal amount,
        String reference) {
}
