package com.indice.erp.hr.attendance.reports;

import com.indice.erp.hr.attendance.models.DailyRecordRow;
import com.indice.erp.hr.attendance.models.ScheduleRule;
import java.time.Duration;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.reports.AttendanceIncidentReportContracts.*;

public final class AttendanceIncidentReportProjection {
    private AttendanceIncidentReportProjection() { }

    public static List<Day> days(Person person, LocalDate from, LocalDate to,
                                  Map<LocalDate, DailyRecordRow> records,
                                  Function<LocalDate, ScheduleRule> rules) {
        return from.datesUntil(to.plusDays(1)).map(date -> {
            var record = records.get(date);
            var rule = rules.apply(date);
            var outsideEmployment = (person.hireDate() != null && date.isBefore(person.hireDate()))
                || (person.lastWorkingDay() != null && date.isAfter(person.lastWorkingDay()));
            var status = outsideEmployment ? "outside_employment" : resolveEffectiveStatus(record, rule, date);
            var checkIn = record == null ? null : record.firstCheckInAt();
            var checkOut = record == null ? null : record.lastCheckOutAt();
            Long recordedMinutes = checkIn != null && checkOut != null && !checkOut.isBefore(checkIn)
                ? Duration.between(checkIn, checkOut).toMinutes() : null;
            return new Day(date, status, resolveSystemStatus(record, rule, date),
                record == null ? null : record.correctedStatus(), checkIn, checkOut,
                record == null ? 0 : record.minutesLate(), recordedMinutes,
                (checkIn != null && checkOut == null) || (checkIn == null && checkOut != null),
                record == null ? null : record.notes());
        }).toList();
    }

    public static Totals totals(List<Day> days) {
        var counts = new LinkedHashMap<String, Long>();
        for (var day : days) counts.merge(day.status(), 1L, Long::sum);
        return new Totals(Map.copyOf(counts), days.stream().filter(d -> d.checkIn() != null).count(),
            days.stream().filter(Day::incomplete).count(),
            days.stream().filter(d -> "late".equals(d.status())).mapToLong(Day::minutesLate).sum(),
            days.stream().filter(d -> d.recordedMinutes() != null).mapToLong(Day::recordedMinutes).sum());
    }
}
