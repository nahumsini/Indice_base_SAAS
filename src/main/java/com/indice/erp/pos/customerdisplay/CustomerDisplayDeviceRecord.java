package com.indice.erp.pos.customerdisplay;

import java.time.Instant;

public record CustomerDisplayDeviceRecord(
        Long id,
        Long companyId,
        Long unitId,
        Long businessId,
        Long warehouseId,
        Long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName,
        String deviceToken,
        String pairingCode,
        Instant pairingCodeExpiresAt,
        String name,
        String status,
        Instant pairedAt,
        Instant lastSeenAt,
        Long createdByUserId,
        Long updatedByUserId,
        Instant createdAt,
        Instant updatedAt,
        Long version,
        String metadataJson) {
}
