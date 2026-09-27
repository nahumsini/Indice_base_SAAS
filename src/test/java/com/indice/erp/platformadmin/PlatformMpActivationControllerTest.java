package com.indice.erp.platformadmin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.*;
import com.indice.erp.pos.mercadopago.*;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PlatformMpActivationControllerTest {
    @Test void mutationAuthenticatesAndRequiresCsrfBeforeService() {
        var auth = mock(SessionAuthService.class); var csrf = mock(SessionCsrfService.class);
        var service = mock(MpCompanyActivationService.class); var session = mock(HttpSession.class);
        when(auth.currentActor(session)).thenReturn(Optional.of(new AuthSessionUser(9L, 1L, "Root", "root")));
        var controller = new PlatformMpActivationController(auth, csrf, service);
        var request = new MpActivationDtos.Change("SUSPENDED", "incident response", 2L);
        controller.change(session, 42, "csrf", request);
        var order = inOrder(auth, csrf, service); order.verify(auth).currentActor(session);
        order.verify(csrf).requireCsrf(session, "csrf"); order.verify(service).change(9, 42, request);
    }
    @Test void invalidCsrfNeverReachesActivationService() {
        var auth = mock(SessionAuthService.class); var csrf = mock(SessionCsrfService.class);
        var service = mock(MpCompanyActivationService.class); var session = mock(HttpSession.class);
        when(auth.currentActor(session)).thenReturn(Optional.of(new AuthSessionUser(9L, 1L, "Root", "root")));
        doThrow(new IllegalArgumentException("Invalid CSRF token.")).when(csrf).requireCsrf(session, null);
        var controller = new PlatformMpActivationController(auth, csrf, service);
        assertThrows(IllegalArgumentException.class, () -> controller.change(session, 42, null,
            new MpActivationDtos.Change("ACTIVE", null, 2L)));
        verifyNoInteractions(service);
    }
}
