package com.indice.erp.hr.attendance.schedule;

import com.indice.erp.hr.attendance.models.LocationRow;
import java.time.LocalDate;


record ScheduleCandidateAssignment(
    long userCompanyId,
    long templateId,
    String templateName,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate
) {
}

record ScheduleCandidateWorkSiteAssignment(
    long id,
    long userCompanyId,
    LocationRow location,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate,
    String status
) {
}
