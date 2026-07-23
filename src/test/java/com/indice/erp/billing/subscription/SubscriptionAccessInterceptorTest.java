package com.indice.erp.billing.subscription;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

class SubscriptionAccessInterceptorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void allowsProtectedRequestWhenSubscriptionIsActive() throws Exception {
        var interceptor = new SubscriptionAccessInterceptor(
            (companyId) -> new CompanySubscriptionStatus("active", "legacy", null, true, ""),
            objectMapper
        );
        var request = request("/api/v1/modules", 7L);
        var response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(200, response.getStatus());
    }

    @Test
    void blocksProtectedRequestWhenSubscriptionIsMissing() throws Exception {
        var interceptor = new SubscriptionAccessInterceptor(
            (companyId) -> CompanySubscriptionStatus.blocked("missing_subscription"),
            objectMapper
        );
        var request = request("/api/v1/modules", 7L);
        var response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(402, response.getStatus());
        assertTrue(response.getContentAsString().contains("subscription_required"));
    }

    @Test
    void allowsAuthRoutesEvenWhenSubscriptionIsBlocked() throws Exception {
        var interceptor = new SubscriptionAccessInterceptor(
            (companyId) -> CompanySubscriptionStatus.blocked("trial_expired"),
            objectMapper
        );
        var request = request("/api/v1/auth/me", 7L);

        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
    }

    private MockHttpServletRequest request(String path, long companyId) {
        var request = new MockHttpServletRequest("GET", path);
        request.setRequestURI(path);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, companyId);
        request.setSession(session);
        return request;
    }
}
