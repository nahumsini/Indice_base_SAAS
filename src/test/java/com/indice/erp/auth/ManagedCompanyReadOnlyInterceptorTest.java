package com.indice.erp.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.platformadmin.PlatformAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class ManagedCompanyReadOnlyInterceptorTest {

    @Mock
    private PlatformAuditService audit;

    @Mock
    private ObjectProvider<PlatformAuditService> auditProvider;

    private ManagedCompanyReadOnlyInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new ManagedCompanyReadOnlyInterceptor(new ObjectMapper(), auditProvider);
    }

    @Test
    void allowsReadsAgainstTheManagedTenant() throws Exception {
        var request = managedRequest("GET", "/api/v1/hr/users");
        var response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
    }

    @Test
    void blocksAndAuditsClientWrites() throws Exception {
        org.mockito.Mockito.when(auditProvider.getIfAvailable()).thenReturn(audit);
        var request = managedRequest("PUT", "/api/v1/config-center/users/19");
        var response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertTrue(response.getContentAsString().contains("managed_company_read_only"));
        verify(audit).record(
            eq(41L),
            eq("DELEGATED_COMPANY_WRITE_BLOCKED"),
            eq("COMPANY"),
            eq("44"),
            eq(44L),
            eq("DENIED"),
            any()
        );
    }

    @Test
    void allowsClosingTheConsultation() throws Exception {
        var request = managedRequest("DELETE", "/api/v1/auth/managed-company");

        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
    }

    private MockHttpServletRequest managedRequest(String method, String path) {
        var request = new MockHttpServletRequest(method, path);
        var session = request.getSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 41L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        session.setAttribute(ManagedCompanyContextService.SESSION_MANAGED_COMPANY_ID, 44L);
        session.setAttribute(
            ManagedCompanyContextService.SESSION_MANAGED_MODE,
            ManagedCompanyContextService.PLATFORM_ROOT
        );
        return request;
    }
}
