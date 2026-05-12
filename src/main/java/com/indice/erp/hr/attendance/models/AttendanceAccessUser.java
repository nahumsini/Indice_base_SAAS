package com.indice.erp.hr.attendance.models;

public record AttendanceAccessUser(
    long userCompanyId,
    long userId,
    String status
) {
}
