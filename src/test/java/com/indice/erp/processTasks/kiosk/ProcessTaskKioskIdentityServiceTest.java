package com.indice.erp.processTasks.kiosk;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class ProcessTaskKioskIdentityServiceTest {

    @Test
    void outOfScopeAndInvalidPinsUseTheSamePublicFailure() {
        var scope = mock(ProcessTaskAssignmentScopeService.class);
        var service = new ProcessTaskKioskIdentityService(
            mock(JdbcTemplate.class),
            mock(AttendanceKioskTokenService.class),
            scope,
            mock(BCryptPasswordEncoder.class)
        );
        var kiosk = new ProcessTaskKioskRow(
            11L, 7L, 3L, "Operations", 4L, "Warehouse", "TASKS", "Task access",
            "active", "ACTIVE", null, "opaque:test", "12345678", false, "{}", null, null
        );
        var employee = new ProcessTaskKioskEmployee(
            22L, 33L, "E-22", "Employee", "Operator", "Operations", "active"
        );
        doThrow(new IllegalArgumentException("Current user cannot access this kiosk scope."))
            .when(scope).requireKioskScopeAccess(7L, 33L, 3L, 4L);

        assertThatThrownBy(() -> service.requirePublicScope(kiosk, employee))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Credential validation failed.");
    }
}
