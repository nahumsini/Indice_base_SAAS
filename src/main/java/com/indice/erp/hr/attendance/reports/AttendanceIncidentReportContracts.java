package com.indice.erp.hr.attendance.reports;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class AttendanceIncidentReportContracts {
    private AttendanceIncidentReportContracts() { }

    public record Person(long id, String code, String name, String position, String department,
                         Long unitId, String unitName, Long businessId, String businessName,
                         LocalDate hireDate, LocalDate lastWorkingDay, String employmentStatus) { }

    public record Day(LocalDate date, String status, String systemStatus, String correctedStatus,
                      LocalDateTime checkIn, LocalDateTime checkOut, int minutesLate,
                      Long recordedMinutes, boolean incomplete, String notes) { }

    public record Totals(Map<String, Long> statuses, long daysWithEntry, long incompleteDays,
                         long minutesLate, long recordedMinutes) { }

    public record Employee(Person person, List<Day> days, Totals totals) { }

    public record Report(LocalDate from, LocalDate to, LocalDateTime generatedAt,
                         int calendarDays, int employeeCount, List<Employee> employees, Totals totals) { }
}
