package com.indice.erp.entitlement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionResponse;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.tenant.TenantContext;
import com.indice.erp.tenant.TenantContextResolver;
import com.indice.erp.tenant.TenantScope;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

class EntitlementShadowInterceptorTest {

    @Test
    void neverBlocksWhenGlobalEnforcementIsDisabled() throws Exception {
        var fixture = fixture(false, EntitlementPolicyMode.ENFORCE, false);

        assertThat(fixture.interceptor().preHandle(fixture.request(), fixture.response(), handler())).isTrue();
        assertThat(fixture.response().getStatus()).isEqualTo(200);
    }

    @Test
    void globalEnforcementOnlyBlocksACompanyPromotedToEnforce() throws Exception {
        var shadow = fixture(true, EntitlementPolicyMode.SHADOW, false);
        var enforce = fixture(true, EntitlementPolicyMode.ENFORCE, false);

        assertThat(shadow.interceptor().preHandle(shadow.request(), shadow.response(), handler())).isTrue();
        assertThat(enforce.interceptor().preHandle(enforce.request(), enforce.response(), handler())).isFalse();
        assertThat(enforce.response().getStatus()).isEqualTo(403);
        assertThat(enforce.response().getContentAsString()).contains("CAPABILITY_NOT_ENTITLED");
    }

    @Test
    void evaluationFailureFallsBackToTheExistingPermissionModel() throws Exception {
        var fixture = fixture(true, EntitlementPolicyMode.ENFORCE, true);

        assertThat(fixture.interceptor().preHandle(fixture.request(), fixture.response(), handler())).isTrue();
        assertThat(fixture.response().getStatus()).isEqualTo(200);
    }

