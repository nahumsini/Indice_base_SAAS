package com.indice.erp.kiosk.engine;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class MultiKioskTodayServiceTest {
    @Test void unavailableToolsExposeNoPersonalDataAndNoOwnerIsQueried() {
        var sessions = mock(MultiKioskService.class);
        var dashboard = mock(KioskMultiDashboardService.class);
        var hr = mock(HrAttendanceService.class);
        var tasks = mock(ProcessTaskKioskService.class);
        var user = new AuthSessionUser(12L, 7L, 18L, "Employee", "user");
        when(sessions.employeeContext("link", "pin", "browser")).thenReturn(new MultiKioskService.EmployeeContext(9, user));
        var result = new MultiKioskTodayService(sessions, dashboard, hr, tasks).today("link", "pin", "browser");
        assertThat(result.attendance()).isNull(); assertThat(result.tasks()).isNull();
        verify(dashboard).personalOverviewDefinition(user, 9, "employee.attendance@1", "attendance.punch.create@1");
        verify(dashboard).personalOverviewDefinition(user, 9, "employee.my-tasks@1", "process-tasks.tasks.read@1");
        verifyNoInteractions(hr, tasks);
    }
    @Test void revokedParentCannotReachTheCatalogueOrOwners() {
        var sessions = mock(MultiKioskService.class);
        var dashboard = mock(KioskMultiDashboardService.class);
        var hr = mock(HrAttendanceService.class);
        var tasks = mock(ProcessTaskKioskService.class);
        when(sessions.employeeContext(anyString(), anyString(), anyString())).thenThrow(new SecurityException());
        assertThatThrownBy(() -> new MultiKioskTodayService(sessions, dashboard, hr, tasks).today("link", "pin", "browser"))
            .isInstanceOf(SecurityException.class);
        verifyNoInteractions(dashboard, hr, tasks);
    }
}
