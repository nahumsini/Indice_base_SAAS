package com.indice.erp.pos.terminal;

import static org.junit.jupiter.api.Assertions.*;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

class ProviderPublicSessionFilterTest {
    @ParameterizedTest @CsvSource({
        "POST,/api/v1/pos/mercado-pago/webhook", "POST,/api/v1/pos/square/webhook",
        "GET,/api/v1/pos/mercado-pago/oauth/callback", "GET,/api/v1/pos/square/oauth/callback"})
    void publicProviderTrafficCannotReadMutateOrCreateBrowserSession(String method, String path) throws Exception {
        var request = new MockHttpServletRequest(method, "/indice" + path);
        request.setContextPath("/indice");
        var session = new MockHttpSession();
        session.setAttribute("companyId", 42L);
        request.setSession(session);
        var response = new MockHttpServletResponse();
        new ProviderPublicSessionFilter().doFilter(request, response, (incoming, outgoing) -> {
            var provider = (HttpServletRequest) incoming;
            assertNull(provider.getSession(false));
            assertNull(provider.getSession(true));
            assertNull(provider.getSession());
            assertEquals(method, provider.getMethod());
        });
        assertEquals(42L, session.getAttribute("companyId"));
        assertSame(session, request.getSession(false));
        assertEquals("no-store", response.getHeader("Cache-Control"));
        assertEquals("no-referrer", response.getHeader("Referrer-Policy"));
        var fresh = new MockHttpServletRequest(method, path);
        new ProviderPublicSessionFilter().doFilter(fresh, new MockHttpServletResponse(), (incoming, outgoing) ->
            assertNull(((HttpServletRequest) incoming).getSession()));
        assertNull(fresh.getSession(false));
    }
    @ParameterizedTest @CsvSource({"GET,/api/v1/pos/mercado-pago/webhook", "POST,/api/v1/pos/mercado-pago/oauth/complete",
        "POST,/api/v1/pos/mercado-pago/webhook/extra", "GET,/api/v1/pos/mercado-pago/status"})
    void protectedRoutesRetainExistingSessionAndCannotUseProviderExemption(String method, String path) throws Exception {
        var request = new MockHttpServletRequest(method, path);
        var session = request.getSession();
        new ProviderPublicSessionFilter().doFilter(request, new MockHttpServletResponse(), (incoming, outgoing) -> {
            assertSame(request, incoming);
            assertSame(session, ((HttpServletRequest) incoming).getSession(false));
        });
    }
}
