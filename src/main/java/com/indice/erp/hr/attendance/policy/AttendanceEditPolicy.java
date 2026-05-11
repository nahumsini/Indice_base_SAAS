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
            return "Attendance can only be edited on or after this user's hire date: " + hireDate + ".";
        }
        if (attendanceDate.isAfter(LocalDate.now())) {
            return "Attendance cannot be marked for a future date.";
        }
        return null;
    }
}
