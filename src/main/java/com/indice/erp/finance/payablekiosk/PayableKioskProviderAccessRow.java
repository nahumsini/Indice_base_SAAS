package com.indice.erp.finance.payablekiosk;

import java.time.Instant;

record PayableKioskProviderAccessRow(
        long id,
        long companyId,
        long kioskId,
        long providerId,
        String providerName,
        String kioskName,
        String publicAccessToken,
        String pinHash,
        String status,
        Instant lockedUntil) {
}
