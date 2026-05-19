package com.indice.erp.hr.attendance.models;

import java.time.LocalDateTime;


public record ControlActivityRow(
    long id,
    long userCompanyId,
    String userCode,
    String userName,
    Long kioskDeviceId,
    String kioskDeviceName,
    Long locationId,
    String locationName,
    String eventType,
    String eventKind,
    String authMethod,
    String resultStatus,
    LocalDateTime eventTimestamp,
    String photoObjectKey,
    String notes,
    String metadataJson
) {
}
