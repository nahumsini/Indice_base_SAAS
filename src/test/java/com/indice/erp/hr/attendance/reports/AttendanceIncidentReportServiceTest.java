package com.indice.erp.hr.attendance.reports;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.HrAttendanceScopeAccess;
import com.indice.erp.hr.attendance.HrAttendanceService;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static com.indice.erp.hr.attendance.reports.AttendanceIncidentReportContracts.*;

class AttendanceIncidentReportServiceTest {
    private final AttendanceIncidentReportRepository repository = mock(AttendanceIncidentReportRepository.class);
    private final HrAttendanceScopeAccess scope = mock(HrAttendanceScopeAccess.class);
    private final HrAttendanceService attendance = mock(HrAttendanceService.class);
    private final AttendanceIncidentReportService service = new AttendanceIncidentReportService(repository, scope, attendance);
    private final AuthSessionUser user = new AuthSessionUser(8L, 3L, "Test operator", "admin");
    private final LocalDate from = LocalDate.of(2026, 10, 1);
    private final Person person = new Person(7, "EMP-7", "Test collaborator", "", "", 1L, "Unit", 2L, "Business", null, null, "terminated");
    @Test void invalidAndOversizedRangesFailBeforeReadingAnyData() {
        assertThrows(IllegalArgumentException.class, () -> service.report(user, from, from.minusDays(1), null, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.report(user, from, from.plusDays(93), null, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.report(user, from, from, -1L, null, null));
        verifyNoInteractions(repository, attendance, scope);
    }
    @Test void narrowerScopeAndTenantArePassedToEverySource() {
        var unitScope = HrOperationalScope.unitHeadquarters(1L);
        when(scope.resolve(user)).thenReturn(unitScope);
        when(repository.people(3L, unitScope, from, from, 1L, 2L, 7L)).thenReturn(List.of(person));
        when(attendance.incidentReportDays(user, person, from, from)).thenReturn(List.of(
            new Day(from, "rest", "rest", null, null, null, 0, null, false, null)));
        var report = service.report(user, from, from, 1L, 2L, 7L);
        verify(scope).requireUserInScope(3L, unitScope, 7L);
        verify(attendance).incidentReportDays(user, person, from, from);
        assertEquals(1, report.employeeCount());
        assertEquals(1, report.totals().statuses().get("rest"));
        assertEquals("terminated", report.employees().getFirst().person().employmentStatus());
    }
    @Test void outOfScopeSelectionFailsBeforeRosterRead() {
        when(scope.resolve(user)).thenReturn(HrOperationalScope.unassigned());
        doThrow(new HrAccessDeniedException("Forbidden")).when(scope).requireUserInScope(3L, HrOperationalScope.unassigned(), 7L);
        assertThrows(HrAccessDeniedException.class, () -> service.report(user, from, from, null, null, 7L));
        verifyNoInteractions(repository, attendance);
    }
    @Test void oversizedTeamNeverReturnsPartialTotals() {
        var corporate = HrOperationalScope.corporateOffice(); when(scope.resolve(user)).thenReturn(corporate);
        when(repository.people(3L, corporate, from, from, null, null, null)).thenReturn(java.util.Collections.nCopies(201, person));
        assertThrows(IllegalArgumentException.class, () -> service.report(user, from, from, null, null, null));
        verifyNoInteractions(attendance);
    }
    @Test void emptyRosterHasValidZeroTotals() {
        when(scope.resolve(user)).thenReturn(HrOperationalScope.unassigned());
        when(repository.people(eq(3L), any(), eq(from), eq(from), isNull(), isNull(), isNull())).thenReturn(List.of());
        var report = service.report(user, from, from, null, null, null);
        assertEquals(0, report.employeeCount()); assertTrue(report.totals().statuses().isEmpty());
    }
}
