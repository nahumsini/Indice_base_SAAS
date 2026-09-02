package com.indice.erp.billing.subscription;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

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

    @Test
    void allowsPublicDemoSessionWithoutPaidEntitlement() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/hr/users");
        request.getSession(true).setAttribute(SessionAuthService.SESSION_COMPANY_ID, 20L);
        request.getSession().setAttribute(SessionAuthService.SESSION_PUBLIC_DEMO, true);

        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
    }

    @Test
    void authorizesSalesProductAndInventoryRoutesWithInventoryEntitlement() throws Exception {
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(true);

        for (var path : java.util.List.of(
                "/api/v1/sales/products",
                "/api/v1/sales/products/22",
                "/api/v1/sales/products/images/presign-upload",
                "/api/v1/sales/public-catalogs",
                "/api/v1/sales/inventory-operations/commit",
                "/api/v1/sales/inventory-warehouses",
                "/api/v1/sales/inventory-balances",
                "/api/v1/sales/inventory-movements")) {
            var request = new MockHttpServletRequest("GET", path);
            request.getSession(true).setAttribute(SessionAuthService.SESSION_COMPANY_ID, 20L);

            assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()), path);
        }

        verify(entitlementService, times(8))
            .hasActiveEntitlement(20L, "inventory");
    }

    @Test
    void crmEntitlementAllowsProductCollectionAndItemReads() throws Exception {
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(false);
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(true);

        assertTrue(interceptor.preHandle(
            request("GET", "/api/v1/sales/products"),
            new MockHttpServletResponse(),
            new Object()
        ));
        assertTrue(interceptor.preHandle(
            request("GET", "/api/v1/sales/products/22"),
            new MockHttpServletResponse(),
            new Object()
        ));

        verify(entitlementService, times(2)).hasActiveEntitlement(20L, "inventory");
        verify(entitlementService, times(2)).hasActiveEntitlement(20L, "crm");
    }

    @Test
    void crmEntitlementCannotMutateProductsOrUseProductImageRoutes() throws Exception {
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(false);
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(true);

        for (var request : java.util.List.of(
                request("POST", "/api/v1/sales/products"),
                request("PUT", "/api/v1/sales/products/22"),
                request("DELETE", "/api/v1/sales/products/22"),
                request("POST", "/api/v1/sales/products/images/presign-upload"),
                request("POST", "/api/v1/sales/products/22/images"))) {
            var response = new MockHttpServletResponse();

            assertFalse(interceptor.preHandle(request, response, new Object()), request.getRequestURI());
            org.assertj.core.api.Assertions.assertThat(response.getStatus()).isEqualTo(403);
            org.assertj.core.api.Assertions.assertThat(response.getContentAsString())
                .contains("\"module\":\"inventory\"");
        }

        verify(entitlementService, times(5)).hasActiveEntitlement(20L, "inventory");
        verify(entitlementService, never()).hasActiveEntitlement(20L, "crm");
    }

    @Test
    void inventoryEntitlementAllowsProductReadsAndMutationsWithoutCrm() throws Exception {
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(true);
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(false);

        assertTrue(interceptor.preHandle(
            request("GET", "/api/v1/sales/products/22"),
            new MockHttpServletResponse(),
            new Object()
        ));
        assertTrue(interceptor.preHandle(
            request("DELETE", "/api/v1/sales/products/22"),
            new MockHttpServletResponse(),
            new Object()
        ));

        verify(entitlementService, times(2)).hasActiveEntitlement(20L, "inventory");
        verify(entitlementService, never()).hasActiveEntitlement(20L, "crm");
    }

    @Test
    void productReadFailsClosedWhenNeitherCompatibleModuleIsEntitled() throws Exception {
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(false);
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(false);
        var response = new MockHttpServletResponse();

        assertFalse(interceptor.preHandle(
            request("GET", "/api/v1/sales/products/22"),
            response,
            new Object()
        ));

        org.assertj.core.api.Assertions.assertThat(response.getStatus()).isEqualTo(403);
        org.assertj.core.api.Assertions.assertThat(response.getContentAsString())
            .contains("\"module\":\"inventory\"")
            .contains("\"modules\":[\"inventory\",\"crm\"]");
        verify(entitlementService).hasActiveEntitlement(20L, "inventory");
        verify(entitlementService).hasActiveEntitlement(20L, "crm");
    }

    @Test
    void crmEntitlementAllowsWarehouseReadsButNotMutations() throws Exception {
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(false);
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(true);

        assertTrue(interceptor.preHandle(
            request("GET", "/api/v1/sales/inventory-warehouses"),
            new MockHttpServletResponse(),
            new Object()
        ));
        var updateResponse = new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(
            request("PUT", "/api/v1/sales/inventory-warehouses/3"),
            updateResponse,
            new Object()
        ));

        org.assertj.core.api.Assertions.assertThat(updateResponse.getStatus()).isEqualTo(403);
        verify(entitlementService, times(2)).hasActiveEntitlement(20L, "inventory");
        verify(entitlementService).hasActiveEntitlement(20L, "crm");
    }

    @Test
    void inventoryPrefixesDoNotCaptureUnrelatedSalesCollections() throws Exception {
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(false);
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(true);

        assertTrue(interceptor.preHandle(
            request("GET", "/api/v1/sales/products-archive"),
            new MockHttpServletResponse(),
            new Object()
        ));
        assertTrue(interceptor.preHandle(
            request("GET", "/api/v1/sales/inventory-warehouses-archive"),
            new MockHttpServletResponse(),
            new Object()
        ));

        verify(entitlementService, times(2)).hasActiveEntitlement(20L, "crm");
        verify(entitlementService, never()).hasActiveEntitlement(20L, "inventory");
    }

    @Test
    void inventoryEntitlementDoesNotOpenCrmRoutes() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/sales/contacts");
        request.getSession(true).setAttribute(SessionAuthService.SESSION_COMPANY_ID, 20L);
        var response = new MockHttpServletResponse();
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(true);
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(false);

        assertFalse(interceptor.preHandle(request, response, new Object()));

        org.assertj.core.api.Assertions.assertThat(response.getStatus()).isEqualTo(403);
        org.assertj.core.api.Assertions.assertThat(response.getContentAsString()).contains("\"module\":\"crm\"");
        verify(entitlementService).hasActiveEntitlement(20L, "crm");
    }

    @Test
    void crmEntitlementDoesNotReplaceInventoryEntitlementForProducts() throws Exception {
        var request = new MockHttpServletRequest("DELETE", "/api/v1/sales/products/22");
        request.getSession(true).setAttribute(SessionAuthService.SESSION_COMPANY_ID, 20L);
        var response = new MockHttpServletResponse();
        given(entitlementService.hasActiveEntitlement(20L, "crm")).willReturn(true);
        given(entitlementService.hasActiveEntitlement(20L, "inventory")).willReturn(false);

        assertFalse(interceptor.preHandle(request, response, new Object()));

        org.assertj.core.api.Assertions.assertThat(response.getStatus()).isEqualTo(403);
        org.assertj.core.api.Assertions.assertThat(response.getContentAsString()).contains("\"module\":\"inventory\"");
        verify(entitlementService).hasActiveEntitlement(20L, "inventory");
    }

    private MockHttpServletRequest request(String method, String path) {
        var request = new MockHttpServletRequest(method, path);
        request.getSession(true).setAttribute(SessionAuthService.SESSION_COMPANY_ID, 20L);
        return request;
    }
}
