package com.indice.erp.hr.attendance.reports;

import com.indice.erp.hr.attendance.models.DailyRecordRow;
import com.indice.erp.hr.attendance.models.ScheduleRule;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.indice.erp.hr.attendance.reports.AttendanceIncidentReportContracts.*;

class AttendanceIncidentReportProjectionTest {
    private final LocalDate date = LocalDate.of(2026, 10, 1);
    private Person person(LocalDate hire, LocalDate last) {
        return new Person(7, "EMP-7", "Test collaborator", "", "", 1L, "Unit", 2L, "Business", hire, last, "active");
    }
    private ScheduleRule rule(boolean rest) {
        return new ScheduleRule(7, 1, "strict", false, false, null, "", LocalTime.of(9, 0), LocalTime.of(17, 0), 0, 0, 5, rest);
    }
    private DailyRecordRow record(String status, String corrected, boolean entry, boolean exit) {
        return new DailyRecordRow(1, 7, date, status, corrected, entry ? date.atTime(9, 20) : null,
            exit ? date.plusDays(1).atTime(1, 0) : null, 20, "Private note", null, null, null, null, null, null, null, null);
    }
    @Test void unscheduledDaysAreNotAbsencesAndRestRemainsSeparate() {
        var days = AttendanceIncidentReportProjection.days(person(null, null), date, date.plusDays(2), Map.of(),
            d -> d.equals(date) ? null : rule(d.equals(date.plusDays(1))));
        assertEquals(java.util.List.of("not_scheduled", "rest", "absence"), days.stream().map(Day::status).toList());
        assertEquals(3, AttendanceIncidentReportProjection.totals(days).statuses().values().stream().mapToLong(Long::longValue).sum());
    }
    @Test void correctionWinsWithoutErasingTheOriginalStatusOrPunches() {
        var days = AttendanceIncidentReportProjection.days(person(null, null), date, date,
            Map.of(date, record("late", "leave", true, true)), d -> rule(false));
        assertEquals("leave", days.getFirst().status());
        assertEquals("late", days.getFirst().systemStatus());
        assertNotNull(days.getFirst().checkIn());
        assertEquals(1, AttendanceIncidentReportProjection.totals(days).daysWithEntry());
        assertEquals(0, AttendanceIncidentReportProjection.totals(days).minutesLate());
    }
    @Test void hireAndLastWorkingDatesAreInclusiveAndDoNotCreateFalseAbsences() {
        var days = AttendanceIncidentReportProjection.days(person(date.plusDays(1), date.plusDays(2)),
            date, date.plusDays(3), Map.of(), d -> rule(false));
        assertEquals(java.util.List.of("outside_employment", "absence", "absence", "outside_employment"), days.stream().map(Day::status).toList());
    }
    @Test void futureDaysRemainPending() {
        var future = LocalDate.now().plusMonths(2);
        var days = AttendanceIncidentReportProjection.days(person(null, null), future, future, Map.of(), d -> rule(false));
        assertEquals("pending", days.getFirst().status());
    }
    @Test void overnightPunchesRemainOnTheirAttendanceDayAndAreNotIncomplete() {
        var days = AttendanceIncidentReportProjection.days(person(null, null), date, date,
            Map.of(date, record("late", null, true, true)), d -> rule(false));
        assertEquals(date.plusDays(1), days.getFirst().checkOut().toLocalDate());
        assertEquals(940L, days.getFirst().recordedMinutes());
        assertFalse(days.getFirst().incomplete());
        assertEquals(20, AttendanceIncidentReportProjection.totals(days).minutesLate());
    }
    @Test void missingExitIsVisibleAndDoesNotInventWorkedTime() {
        var days = AttendanceIncidentReportProjection.days(person(null, null), date, date,
            Map.of(date, record("on_time", null, true, false)), d -> rule(false));
        assertTrue(days.getFirst().incomplete());
        assertNull(days.getFirst().recordedMinutes());
        assertEquals(1, AttendanceIncidentReportProjection.totals(days).incompleteDays());
    }
}
