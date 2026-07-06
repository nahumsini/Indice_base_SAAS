package com.indice.erp.finance.payablekiosk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PayableKioskRequest(
    Long unitId,
    Long businessId,
    Long providerId,
    @Size(max = 80) String code,
    @NotBlank @Size(max = 180) String name,
    @Size(max = 24) String status,
    @Size(max = 32) String accessType,
    @Size(min = 3, max = 3) String currencyCode,
    Boolean allowProviderRegistration
) {
}
