package com.indice.erp.finance.payablekiosk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PayableKioskPinRequest(
    @NotBlank @Size(max = 32) String pin
) {
}
