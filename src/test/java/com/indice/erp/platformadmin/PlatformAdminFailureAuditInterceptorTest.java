package com.indice.erp.platformadmin;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.indice.erp.auth.SessionAuthService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

class PlatformAdminFailureAuditInterceptorTest {

    @Test
    void recordsAuthenticatedRejectedPlatformRequest() throws Exception {
        var audit = mock(PlatformAuditService.class);
        var interceptor = new PlatformAdminFailureAuditInterceptor(audit);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 72L);
        var request = new MockHttpServletRequest("PATCH", "/api/v1/platform-admin/companies/3/account-type");
        request.setSession(session);
        var response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        response.setStatus(403);
        interceptor.afterCompletion(request, response, new Object(), null);

        verify(audit).record(
            eq(72L),
            eq("PLATFORM_HTTP_REQUEST_REJECTED"),
            eq("API_ROUTE"),
            eq("/api/v1/platform-admin/companies/3/account-type"),
            isNull(),
            eq("FAILURE"),
            eq(Map.of("method", "PATCH", "status", 403, "exception", ""))
        );
    }
}
