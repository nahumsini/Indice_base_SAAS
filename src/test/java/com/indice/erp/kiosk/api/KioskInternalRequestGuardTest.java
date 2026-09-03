package com.indice.erp.kiosk.api;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class KioskInternalRequestGuardTest {

    private final SessionAuthService sessions = mock(SessionAuthService.class);
    private final SessionCsrfService csrf = mock(SessionCsrfService.class);
    private final HttpSession httpSession = mock(HttpSession.class);
    private final KioskInternalRequestGuard guard = new KioskInternalRequestGuard(sessions, csrf);

    @Test
    void rootAndSuperadminCanAdministerTheKioskCenter() {
        var root = new AuthSessionUser(1L, 7L, 11L, "Root", "root");
        when(sessions.currentUser(httpSession)).thenReturn(Optional.of(root));
        assertThat(guard.requireCenterRead(httpSession)).isSameAs(root);

        var superadmin = new AuthSessionUser(2L, 7L, 12L, "Owner", "super admin");
        when(sessions.currentUser(httpSession)).thenReturn(Optional.of(superadmin));
        assertThat(guard.requireCenterRead(httpSession)).isSameAs(superadmin);
    }

    @Test
    void ordinaryAdminCannotAdministerTheKioskCenter() {
        when(sessions.currentUser(httpSession)).thenReturn(Optional.of(
            new AuthSessionUser(3L, 7L, 13L, "Admin", "admin")));

        assertThatThrownBy(() -> guard.requireCenterRead(httpSession))
            .isInstanceOf(KioskInternalAccessException.class);
    }
}
