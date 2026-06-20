package com.indice.erp.pos.cashmovement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;

public record CashMovementCreateRequest(
        @NotNull Long shiftId,
        @NotNull Long cashRegisterId,
        @NotBlank String movementType,
        @NotNull BigDecimal amount,
        @NotBlank @Size(min = 3, max = 3) String currencyCode,
        @NotBlank String reason,
        String reference,
        Map<String, Object> metadata) {
}
