package com.indice.erp.pos.customerdisplay.dto;

import jakarta.validation.constraints.NotBlank;

public record CustomerDisplayPairRequest(
        @NotBlank String pairingCode,
        String deviceName) {
}
