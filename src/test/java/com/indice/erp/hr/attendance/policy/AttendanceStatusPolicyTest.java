package com.indice.erp.hr.attendance.policy;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class AttendanceStatusPolicyTest {

    @Test
    void overnightShiftRemainsPendingUntilNextDayEndTime() {
        var attendanceDate = LocalDate.of(2026, 4, 29);

        assertThat(AttendanceStatusPolicy.inferSystemStatus(
            true,
            false,
            LocalTime.of(18, 0),
            LocalTime.of(6, 0),
            attendanceDate,
            LocalDate.of(2026, 4, 30),
            LocalDateTime.of(2026, 4, 30, 5, 30)
        )).isEqualTo("pending");

        assertThat(AttendanceStatusPolicy.inferSystemStatus(
            true,
            false,
            LocalTime.of(18, 0),
            LocalTime.of(6, 0),
            attendanceDate,
            LocalDate.of(2026, 4, 30),
            LocalDateTime.of(2026, 4, 30, 6, 30)
        )).isEqualTo("absence");
    }

    @Test
    void lateMinutesUseTheAssignedAttendanceDateForOvernightShifts() {
        assertThat(AttendanceStatusPolicy.calculateMinutesLate(
            true,
            false,
            LocalTime.of(18, 0),
            LocalDateTime.of(2026, 4, 29, 18, 12),
            LocalDate.of(2026, 4, 29)
        )).isEqualTo(12);
    }
}
