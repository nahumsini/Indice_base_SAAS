package com.indice.erp.pos.customerdisplay;

import java.time.Instant;

public record CustomerDisplayDeviceRecord(
        Long id,
        Long companyId,
        String companyName,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        Long warehouseId,
        String warehouseName,
        Long cashRegisterId,
        String cashRegisterCode,
        String cashRegisterName,
        String deviceToken,
        String deviceTokenHash,
        String deviceTokenHint,
        String pairingCode,
        String pairingCodeHash,
        String consumedPairingCodeHash,
        Instant pairingCodeExpiresAt,
        Instant consumedPairingCodeExpiresAt,
        String name,
        String status,
        Instant pairedAt,
        Instant lastSeenAt,
        Instant lastConnectionAuditAt,
        Long createdByUserId,
        Long updatedByUserId,
        Instant createdAt,
        Instant updatedAt,
        Long version,
        String metadataJson) {
}
