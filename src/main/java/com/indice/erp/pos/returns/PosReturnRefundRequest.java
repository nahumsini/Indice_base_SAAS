package com.indice.erp.pos.returns;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record PosReturnRefundRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{1,64}") String idempotencyKey,
        @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
        @NotBlank @Size(min = 3, max = 500) String reason) {
}
