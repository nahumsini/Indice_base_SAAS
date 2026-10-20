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
import com.indice.erp.hr.attendance.locations.AttendanceLocationValidationException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MultiKioskPublicV2ControllerTest {

    private final KioskEngineFeatureFlags flags = mock(KioskEngineFeatureFlags.class);
    private final SessionCsrfService csrf = mock(SessionCsrfService.class);
    private final MultiKioskService multiKiosks = mock(MultiKioskService.class);
    private final HttpSession session = mock(HttpSession.class);
    private MultiKioskPublicV2Controller controller;

    @ParameterizedTest
    @EnumSource(AttendanceLocationValidationException.Reason.class)
    void attendanceLocationRejectionsExplainTheNextStepWithoutExposingPrivateDetails(
            AttendanceLocationValidationException.Reason reason) throws Exception {
        when(multiKiosks.childAction(anyString(), anyString(), anyString(), anyLong(),
                anyString(), anyString(), anyMap(), anyString()))
            .thenThrow(new AttendanceLocationValidationException(reason, "private location details"));
        var mvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new KioskPublicV2ExceptionHandler()).build();
        mvc.perform(post("/api/v2/multi-kiosks/public/synthetic-token/kiosks/17/actions/attendance.punch.create@1")
                .header("X-CSRF-Token", "synthetic-csrf")
                .header("X-Multi-Kiosk-Session-Token", "synthetic-parent")
                .header("X-Kiosk-Session-Token", "synthetic-child")
                .header("Idempotency-Key", "synthetic-attempt")
                .contentType("application/json").content("{\"event_type\":\"check_in\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ATTENDANCE_LOCATION_" + reason.name()))
            .andExpect(jsonPath("$.error.message").value(org.hamcrest.Matchers.containsString("Recursos Humanos")))
            .andExpect(jsonPath("$.error.retryable").value(false))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private location details"))));
    }

    @Test
    void unknownValidationStillDoesNotDiscloseInternalMessages() {
        var response = new KioskPublicV2ExceptionHandler()
            .invalid(new IllegalArgumentException("secret-token and private details"));
        assertThat(response.getBody().toString())
            .contains("KIOSK_VALIDATION_ERROR", "Revisa la información enviada.")
            .doesNotContain("secret-token", "private details");
    }

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
        assertThatThrownBy(() -> controller.registerProvider(
            session, null, "csrf-token", "public-token", Map.of("name", "Proveedor")))
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
        doThrow(new IllegalArgumentException("Invalid CSRF token."))
            .when(csrf).requireCsrf(session, "wrong-csrf");

        assertThatThrownBy(() -> controller.logout(
            session, "wrong-csrf", "parent-session-token", "public-token"))
            .isInstanceOf(KioskCsrfException.class);

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

    @Test
    void providerAuthenticationRequiresAndForwardsTheProviderName() {
        var request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("203.0.113.8");
        when(multiKiosks.authenticate(
            "public-token", "Proveedor Uno", "246810", "browser-session", "203.0.113.8"))
            .thenReturn(Map.of("session_id", "provider-session"));

        var response = controller.authenticate(session, request, "csrf-token", "public-token",
            Map.of("provider_name", "Proveedor Uno", "pin", "246810"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(csrf).requireCsrf(session, "csrf-token");
        verify(multiKiosks).authenticate(
            "public-token", "Proveedor Uno", "246810", "browser-session", "203.0.113.8");
    }

    @Test
    void providerRegistrationUsesCsrfAndTheDirectNetworkSignal() {
        var request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("203.0.113.9");
        var payload = Map.<String, Object>of("name", "Proveedor Uno", "email", "contacto@example.com");
        when(multiKiosks.registerProvider("public-token", payload, "203.0.113.9"))
            .thenReturn(Map.of("status", "SUBMITTED"));

        var response = controller.registerProvider(
            session, request, "csrf-token", "public-token", payload);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(csrf).requireCsrf(session, "csrf-token");
        verify(multiKiosks).registerProvider("public-token", payload, "203.0.113.9");
    }
}
