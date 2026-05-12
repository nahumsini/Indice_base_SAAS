package com.indice.erp.hr.attendance.models;

import java.time.LocalDate;


public record AttendanceHrUser(
    long id,
    String userCode,
    String fullName,
    String positionTitle,
    String department,
    LocalDate hireDate,
    String status,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName
) {
}
