package com.indice.erp.pos.mercadopago;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record MpRefundRequest(@NotBlank @Size(max = 64) String idempotencyKey,
        BigDecimal amount, @NotBlank @Size(max = 500) String reason) {
}
