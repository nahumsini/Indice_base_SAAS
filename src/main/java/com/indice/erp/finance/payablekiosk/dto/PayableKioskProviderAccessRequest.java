package com.indice.erp.finance.payablekiosk.dto;

import jakarta.validation.constraints.NotNull;

public record PayableKioskProviderAccessRequest(
        @NotNull Long kioskId,
        @NotNull Long providerId) {
}
