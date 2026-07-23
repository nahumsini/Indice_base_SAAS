package com.indice.erp.billing.subscription;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.SessionAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ModuleEntitlementInterceptorTest {

    private final CompanyModuleEntitlementService entitlementService = mock(CompanyModuleEntitlementService.class);
    private final ModuleEntitlementInterceptor interceptor =
        new ModuleEntitlementInterceptor(entitlementService, new ObjectMapper());

    @Test
    void blocksModuleApiWhenCompanyDoesNotHaveEntitlement() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/hr/users");
        request.getSession(true).setAttribute(SessionAuthService.SESSION_COMPANY_ID, 20L);
        var response = new MockHttpServletResponse();
        given(entitlementService.hasActiveEntitlement(20L, "human_resources")).willReturn(false);

        assertFalse(interceptor.preHandle(request, response, new Object()));

        org.assertj.core.api.Assertions.assertThat(response.getStatus()).isEqualTo(403);
        org.assertj.core.api.Assertions.assertThat(response.getContentAsString()).contains("module_not_entitled");
    }

    @Test
    void allowsBillingAndPublicKioskPaths() throws Exception {
        var billingRequest = new MockHttpServletRequest("POST", "/api/v1/billing/subscription/cancel");
        var publicRequest = new MockHttpServletRequest("GET", "/api/v1/hr/attendance/public-kiosk/token");

        assertTrue(interceptor.preHandle(billingRequest, new MockHttpServletResponse(), new Object()));
        assertTrue(interceptor.preHandle(publicRequest, new MockHttpServletResponse(), new Object()));
    }
}
