package com.indice.erp.hr.attendance.usecases.events;

import com.indice.erp.hr.attendance.models.AttendanceEventRow;
import com.indice.erp.hr.attendance.models.AttendanceOperationalState;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.isOvernightSchedule;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.scheduledEndDateTime;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;


public abstract class HrAttendanceEventDateSupport extends HrAttendanceEventReadSupport {

    protected HrAttendanceEventDateSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected LocalDate resolveOperationalAttendanceDate(
        long companyId,
        long userCompanyId,
        LocalDateTime eventTimestamp,
        String eventKind
    ) {
        var eventDate = eventTimestamp.toLocalDate();
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return eventDate;
        }

        var previousDate = eventDate.minusDays(1);
        var previousRule = loadScheduleRule(companyId, userCompanyId, previousDate);
        if (!isOvernightSchedule(previousRule)) {
            return eventDate;
        }

        var previousDayEvents = loadAttendanceEventRows(companyId, userCompanyId, previousDate).stream()
            .filter((event) -> !event.eventTimestamp().isAfter(eventTimestamp))
            .toList();
        var previousState = resolveOperationalState(previousDayEvents);
        if (previousState.checkedIn()) {
            return previousDate;
        }

        var previousScheduledEnd = scheduledEndDateTime(previousDate, previousRule);
        return eventTimestamp.isAfter(previousScheduledEnd) ? eventDate : previousDate;
    }

    protected LocalDate resolveUserOperationalAttendanceDate(
        long companyId,
        long userId,
        LocalDateTime eventTimestamp,
        String eventKind
    ) {
        var eventDate = eventTimestamp.toLocalDate();
        if (!List.of("check_out", "break_out", "break_in").contains(eventKind)) {
            return eventDate;
        }

        var previousDate = eventDate.minusDays(1);
        var previousDayEvents = loadUserAttendanceEventRows(companyId, userId, previousDate).stream()
            .filter((event) -> !event.eventTimestamp().isAfter(eventTimestamp))
            .toList();
        var previousState = resolveOperationalState(previousDayEvents);
        return previousState.checkedIn() ? previousDate : eventDate;
    }

    protected void validateOperationalEventDate(String eventKind, LocalDateTime eventTimestamp) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return;
        }

        if (!eventTimestamp.toLocalDate().equals(LocalDate.now())) {
            throw new IllegalArgumentException("Attendance can only be recorded for today.");
        }
    }

    protected LocalDateTime resolveManualAttendanceTimestamp(LocalDate attendanceDate, String eventKind, Map<String, Object> payload) {
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            var eventDate = HrPayloadUtils.parseDate(payload, "event_date");
            if (eventDate == null) {
                eventDate = attendanceDate;
            }
            var eventTime = parseTime(payload, "event_time");
            if (eventTime == null) {
                eventTime = parseTime(payload, "time");
            }
            if (eventTime == null) {
                throw new IllegalArgumentException("event_time is required.");
            }
            eventTimestamp = eventDate.atTime(eventTime);
        }

        if (eventTimestamp.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Manual attendance cannot be recorded in the future.");
        }

        var eventDate = eventTimestamp.toLocalDate();
        if ("check_out".equals(eventKind)) {
            if (!eventDate.equals(attendanceDate) && !eventDate.equals(attendanceDate.plusDays(1))) {
                throw new IllegalArgumentException("Manual check-out must be on the attendance date or the next day for overnight shifts.");
            }
            return eventTimestamp;
        }

        if (!eventDate.equals(attendanceDate)) {
            throw new IllegalArgumentException("Manual check-in must be on the attendance date.");
        }
        return eventTimestamp;
    }

    protected AttendanceOperationalState resolveOperationalState(List<AttendanceEventRow> events) {
        boolean checkedIn = false;
        boolean onBreak = false;

        for (var event : events) {
            if (!"success".equals(event.resultStatus()) && !"overridden".equals(event.resultStatus())) {
                continue;
            }

            switch (event.eventKind()) {
                case "check_in" -> {
                    checkedIn = true;
                    onBreak = false;
                }
                case "break_out" -> {
                    if (checkedIn) {
                        onBreak = true;
                    }
                }
                case "break_in" -> {
                    if (checkedIn) {
                        onBreak = false;
                    }
                }
                case "check_out" -> {
                    checkedIn = false;
                    onBreak = false;
                }
                default -> {
                }
            }
        }

        return new AttendanceOperationalState(checkedIn, onBreak);
    }
}
