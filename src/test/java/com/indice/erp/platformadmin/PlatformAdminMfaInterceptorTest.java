package com.indice.erp.platformadmin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.LocalDevelopmentAuthPolicy;
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
        var interceptor = new PlatformAdminMfaInterceptor(auth, accessService, mock(LocalDevelopmentAuthPolicy.class));
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
        var interceptor = new PlatformAdminMfaInterceptor(auth, accessService, mock(LocalDevelopmentAuthPolicy.class));
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

    @Test
    void explicitLocalExceptionAllowsARootPasswordSessionWithoutChangingItsMfaState() throws Exception {
        var auth = mock(SessionAuthService.class);
        var accessService = mock(PlatformAdminAccessService.class);
        var localPolicy = mock(LocalDevelopmentAuthPolicy.class);
        given(localPolicy.isMfaBypassed()).willReturn(true);
        var interceptor = new PlatformAdminMfaInterceptor(auth, accessService, localPolicy);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 41L);
        session.setAttribute(SessionAuthService.SESSION_MFA_VERIFIED, false);
        var request = new MockHttpServletRequest();
        request.setSession(session);
        given(accessService.find(41L)).willReturn(
            new PlatformAdminAccessService.Access(1L, "PLATFORM_ROOT", true, List.of())
        );

        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
        assertFalse((Boolean) session.getAttribute(SessionAuthService.SESSION_MFA_VERIFIED));
        assertFalse(session.isInvalid());
    }

    @Test
    void rootRequiresMfaByDefaultEvenWhenItsDatabaseFlagIsFalse() throws Exception {
        var auth = mock(SessionAuthService.class);
        var accessService = mock(PlatformAdminAccessService.class);
        var interceptor = new PlatformAdminMfaInterceptor(auth, accessService, mock(LocalDevelopmentAuthPolicy.class));
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 41L);
        var request = new MockHttpServletRequest();
        request.setSession(session);
        given(accessService.find(41L)).willReturn(
            new PlatformAdminAccessService.Access(1L, "PLATFORM_ROOT", false, List.of())
        );
        var response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertTrue(response.getStatus() == 401);
        assertTrue(session.isInvalid());
    }
}
