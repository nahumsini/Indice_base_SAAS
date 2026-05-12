package com.indice.erp.hr.attendance.models;

import java.time.LocalDate;
import java.time.LocalDateTime;


public record AutoCheckoutCandidate(
    long companyId,
    long userCompanyId,
    LocalDate attendanceDate,
    LocalDateTime firstCheckInAt,
    Long firstLocationId
) {
}
