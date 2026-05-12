package com.indice.erp.hr.attendance.models;

import java.time.LocalDate;
import java.time.LocalDateTime;


public record DailyRecordRow(
    long id,
    long userCompanyId,
    LocalDate attendanceDate,
    String systemStatus,
    String correctedStatus,
    LocalDateTime firstCheckInAt,
    LocalDateTime lastCheckOutAt,
    int minutesLate,
    String notes,
    String firstPhotoObjectKey,
    String lastPhotoObjectKey,
    LocationRow firstLocation,
    LocationRow lastLocation
) {
}
