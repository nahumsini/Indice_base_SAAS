package com.indice.erp.pos.square;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record SquareRefundRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{1,45}") String idempotencyKey,
        @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
        @NotBlank @Size(min = 3, max = 192) String reason) {
}
