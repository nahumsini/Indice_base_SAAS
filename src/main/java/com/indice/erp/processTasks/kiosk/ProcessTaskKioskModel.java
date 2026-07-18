package com.indice.erp.processTasks.kiosk;

record ProcessTaskKioskRow(
    long id,
    long companyId,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName,
    String code,
    String name,
    String status,
    String engineStatus,
    String expiresAt,
    String publicAccessToken,
    String publicTokenHint,
    boolean legacyTokenRecoverable,
    String metadataJson,
    String createdAt,
    String updatedAt
) {
}

record ProcessTaskKioskEmployee(
    long userCompanyId,
    long userId,
    String userCode,
    String fullName,
    String positionTitle,
    String department,
    String status
) {
}

record ProcessTaskKioskPinCandidate(
    long userCompanyId,
    long userId,
    String userCode,
    String fullName,
    String positionTitle,
    String department,
    String status,
    String credentialRef,
    String secretHash
) {
}

record ProcessTaskPublicKioskContext(
    ProcessTaskKioskRow kiosk,
    ProcessTaskKioskEmployee employee
) {
}
