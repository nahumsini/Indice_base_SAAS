package com.indice.erp.hr.attendance.policy;

import java.time.LocalDate;

public final class AttendanceEditPolicy {

    private AttendanceEditPolicy() {
    }

    public static void requireEditable(LocalDate hireDate, LocalDate attendanceDate) {
        var reason = lockReason(hireDate, attendanceDate);
        if (reason != null) {
            throw new IllegalArgumentException(reason);
        }
    }

    public static String lockReason(LocalDate hireDate, LocalDate attendanceDate) {
        if (hireDate != null && attendanceDate.isBefore(hireDate)) {
            return "Attendance can only be edited on or after this employee's hire date: " + hireDate + ".";
        }
        return null;
    }
}
