package com.indice.erp.pos.customerdisplay.dto;

import jakarta.validation.constraints.NotNull;

public record CustomerDisplayPairingCodeRequest(
        @NotNull Long cashRegisterId,
        String deviceName) {
}
