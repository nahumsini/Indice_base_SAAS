package com.indice.erp.pos.mercadopago;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record MpMerchantReviewRequest(
        @NotBlank @Pattern(regexp = "ORD[A-Za-z0-9_-]{1,125}") String providerOrderId,
        @NotBlank @Size(min = 8, max = 500) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {}
