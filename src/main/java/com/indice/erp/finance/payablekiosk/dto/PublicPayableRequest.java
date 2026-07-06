package com.indice.erp.finance.payablekiosk.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PublicPayableRequest(
    Long providerId,
    @NotBlank @Size(max = 220) String concept,
    @Size(max = 4000) String description,
    @NotNull @DecimalMin("0.0") BigDecimal subtotalAmount,
    @NotNull @DecimalMin("0.0") BigDecimal taxAmount,
    @NotNull @DecimalMin("0.0") BigDecimal totalAmount,
    @NotBlank @Size(min = 3, max = 3) String currencyCode,
    LocalDate dueDate,
    @Size(max = 120) String externalReference
) {
}
