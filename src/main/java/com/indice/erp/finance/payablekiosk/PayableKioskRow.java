package com.indice.erp.finance.payablekiosk;

record PayableKioskRow(
        long id,
        long companyId,
        Long unitId,
        Long businessId,
        Long providerId,
        String code,
        String name,
        String status,
        String accessType,
        String publicAccessToken,
        String pinHash,
        String currencyCode,
        boolean allowProviderRegistration) {
}
