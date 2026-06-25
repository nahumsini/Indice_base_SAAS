package com.indice.erp.pos.customerdisplay.dto;

import java.time.Instant;

public record CustomerDisplayPairingCodeResponse(
        Long deviceId,
        Long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName,
        String pairingCode,
        Instant pairingCodeExpiresAt,
        String deviceToken,
        String displayUrl,
        String pairingUrl) {
}
