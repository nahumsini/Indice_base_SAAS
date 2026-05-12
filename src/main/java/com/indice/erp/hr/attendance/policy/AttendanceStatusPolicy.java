package com.indice.erp.hr.attendance.policy;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateMinutesLate;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateSystemStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.inferSystemStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


public final class AttendanceStatusPolicy {

    private AttendanceStatusPolicy() {
    }

    public static String calculateSystemStatus(
        boolean hasScheduleRule,
        boolean isRestDay,
        LocalTime startTime,
        int lateAfterMinutes,
        LocalTime endTime,
        LocalDateTime firstCheckIn,
        LocalDate attendanceDate
    ) {
        if (firstCheckIn == null) {
            return inferSystemStatus(hasScheduleRule, isRestDay, startTime, endTime, attendanceDate, LocalDate.now(), LocalDateTime.now());
        }
        if (!hasScheduleRule || isRestDay || startTime == null) {
            return "on_time";
        }

        var scheduledStart = attendanceDate.atTime(startTime);
        var allowedStart = scheduledStart.plusMinutes(lateAfterMinutes);
        return firstCheckIn.isAfter(allowedStart) ? "late" : "on_time";
    }

    public static int calculateMinutesLate(
        boolean hasScheduleRule,
        boolean isRestDay,
        LocalTime startTime,
        LocalDateTime firstCheckIn,
        LocalDate attendanceDate
    ) {
        if (!hasScheduleRule || startTime == null || firstCheckIn == null || isRestDay) {
            return 0;
        }
        var scheduledStart = attendanceDate.atTime(startTime);
        if (!firstCheckIn.isAfter(scheduledStart)) {
            return 0;
        }
        return (int) Duration.between(scheduledStart, firstCheckIn).toMinutes();
    }

    public static String inferSystemStatus(
        boolean hasScheduleRule,
        boolean isRestDay,
        LocalTime startTime,
        LocalTime endTime,
        LocalDate attendanceDate,
        LocalDate today,
        LocalDateTime now
    ) {
        if (!hasScheduleRule) {
            return "not_scheduled";
        }
        if (isRestDay) {
            return "rest";
        }

        if (attendanceDate.isAfter(today)) {
            return "pending";
        }
        if (endTime == null) {
            return attendanceDate.isBefore(today) ? "absence" : "pending";
        }

        var scheduledEnd = attendanceDate.atTime(endTime);
        if (startTime != null && endTime.isBefore(startTime)) {
            scheduledEnd = scheduledEnd.plusDays(1);
        }

        return now.isAfter(scheduledEnd) ? "absence" : "pending";
    }

    public static String resolveSystemStatus(
        String storedSystemStatus,
        String correctedStatus,
        boolean hasCheckIn,
        boolean hasCheckOut,
        String inferredSystemStatus
    ) {
        if ("absence".equals(storedSystemStatus) && !hasCheckIn && !hasCheckOut && isBlank(correctedStatus)) {
            return inferredSystemStatus;
        }
        return storedSystemStatus;
    }

    public static String resolveEffectiveStatus(String correctedStatus, String systemStatus) {
        return isBlank(correctedStatus) ? systemStatus : correctedStatus;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
