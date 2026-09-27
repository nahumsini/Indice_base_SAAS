package com.indice.erp.pos.mercadopago;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record MpRefundReviewRequest(@NotBlank @Size(min = 8, max = 500) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {}
