package com.indice.erp.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class PublicDemoSessionInterceptorTest {

    @Test
    void blocksSensitiveAdministrationForDemoSessions() throws Exception {
        var auth = mock(SessionAuthService.class);
        var interceptor = new PublicDemoSessionInterceptor(auth);
        var request = new MockHttpServletRequest("GET", "/api/v1/platform-admin/overview");
        var response = new MockHttpServletResponse();
        when(auth.isPublicDemoSession(request.getSession())).thenReturn(true);

        var allowed = interceptor.preHandle(request, response, new Object());

        assertEquals(false, allowed);
        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("modo demo público"));
    }

    @Test
    void blocksCompanySwitchForDemoSessions() throws Exception {
        var auth = mock(SessionAuthService.class);
        var interceptor = new PublicDemoSessionInterceptor(auth);
        var request = new MockHttpServletRequest("POST", "/api/v1/auth/company");
        var response = new MockHttpServletResponse();
        when(auth.isPublicDemoSession(request.getSession())).thenReturn(true);

        assertEquals(false, interceptor.preHandle(request, response, new Object()));
        assertEquals(403, response.getStatus());
    }

    @Test
    void allowsOperationalEndpointsForDemoSessions() throws Exception {
        var auth = mock(SessionAuthService.class);
        var interceptor = new PublicDemoSessionInterceptor(auth);
        var request = new MockHttpServletRequest("GET", "/api/v1/sales/products");
        var response = new MockHttpServletResponse();
        when(auth.isPublicDemoSession(request.getSession())).thenReturn(true);

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(200, response.getStatus());
    }
}
