package com.indice.erp.kiosk.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ProviderCenterPinUpdateRequest(
    @NotBlank
    @Pattern(regexp = "^[0-9]{6}$", message = "El NIP debe contener exactamente seis dígitos.")
    String pin
) {
}
