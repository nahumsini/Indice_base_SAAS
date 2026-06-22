package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.permissions.HrPermissionApiException;
import com.indice.erp.hr.permissions.HrPermissionSecurityService;
import com.indice.erp.hr.permissions.PermissionActor;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPermissionSecurityServiceTest {

    @Mock
    private SessionAuthService sessionAuthService;

    @Mock
    private SessionCsrfService sessionCsrfService;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrAccessService hrAccessService;

    @Mock
    private HttpSession session;

    @Test
    void selfWriteAllowsNormalUserWhenReadablePermissionTabIsAllowed() {
        var service = new HrPermissionSecurityService(sessionAuthService, sessionCsrfService, jdbcTemplate, hrAccessService);
        givenPermissionActor("user");
        when(hrAccessService.canAccessReadableTab(12L, "user", HrTab.PERMISSIONS)).thenReturn(true);

        var actor = service.requireSelfWriteActor(session, "csrf-token");

        assertEquals(12L, actor.userCompanyId());
        assertEquals("user", actor.role());
        verify(sessionCsrfService).requireCsrf(session, "csrf-token");
    }

    private void givenPermissionActor(String role) {
        when(sessionAuthService.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(7L, 1L, 12L, "Attendance User", role)));
        when(jdbcTemplate.query(
            contains("FROM user_companies"),
            ArgumentMatchers.<RowMapper<PermissionActor>>any(),
            eq(7L),
            eq(1L)
        )).thenReturn(List.of(new PermissionActor(7L, 1L, 12L, "Attendance User", role, List.of())));
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(12L)
        )).thenReturn(List.of("human_resources"));
    }
}
