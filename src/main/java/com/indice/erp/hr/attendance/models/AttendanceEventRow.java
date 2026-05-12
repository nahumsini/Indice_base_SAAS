package com.indice.erp.hr.attendance.models;

import java.time.LocalDate;
import java.time.LocalDateTime;


public record AttendanceEventRow(
    long id,
    String eventType,
    LocalDateTime eventTimestamp,
    LocalDate attendanceDate,
    Long locationId,
    Long kioskDeviceId,
    String authMethod,
    String resultStatus,
    String eventKind,
    String notes,
    String metadataJson,
    Long supersedesEventId,
    Long createdBy
) {
}
