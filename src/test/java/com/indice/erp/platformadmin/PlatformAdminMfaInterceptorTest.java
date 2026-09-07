package com.indice.erp.platformadmin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.indice.erp.auth.SessionAuthService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

class PlatformAdminMfaInterceptorTest {

    @Test
    void rejectsPlatformAdministratorSessionThatDidNotCompleteMfa() throws Exception {
        var auth = mock(SessionAuthService.class);
        var accessService = mock(PlatformAdminAccessService.class);
        var interceptor = new PlatformAdminMfaInterceptor(auth, accessService);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 41L);
        var request = new MockHttpServletRequest();
        request.setSession(session);
        var response = new MockHttpServletResponse();
        given(accessService.find(41L)).willReturn(
            new PlatformAdminAccessService.Access(1L, "PLATFORM_OPERATOR", true, List.of("PLATFORM_VIEW"))
        );
        given(auth.isMfaVerified(session)).willReturn(false);

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertTrue(response.getContentAsString().contains("PLATFORM_REAUTHENTICATION_REQUIRED"));
        assertTrue(response.getStatus() == 401);
    }

    @Test
    void permitsPlatformAdministratorSessionThatCompletedMfa() throws Exception {
        var auth = mock(SessionAuthService.class);
        var accessService = mock(PlatformAdminAccessService.class);
        var interceptor = new PlatformAdminMfaInterceptor(auth, accessService);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 41L);
        var request = new MockHttpServletRequest();
        request.setSession(session);
        var response = new MockHttpServletResponse();
        given(accessService.find(41L)).willReturn(
            new PlatformAdminAccessService.Access(1L, "PLATFORM_ROOT", true, List.of())
        );
        given(auth.isMfaVerified(session)).willReturn(true);

        assertTrue(interceptor.preHandle(request, response, new Object()));
        verify(auth).isMfaVerified(session);
    }
}
