package com.indice.erp.hr.attendance.models;

import java.time.LocalDate;


public record CurrentScheduleAssignment(
    long userCompanyId,
    long templateId,
    String templateName,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate
) {
}
