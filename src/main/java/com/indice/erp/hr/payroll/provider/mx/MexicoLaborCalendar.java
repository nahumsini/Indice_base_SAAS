package com.indice.erp.hr.payroll.provider.mx;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;

/** Ordinary LFT 71/73/74 coverage. Election/local/contractual calendars remain a separate input. */
final class MexicoLaborCalendar {
    private MexicoLaborCalendar() {}

    static boolean requiresPremiumReview(Map<String, Object> attendance) {
        if (!"on_time".equals(attendance.get("status")) && !"late".equals(attendance.get("status"))) return false;
        if (!(attendance.get("date") instanceof String value)) return true;
        var day = LocalDate.parse(value);
        return day.getDayOfWeek() == DayOfWeek.SUNDAY
            || Boolean.FALSE.equals(attendance.get("scheduledWorkday"))
            || mandatoryHoliday(day);
    }

    static boolean mandatoryHoliday(LocalDate day) {
        int month = day.getMonthValue(), date = day.getDayOfMonth();
        if ((month == 1 && date == 1) || (month == 5 && date == 1)
            || (month == 9 && date == 16) || (month == 12 && date == 25)) return true;
        if (month == 10 && date == 1 && Math.floorMod(day.getYear() - 2024, 6) == 0) return true;
        if (day.getDayOfWeek() != DayOfWeek.MONDAY) return false;
        return (month == 2 && date <= 7) || ((month == 3 || month == 11) && date >= 15 && date <= 21);
    }
}
