package com.indice.erp.kiosk.engine;

import java.time.Instant;
import java.util.Objects;

public record KioskResolvedDefinition(
        long id,
        long companyId,
        String ownerModule,
        String kioskType,
        Long legacyReferenceId,
        String code,
        String name,
        KioskDefinitionStatus status,
        Long unitId,
        Long businessId,
        Long locationId,
        KioskAccessLevel accessLevel,
        Instant expiresAt,
        String publicTokenHint,
        boolean legacyTokenRecoverable,
        int configurationVersion,
        int adapterVersion) {

    public KioskResolvedDefinition {
        Objects.requireNonNull(ownerModule, "ownerModule is required.");
        Objects.requireNonNull(status, "status is required.");
        Objects.requireNonNull(accessLevel, "accessLevel is required.");
    }

    public KioskDefinitionStatus effectiveStatus(Instant now) {
        if (status == KioskDefinitionStatus.ACTIVE && expiresAt != null && !expiresAt.isAfter(now)) {
            return KioskDefinitionStatus.EXPIRED;
        }
        return status;
    }
}
