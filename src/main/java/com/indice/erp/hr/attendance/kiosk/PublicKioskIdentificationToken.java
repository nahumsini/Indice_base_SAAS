package com.indice.erp.hr.attendance.kiosk;


public record PublicKioskIdentificationToken(
    long userCompanyId,
    String authMethod,
    long expiresAtEpochSeconds
) {
}
