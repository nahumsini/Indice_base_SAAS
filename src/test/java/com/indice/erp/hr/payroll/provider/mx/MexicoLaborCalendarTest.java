package com.indice.erp.hr.payroll.provider.mx;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MexicoLaborCalendarTest {
    @Test void lft2026FixedAndMovedHolidays() {
        for (String day : List.of("2026-01-01", "2026-02-02", "2026-03-16", "2026-05-01", "2026-09-16", "2026-11-16", "2026-12-25"))
            assertTrue(MexicoLaborCalendar.mandatoryHoliday(LocalDate.parse(day)), day);
        for (String day : List.of("2026-02-05", "2026-03-21", "2026-11-20", "2026-10-01"))
            assertFalse(MexicoLaborCalendar.mandatoryHoliday(LocalDate.parse(day)), day);
        assertTrue(MexicoLaborCalendar.mandatoryHoliday(LocalDate.of(2030, 10, 1)));
    }
    @Test void onlyActualWorkTriggersThePremiumHold() {
        assertTrue(MexicoLaborCalendar.requiresPremiumReview(Map.of("date", "2026-10-18", "status", "on_time", "scheduledWorkday", true)));
        assertTrue(MexicoLaborCalendar.requiresPremiumReview(Map.of("date", "2026-10-13", "status", "late", "scheduledWorkday", false)));
        assertTrue(MexicoLaborCalendar.requiresPremiumReview(Map.of("date", "2026-09-16", "status", "on_time", "scheduledWorkday", true)));
        assertFalse(MexicoLaborCalendar.requiresPremiumReview(Map.of("date", "2026-10-18", "status", "rest", "scheduledWorkday", false)));
        assertFalse(MexicoLaborCalendar.requiresPremiumReview(Map.of("date", "2026-10-13", "status", "on_time", "scheduledWorkday", true)));
    }
}
