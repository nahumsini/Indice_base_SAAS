package com.indice.erp.hr.attendance.models;

public record AttendanceOperationalState(
    boolean checkedIn,
    boolean onBreak
) {
}
