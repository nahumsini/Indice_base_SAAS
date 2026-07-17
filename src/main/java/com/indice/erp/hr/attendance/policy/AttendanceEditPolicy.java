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

    public static void requireCorrectionEditable(
        LocalDate hireDate,
        LocalDate attendanceDate,
        String targetStatus,
        String currentCorrectedStatus
    ) {
        var reason = correctionLockReason(hireDate, attendanceDate, targetStatus, currentCorrectedStatus);
        if (reason != null) {
            throw new IllegalArgumentException(reason);
        }
    }

    public static String lockReason(LocalDate hireDate, LocalDate attendanceDate) {
        var hireDateReason = hireDateLockReason(hireDate, attendanceDate);
        if (hireDateReason != null) {
            return hireDateReason;
        }
        if (attendanceDate.isAfter(LocalDate.now())) {
            return "Attendance cannot be marked for a future date.";
        }
        return null;
    }

    public static String correctionLockReason(
        LocalDate hireDate,
        LocalDate attendanceDate,
        String targetStatus,
        String currentCorrectedStatus
    ) {
        var hireDateReason = hireDateLockReason(hireDate, attendanceDate);
        if (hireDateReason != null) {
            return hireDateReason;
        }

        if (!attendanceDate.isAfter(LocalDate.now())) {
            return null;
        }

        var schedulesRest = "rest".equals(targetStatus);
        var clearsScheduledRest = isBlank(targetStatus) && "rest".equals(currentCorrectedStatus);
        return schedulesRest || clearsScheduledRest
            ? null
            : "Attendance cannot be marked for a future date.";
    }

    private static String hireDateLockReason(LocalDate hireDate, LocalDate attendanceDate) {
        return hireDate != null && attendanceDate.isBefore(hireDate)
            ? "Attendance can only be edited on or after this user's hire date: " + hireDate + "."
            : null;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