    @Test
    void mixedControllerUsesExactInventoryCapabilityForProductRoutes() throws Exception {
        var fixture = routeFixture("DELETE", "/api/v1/sales/products/42", "inventory", true);

        assertThat(fixture.interceptor().preHandle(
            fixture.request(), fixture.response(), mixedHandler("genericWrite")
        )).isTrue();

        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()),
            eq(fixture.session()),
            eq("inventory"),
            eq(CapabilityOperation.WRITE)
        );
    }

    @Test
    void crmOnlyCapabilityCanReadProductsThroughExplicitAnyOfRequirement() throws Exception {
        var fixture = routeFixture("GET", "/api/v1/sales/products/42", Set.of("sales"));

        assertThat(fixture.interceptor().preHandle(
            fixture.request(), fixture.response(), mixedHandler("genericWrite")
        )).isTrue();

        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()), eq(fixture.session()), eq("inventory"), eq(CapabilityOperation.READ)
        );
        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()), eq(fixture.session()), eq("sales"), eq(CapabilityOperation.READ)
        );
        verify(fixture.audit()).record(
            eq(fixture.tenant()),
            org.mockito.ArgumentMatchers.argThat(decision -> "inventory".equals(decision.capability())),
            eq(fixture.request()),
            eq(false)
        );
        verify(fixture.audit()).record(
            eq(fixture.tenant()),
            org.mockito.ArgumentMatchers.argThat(decision -> "sales".equals(decision.capability())),
            eq(fixture.request()),
            eq(false)
        );
    }

    @Test
    void crmOnlyCapabilityCannotDeleteProducts() throws Exception {
        var fixture = routeFixture("DELETE", "/api/v1/sales/products/42", Set.of("sales"));

        assertThat(fixture.interceptor().preHandle(
            fixture.request(), fixture.response(), mixedHandler("genericWrite")
        )).isFalse();
        assertThat(fixture.response().getStatus()).isEqualTo(403);

        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()), eq(fixture.session()), eq("inventory"), eq(CapabilityOperation.WRITE)
        );
        verify(fixture.decisions(), never()).evaluate(
            eq(fixture.tenant()), eq(fixture.session()), eq("sales"), eq(CapabilityOperation.WRITE)
        );
    }

    @Test
    void inventoryOnlyCapabilityCanReadAndMutateProducts() throws Exception {
        var read = routeFixture("GET", "/api/v1/sales/products", Set.of("inventory"));
        var write = routeFixture("PUT", "/api/v1/sales/products/42", Set.of("inventory"));

        assertThat(read.interceptor().preHandle(
            read.request(), read.response(), mixedHandler("genericWrite")
        )).isTrue();
        assertThat(write.interceptor().preHandle(
            write.request(), write.response(), mixedHandler("genericWrite")
        )).isTrue();

        verify(read.decisions()).evaluate(
            eq(read.tenant()), eq(read.session()), eq("inventory"), eq(CapabilityOperation.READ)
        );
        verify(read.decisions()).evaluate(
            eq(read.tenant()), eq(read.session()), eq("sales"), eq(CapabilityOperation.READ)
        );
        verify(write.decisions()).evaluate(
            eq(write.tenant()), eq(write.session()), eq("inventory"), eq(CapabilityOperation.WRITE)
        );
        verify(write.decisions(), never()).evaluate(
            eq(write.tenant()), eq(write.session()), eq("sales"), eq(CapabilityOperation.WRITE)
        );
    }

    @Test
    void productReadIsDeniedWhenBothCompatibleCapabilitiesAreMissing() throws Exception {
        var fixture = routeFixture("GET", "/api/v1/sales/products", Set.of());

        assertThat(fixture.interceptor().preHandle(
            fixture.request(), fixture.response(), mixedHandler("genericWrite")
        )).isFalse();
        assertThat(fixture.response().getStatus()).isEqualTo(403);

        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()), eq(fixture.session()), eq("inventory"), eq(CapabilityOperation.READ)
        );
        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()), eq(fixture.session()), eq("sales"), eq(CapabilityOperation.READ)
        );
    }

    @Test
    void crmOnlyCapabilityCanReadWarehousesButCannotMutateThem() throws Exception {
        var read = routeFixture("GET", "/api/v1/sales/inventory-warehouses", Set.of("sales"));
        var write = routeFixture("POST", "/api/v1/sales/inventory-warehouses", Set.of("sales"));

        assertThat(read.interceptor().preHandle(
            read.request(), read.response(), mixedHandler("genericWrite")
        )).isTrue();
        assertThat(write.interceptor().preHandle(
            write.request(), write.response(), mixedHandler("genericWrite")
        )).isFalse();

        verify(read.decisions()).evaluate(
            eq(read.tenant()), eq(read.session()), eq("inventory"), eq(CapabilityOperation.READ)
        );
        verify(read.decisions()).evaluate(
            eq(read.tenant()), eq(read.session()), eq("sales"), eq(CapabilityOperation.READ)
        );
        verify(write.decisions()).evaluate(
            eq(write.tenant()), eq(write.session()), eq("inventory"), eq(CapabilityOperation.WRITE)
        );
        verify(write.decisions(), never()).evaluate(
            eq(write.tenant()), eq(write.session()), eq("sales"), eq(CapabilityOperation.WRITE)
        );
    }

    @Test
    void mixedControllerKeepsCrmRoutesOnSalesCapability() throws Exception {
        var fixture = routeFixture("POST", "/api/v1/sales/contacts", "sales", false);

        assertThat(fixture.interceptor().preHandle(
            fixture.request(), fixture.response(), mixedHandler("genericWrite")
        )).isFalse();
        assertThat(fixture.response().getStatus()).isEqualTo(403);

        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()),
            eq(fixture.session()),
            eq("sales"),
            eq(CapabilityOperation.WRITE)
        );
    }

    @Test
    void methodRequirementRemainsAuthoritativeOnMixedController() throws Exception {
        var fixture = routeFixture("POST", "/api/v1/sales/products", "sales", false);

        assertThat(fixture.interceptor().preHandle(
            fixture.request(), fixture.response(), mixedHandler("explicitSalesWrite")
        )).isFalse();

        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()),
            eq(fixture.session()),
            eq("sales"),
            eq(CapabilityOperation.WRITE)
        );
    }

    @Test
    void typeRequirementNeedsExplicitOptInBeforeRouteCanOverrideIt() throws Exception {
        var fixture = routeFixture("POST", "/api/v1/sales/products", "sales", false);

        assertThat(fixture.interceptor().preHandle(
            fixture.request(), fixture.response(), strictHandler()
        )).isFalse();

        verify(fixture.decisions()).evaluate(
            eq(fixture.tenant()),
            eq(fixture.session()),
            eq("sales"),
            eq(CapabilityOperation.WRITE)
        );
    }

    private Fixture fixture(boolean enforcementEnabled, EntitlementPolicyMode mode, boolean failEvaluation) {
        var auth = Mockito.mock(SessionAuthService.class);
        var resolver = Mockito.mock(TenantContextResolver.class);
        var decisions = Mockito.mock(CapabilityShadowDecisionService.class);
        var request = new MockHttpServletRequest("POST", "/api/v1/sales/orders");
        request.getSession(true);
        var response = new MockHttpServletResponse();
        var session = session();
        var tenant = new TenantContext(1L, 2L, 3L, "admin", TenantScope.from(null, null));
        when(auth.currentSession(any())).thenReturn(Optional.of(session));
        when(resolver.resolve(session)).thenReturn(tenant);
        if (failEvaluation) {
            when(decisions.evaluate(eq(tenant), eq(session), eq("sales"), eq(CapabilityOperation.WRITE)))
                .thenThrow(new IllegalStateException("catalog unavailable"));
        } else {
            when(decisions.evaluate(eq(tenant), eq(session), eq("sales"), eq(CapabilityOperation.WRITE)))
                .thenReturn(new CapabilityShadowDecision(
                    "sales", CapabilityOperation.WRITE, true, false, false, false, "none", mode
                ));
        }
        var interceptor = new EntitlementShadowInterceptor(
            provider(auth),
            provider(resolver),
            provider(decisions),
            emptyProvider(),
            emptyProvider(),
            true,
            enforcementEnabled
        );
        return new Fixture(interceptor, request, response);
    }

    private HandlerMethod handler() throws NoSuchMethodException {
        Method method = TestController.class.getDeclaredMethod("write");
        return new HandlerMethod(new TestController(), method);
    }

    private HandlerMethod mixedHandler(String methodName) throws NoSuchMethodException {
        Method method = MixedSalesController.class.getDeclaredMethod(methodName);
        return new HandlerMethod(new MixedSalesController(), method);
    }

    private HandlerMethod strictHandler() throws NoSuchMethodException {
        Method method = StrictSalesController.class.getDeclaredMethod("genericWrite");
        return new HandlerMethod(new StrictSalesController(), method);
    }

    private RouteFixture routeFixture(
        String httpMethod,
        String path,
        String expectedCapability,
        boolean shadowAllowed
    ) {
        var auth = Mockito.mock(SessionAuthService.class);
        var resolver = Mockito.mock(TenantContextResolver.class);
        var decisions = Mockito.mock(CapabilityShadowDecisionService.class);
        var audit = Mockito.mock(EntitlementDecisionAuditService.class);
        var request = new MockHttpServletRequest(httpMethod, path);
        request.getSession(true);
        var response = new MockHttpServletResponse();
        var session = session();
        var tenant = new TenantContext(1L, 2L, 3L, "admin", TenantScope.from(null, null));
        when(auth.currentSession(any())).thenReturn(Optional.of(session));
        when(resolver.resolve(session)).thenReturn(tenant);
        when(decisions.evaluate(
            eq(tenant),
            eq(session),
            eq(expectedCapability),
            eq(CapabilityOperation.WRITE)
        )).thenReturn(new CapabilityShadowDecision(
            expectedCapability,
            CapabilityOperation.WRITE,
            true,
            shadowAllowed,
            shadowAllowed,
            shadowAllowed,
            "test",
            EntitlementPolicyMode.ENFORCE
        ));
        var interceptor = new EntitlementShadowInterceptor(
            provider(auth),
            provider(resolver),
            provider(decisions),
            provider(audit),
            provider(new CapabilityRouteClassifier()),
            true,
            true
        );
        return new RouteFixture(interceptor, request, response, decisions, audit, tenant, session);
    }

    private RouteFixture routeFixture(String httpMethod, String path, Set<String> allowedCapabilities) {
        var auth = Mockito.mock(SessionAuthService.class);
        var resolver = Mockito.mock(TenantContextResolver.class);
        var decisions = Mockito.mock(CapabilityShadowDecisionService.class);
        var audit = Mockito.mock(EntitlementDecisionAuditService.class);
        var request = new MockHttpServletRequest(httpMethod, path);
        request.getSession(true);
        var response = new MockHttpServletResponse();
        var session = session();
        var tenant = new TenantContext(1L, 2L, 3L, "admin", TenantScope.from(null, null));
        var operation = "GET".equalsIgnoreCase(httpMethod)
            ? CapabilityOperation.READ
            : CapabilityOperation.WRITE;
        when(auth.currentSession(any())).thenReturn(Optional.of(session));
        when(resolver.resolve(session)).thenReturn(tenant);
        when(decisions.evaluate(eq(tenant), eq(session), any(String.class), eq(operation)))
            .thenAnswer(invocation -> {
                var capability = invocation.getArgument(2, String.class);
                var allowed = allowedCapabilities.contains(capability);
                return new CapabilityShadowDecision(
                    capability,
                    operation,
                    allowed,
                    allowed,
                    allowed,
                    true,
                    "test",
                    EntitlementPolicyMode.ENFORCE
                );
            });
        var interceptor = new EntitlementShadowInterceptor(
            provider(auth),
            provider(resolver),
            provider(decisions),
            provider(audit),
            provider(new CapabilityRouteClassifier()),
            true,
            true
        );
        return new RouteFixture(interceptor, request, response, decisions, audit, tenant, session);
    }

    @SuppressWarnings("unchecked")
    private <T> ObjectProvider<T> provider(T value) {
        var provider = (ObjectProvider<T>) Mockito.mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(value);
        return provider;
    }

    @SuppressWarnings("unchecked")
    private <T> ObjectProvider<T> emptyProvider() {
        return (ObjectProvider<T>) Mockito.mock(ObjectProvider.class);
    }

    private AuthSessionResponse session() {
        var company = new AuthSessionResponse.CompanyInfo(
            2L,
            "Empresa",
            3L,
            "admin",
            new AuthSessionResponse.ScopeInfo("corporate_office", null, null),
            true,
            new AuthSessionResponse.SubscriptionInfo("active", "legacy", "", true, "")
        );
        return new AuthSessionResponse(
            new AuthSessionResponse.UserInfo(1L, "Usuario", "admin", List.of("crm"), List.of(), false),
            company,
            List.of(company)
        );
    }

    private static final class TestController {

        @RequiresCapability(value = "sales", operation = CapabilityOperation.WRITE)
        void write() {
        }
    }

    @RequiresCapability(value = "sales", allowRouteOverride = true)
    private static final class MixedSalesController {

        void genericWrite() {
        }

        @RequiresCapability(value = "sales", operation = CapabilityOperation.WRITE)
        void explicitSalesWrite() {
        }
    }

    @RequiresCapability("sales")
    private static final class StrictSalesController {

        void genericWrite() {
        }
    }

    private record Fixture(
        EntitlementShadowInterceptor interceptor,
        MockHttpServletRequest request,
        MockHttpServletResponse response
    ) {
    }

    private record RouteFixture(
        EntitlementShadowInterceptor interceptor,
        MockHttpServletRequest request,
        MockHttpServletResponse response,
        CapabilityShadowDecisionService decisions,
        EntitlementDecisionAuditService audit,
        TenantContext tenant,
        AuthSessionResponse session
    ) {
    }
}
