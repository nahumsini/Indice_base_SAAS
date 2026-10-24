package com.indice.erp.hr.attendance.reports;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.attendance.HrAttendanceScopeAccess;
import com.indice.erp.hr.attendance.HrAttendanceService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.hr.attendance.reports.AttendanceIncidentReportContracts.*;

@Service
public class AttendanceIncidentReportService {
    private final AttendanceIncidentReportRepository repository;
    private final HrAttendanceScopeAccess scopeAccess;
    private final HrAttendanceService attendance;

    public AttendanceIncidentReportService(AttendanceIncidentReportRepository repository,
        HrAttendanceScopeAccess scopeAccess, HrAttendanceService attendance) {
        this.repository = repository; this.scopeAccess = scopeAccess; this.attendance = attendance;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Report report(AuthSessionUser user, LocalDate from, LocalDate to,
                         Long unitId, Long businessId, Long employeeId) {
        if (from == null || to == null || from.getYear() < 1900 || to.getYear() > 9999
            || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 92)
            throw new IllegalArgumentException("Select a valid period of up to 93 days.");
        for (var id : new Long[] {unitId, businessId, employeeId})
            if (id != null && id <= 0) throw new IllegalArgumentException("Invalid report filter.");
        var scope = scopeAccess.resolve(user);
        if (employeeId != null) scopeAccess.requireUserInScope(user.companyId(), scope, employeeId);
        var people = repository.people(user.companyId(), scope, from, to, unitId, businessId, employeeId);
        if (employeeId != null && people.isEmpty()) throw new NoSuchElementException("Collaborator not found in this period.");
        int calendarDays = (int) ChronoUnit.DAYS.between(from, to) + 1;
        if (people.size() > 200 || (long) people.size() * calendarDays > 10000)
            throw new IllegalArgumentException("Narrow the period or select a unit, business or collaborator.");
        var employees = new ArrayList<Employee>();
        for (var person : people) {
            var days = attendance.incidentReportDays(user, person, from, to);
            employees.add(new Employee(person, days, AttendanceIncidentReportProjection.totals(days)));
        }
        var allDays = employees.stream().flatMap(e -> e.days().stream()).toList();
        return new Report(from, to, LocalDateTime.now(), calendarDays, employees.size(), java.util.List.copyOf(employees),
            AttendanceIncidentReportProjection.totals(allDays));
    }
}
