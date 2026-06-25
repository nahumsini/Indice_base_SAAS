package com.indice.erp.pos.shift.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ShiftCloseRequest(
        @NotNull @DecimalMin("0.0") BigDecimal countedCashAmount,
        String closingNote) {
}
