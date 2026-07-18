package com.indice.erp.kiosk.engine;

import java.time.Instant;
import java.util.Set;

public record KioskSessionPrincipal(
        String sessionId,
        long kioskDefinitionId,
        long companyId,
        String identityType,
        long identityId,
        Set<String> grantedCapabilities,
        Instant expiresAt) {
}
