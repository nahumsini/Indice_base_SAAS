package com.indice.erp.kiosk.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.MultiKioskService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MultiKioskPublicV2ControllerTest {

    private final KioskEngineFeatureFlags flags = mock(KioskEngineFeatureFlags.class);
    private final SessionCsrfService csrf = mock(SessionCsrfService.class);
    private final MultiKioskService multiKiosks = mock(MultiKioskService.class);
    private final HttpSession session = mock(HttpSession.class);
    private MultiKioskPublicV2Controller controller;

    @BeforeEach
    void setUp() {
        when(flags.registryEnabled()).thenReturn(true);
        when(flags.sessionsEnabled()).thenReturn(true);
        when(flags.auditEnabled()).thenReturn(true);
        when(flags.multiDashboardEnabled()).thenReturn(true);
        when(session.getId()).thenReturn("browser-session");
        controller = new MultiKioskPublicV2Controller(
            flags, csrf, multiKiosks, new KioskV2ResponseFactory());
    }

    @Test
    void everyPublicEndpointFailsClosedWithoutInteractionWhenAuditIsDisabled() {
        when(flags.auditEnabled()).thenReturn(false);

        assertThatThrownBy(() -> controller.bootstrap(session, "public-token"))
            .isInstanceOf(com.indice.erp.kiosk.engine.KioskUnavailableException.class);
        assertThatThrownBy(() -> controller.authenticate(
            session, null, "csrf-token", "public-token", Map.of("pin", "12345")))
            .isInstanceOf(com.indice.erp.kiosk.engine.KioskUnavailableException.class);
        assertThatThrownBy(() -> controller.session(
            session, "parent-session-token", "public-token"))
            .isInstanceOf(com.indice.erp.kiosk.engine.KioskUnavailableException.class);
        assertThatThrownBy(() -> controller.logout(
            session, "csrf-token", "parent-session-token", "public-token"))
            .isInstanceOf(com.indice.erp.kiosk.engine.KioskUnavailableException.class);
        assertThatThrownBy(() -> controller.launchChild(
            session, "csrf-token", "parent-session-token", "public-token", 17L))
            .isInstanceOf(com.indice.erp.kiosk.engine.KioskUnavailableException.class);
        assertThatThrownBy(() -> controller.childWorkspace(
            session, "parent-session-token", "child-session-token", "public-token", 17L))
            .isInstanceOf(com.indice.erp.kiosk.engine.KioskUnavailableException.class);
        assertThatThrownBy(() -> controller.childAction(
            session, "csrf-token", "parent-session-token", "child-session-token",
            "idempotency-key", "public-token", 17L, "tasks.read@1", Map.of()))
            .isInstanceOf(com.indice.erp.kiosk.engine.KioskUnavailableException.class);

        verifyNoInteractions(csrf, multiKiosks);
    }

    @Test
    void closesOnlyTheSuppliedBrowserBoundSessionAfterCsrfValidation() {
        when(multiKiosks.logout("public-token", "parent-session-token", "browser-session"))
            .thenReturn(Map.of("signed_out", true));

        var response = controller.logout(
            session, "csrf-token", "parent-session-token", "public-token");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(csrf).requireCsrf(session, "csrf-token");
        verify(multiKiosks).logout(
            "public-token", "parent-session-token", "browser-session");
    }

    @Test
    void rejectsLogoutBeforeTheServiceWhenCsrfDoesNotMatch() {
        doThrow(new SecurityException("Invalid CSRF token."))
            .when(csrf).requireCsrf(session, "wrong-csrf");

        assertThatThrownBy(() -> controller.logout(
            session, "wrong-csrf", "parent-session-token", "public-token"))
            .isInstanceOf(SecurityException.class);

        verify(multiKiosks, never()).logout(
            "public-token", "parent-session-token", "browser-session");
    }

    @Test
    void ignoresSpoofedForwardingHeadersForPinRateLimiting() {
        var request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("203.0.113.7");
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.9");
        when(multiKiosks.authenticate(
            "public-token", "123456", "browser-session", "203.0.113.7"))
            .thenReturn(Map.of("session_id", "multi-session"));

        var response = controller.authenticate(
            session, request, "csrf-token", "public-token", Map.of("pin", "123456"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(csrf).requireCsrf(session, "csrf-token");
        verify(multiKiosks).authenticate(
            "public-token", "123456", "browser-session", "203.0.113.7");
        verify(multiKiosks, never()).authenticate(
            "public-token", "123456", "browser-session", "198.51.100.9");
    }
}
