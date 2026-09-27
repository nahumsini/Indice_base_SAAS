package com.indice.erp.pos.returns;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record PosReturnReviewRequest(
        @NotBlank @Size(min = 8, max = 500) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {}
