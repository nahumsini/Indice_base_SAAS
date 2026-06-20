package com.indice.erp.pos.shift.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ShiftOpenRequest(
        @NotNull Long cashRegisterId,
        @DecimalMin("0.0") BigDecimal openingAmount,
        @NotBlank String currencyCode,
        String openingNote,
        JsonNode customFields,
        JsonNode metadata) {
}
