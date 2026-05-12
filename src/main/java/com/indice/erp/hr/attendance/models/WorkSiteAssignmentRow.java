package com.indice.erp.hr.attendance.models;

import java.time.LocalDate;


public record WorkSiteAssignmentRow(
    long id,
    long userCompanyId,
    LocationRow location,
    LocalDate effectiveStartDate,
    LocalDate effectiveEndDate,
    String status
) {
}
