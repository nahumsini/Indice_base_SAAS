package com.indice.erp.hr.attendance.kiosk;


public record KioskDeviceRow(
    long id,
    long companyId,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName,
    Long locationId,
    String locationName,
    String code,
    String name,
    String status,
    String publicAccessToken,
    String metadataJson
) {
}
