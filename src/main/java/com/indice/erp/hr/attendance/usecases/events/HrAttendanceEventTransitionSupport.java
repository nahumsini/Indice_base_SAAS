package com.indice.erp.hr.attendance.usecases.events;

import com.indice.erp.hr.attendance.models.AttendanceEventRow;
import com.indice.erp.hr.attendance.models.AttendanceOperationalState;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;


public abstract class HrAttendanceEventTransitionSupport extends HrAttendanceEventDateSupport {

    protected HrAttendanceEventTransitionSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected void validateOperationalEventTransition(
        long companyId,
        long userCompanyId,
        LocalDate attendanceDate,
        LocalDateTime eventTimestamp,
        String eventKind
    ) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return;
        }

        var dayEvents = loadAttendanceEventRows(companyId, userCompanyId, attendanceDate);
        var priorEvents = dayEvents.stream()
            .filter((event) -> !event.eventTimestamp().isAfter(eventTimestamp))
            .toList();
        var state = resolveOperationalState(priorEvents);
        var checkInAlreadyRecorded = dayEvents.stream()
            .anyMatch((event) -> "check_in".equals(event.eventKind()) || "check_in".equals(event.eventType()));

        switch (eventKind) {
            case "check_in" -> {
                var openDailyRecord = attendanceDailyRecordRepository.loadOpenDailyRecord(companyId, userCompanyId, attendanceDate);
                if (openDailyRecord != null) {
                    var locationName = openDailyRecord.firstLocation() == null ? "" : " at " + openDailyRecord.firstLocation().name();
                    throw new IllegalArgumentException(
                        "HR user is already checked in"
                            + locationName
                            + " since "
                            + openDailyRecord.firstCheckInAt()
                            + ". Check out before starting a new shift."
                    );
                }
                if (checkInAlreadyRecorded) {
                    throw new IllegalArgumentException("Check-in has already been recorded for this user shift.");
                }
            }
            case "break_out" -> {
                if (!state.checkedIn()) {
                    throw new IllegalArgumentException("Break-out requires an active check-in.");
                }
                if (state.onBreak()) {
                    throw new IllegalArgumentException("A break is already active for this user.");
                }
            }
            case "break_in" -> {
                if (!state.checkedIn() || !state.onBreak()) {
                    throw new IllegalArgumentException("Break-in requires an active break.");
                }
            }
            case "check_out" -> {
                if (!state.checkedIn()) {
                    throw new IllegalArgumentException("Check-out requires an active check-in.");
                }
                if (state.onBreak()) {
                    throw new IllegalArgumentException("Close the active break before checking out.");
                }
            }
            default -> {
            }
        }
    }

    protected void validateUserOperationalEventTransition(
        long companyId,
        long userId,
        LocalDate attendanceDate,
        LocalDateTime eventTimestamp,
        String eventKind
    ) {
        if (!List.of("check_in", "check_out", "break_out", "break_in").contains(eventKind)) {
            return;
        }

        var dayEvents = loadUserAttendanceEventRows(companyId, userId, attendanceDate);
        var priorEvents = dayEvents.stream()
            .filter((event) -> !event.eventTimestamp().isAfter(eventTimestamp))
            .toList();
        var state = resolveOperationalState(priorEvents);
        var checkInAlreadyRecorded = dayEvents.stream()
            .anyMatch((event) -> "check_in".equals(event.eventKind()) || "check_in".equals(event.eventType()));

        switch (eventKind) {
            case "check_in" -> {
                if (checkInAlreadyRecorded) {
                    throw new IllegalArgumentException("Check-in has already been recorded for this user shift.");
                }
            }
            case "break_out" -> {
                if (!state.checkedIn()) {
                    throw new IllegalArgumentException("Break-out requires an active check-in.");
                }
                if (state.onBreak()) {
                    throw new IllegalArgumentException("A break is already active for this user.");
                }
            }
            case "break_in" -> {
                if (!state.checkedIn() || !state.onBreak()) {
                    throw new IllegalArgumentException("Break-in requires an active break.");
                }
            }
            case "check_out" -> {
                if (!state.checkedIn()) {
                    throw new IllegalArgumentException("Check-out requires an active check-in.");
                }
                if (state.onBreak()) {
                    throw new IllegalArgumentException("Close the active break before checking out.");
                }
            }
            default -> {
            }
        }
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

    protected boolean isOperationalAttendanceEvent(String eventKind) {
        return "check_in".equals(eventKind)
            || "check_out".equals(eventKind)
            || "break_out".equals(eventKind)
            || "break_in".equals(eventKind);
    }
}
