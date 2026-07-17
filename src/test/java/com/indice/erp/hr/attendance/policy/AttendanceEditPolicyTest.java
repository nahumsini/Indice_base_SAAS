package com.indice.erp.hr.attendance.policy;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;


class AttendanceEditPolicyTest {

    @Test
    void futureRestCanBeScheduled() {
        var futureDate = LocalDate.now().plusDays(7);

        assertDoesNotThrow(() ->
            AttendanceEditPolicy.requireCorrectionEditable(null, futureDate, "rest", null)
        );
    }

    @Test
    void scheduledFutureRestCanBeCleared() {
        var futureDate = LocalDate.now().plusDays(7);

        assertDoesNotThrow(() ->
            AttendanceEditPolicy.requireCorrectionEditable(null, futureDate, null, "rest")
        );
    }

    @Test
    void otherFutureAttendanceStatusesRemainLocked() {
        var futureDate = LocalDate.now().plusDays(7);

        for (var status : new String[] {"on_time", "late", "leave", "absence", null}) {
            var error = assertThrows(
                IllegalArgumentException.class,
                () -> AttendanceEditPolicy.requireCorrectionEditable(null, futureDate, status, null)
            );
            assertEquals("Attendance cannot be marked for a future date.", error.getMessage());
        }
    }

    @Test
    void futureRestBeforeHireDateRemainsLocked() {
        var hireDate = LocalDate.now().plusDays(10);
        var restDate = hireDate.minusDays(1);

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> AttendanceEditPolicy.requireCorrectionEditable(hireDate, restDate, "rest", null)
        );

        assertEquals(
            "Attendance can only be edited on or after this user's hire date: " + hireDate + ".",
            error.getMessage()
        );
    }
}
