package com.indice.erp.pos.square;

import jakarta.validation.constraints.*;

public record SquareRefundReviewRequest(
        @NotBlank @Size(min = 8, max = 500) String reason,
        @NotNull @PositiveOrZero Long expectedVersion) {
}
