package com.indice.erp.hr.attendance;

import com.indice.erp.hr.attendance.models.DailyRecordRow;
import com.indice.erp.hr.attendance.models.ScheduleRule;
import com.indice.erp.hr.attendance.policy.AttendanceStatusPolicy;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateMinutesLate;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateSystemStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.inferSystemStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.isOpenSchedule;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.isOvernightSchedule;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.scheduledEndDateTime;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.validateScheduleRegistrationPolicy;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public final class AttendanceSchedulePolicy {

    private static final Duration EARLY_CHECK_IN_ALLOWANCE = Duration.ofMinutes(15);

    private AttendanceSchedulePolicy() {
    }

    public static String calculateSystemStatus(ScheduleRule scheduleRule, LocalDateTime firstCheckIn, LocalDate date) {
        return AttendanceStatusPolicy.calculateSystemStatus(
            scheduleRule != null,
            scheduleRule != null && scheduleRule.isRestDay(),
            scheduleRule == null ? null : scheduleRule.startTime(),
            scheduleRule == null ? 0 : scheduleRule.lateAfterMinutes(),
            scheduleRule == null ? null : scheduleRule.endTime(),
            firstCheckIn,
            date
        );
    }

    public static int calculateMinutesLate(ScheduleRule scheduleRule, LocalDateTime firstCheckIn) {
        var attendanceDate = firstCheckIn == null ? LocalDate.now() : firstCheckIn.toLocalDate();
        return calculateMinutesLate(scheduleRule, firstCheckIn, attendanceDate);
    }

    public static int calculateMinutesLate(ScheduleRule scheduleRule, LocalDateTime firstCheckIn, LocalDate attendanceDate) {
        return AttendanceStatusPolicy.calculateMinutesLate(
            scheduleRule != null,
            scheduleRule != null && scheduleRule.isRestDay(),
            scheduleRule == null ? null : scheduleRule.startTime(),
            firstCheckIn,
            attendanceDate
        );
    }

    public static String inferSystemStatus(ScheduleRule scheduleRule, LocalDate date) {
        return AttendanceStatusPolicy.inferSystemStatus(
            scheduleRule != null,
            scheduleRule != null && scheduleRule.isRestDay(),
            scheduleRule == null ? null : scheduleRule.startTime(),
            scheduleRule == null ? null : scheduleRule.endTime(),
            date,
            LocalDate.now(),
            LocalDateTime.now()
        );
    }

    public static String resolveSystemStatus(DailyRecordRow dailyRecord, ScheduleRule scheduleRule, LocalDate date) {
        if (dailyRecord == null) {
            return inferSystemStatus(scheduleRule, date);
        }

        return AttendanceStatusPolicy.resolveSystemStatus(
            dailyRecord.systemStatus(),
            dailyRecord.correctedStatus(),
            dailyRecord.firstCheckInAt() != null,
            dailyRecord.lastCheckOutAt() != null,
            inferSystemStatus(scheduleRule, date)
        );
    }

    public static String resolveEffectiveStatus(DailyRecordRow dailyRecord, ScheduleRule scheduleRule, LocalDate date) {
        return AttendanceStatusPolicy.resolveEffectiveStatus(
            dailyRecord == null ? null : dailyRecord.correctedStatus(),
            resolveSystemStatus(dailyRecord, scheduleRule, date)
        );
    }

    public static boolean isOpenSchedule(ScheduleRule scheduleRule) {
        return scheduleRule != null && "open".equalsIgnoreCase(safe(scheduleRule.scheduleMode()));
    }

    public static boolean isOvernightSchedule(ScheduleRule scheduleRule) {
        return scheduleRule != null
            && !scheduleRule.isRestDay()
            && !isOpenSchedule(scheduleRule)
            && scheduleRule.startTime() != null
            && scheduleRule.endTime() != null
            && scheduleRule.endTime().isBefore(scheduleRule.startTime());
    }

    public static LocalDateTime scheduledEndDateTime(LocalDate attendanceDate, ScheduleRule scheduleRule) {
        var scheduledEnd = attendanceDate.atTime(scheduleRule.endTime());
        return isOvernightSchedule(scheduleRule) ? scheduledEnd.plusDays(1) : scheduledEnd;
    }

    public static void validateScheduleRegistrationPolicy(
        ScheduleRule scheduleRule,
        String eventType,
        LocalDateTime eventTimestamp,
        LocalDate attendanceDate
    ) {
        if (scheduleRule == null || scheduleRule.isRestDay() || !"check_in".equals(eventType)) {
            return;
        }

        if (isOpenSchedule(scheduleRule)) {
            return;
        }

        if (scheduleRule.startTime() != null) {
            var scheduledStart = attendanceDate.atTime(scheduleRule.startTime());
            var earliestAllowedCheckIn = scheduledStart.minus(EARLY_CHECK_IN_ALLOWANCE);
            if (eventTimestamp.isBefore(earliestAllowedCheckIn)) {
                throw new IllegalArgumentException("Check-in opens 15 minutes before the scheduled start time.");
            }
        }
    }
}
