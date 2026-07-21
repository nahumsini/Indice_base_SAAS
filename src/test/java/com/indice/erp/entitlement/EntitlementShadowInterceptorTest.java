package com.indice.erp.entitlement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionResponse;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.tenant.TenantContext;
import com.indice.erp.tenant.TenantContextResolver;
import com.indice.erp.tenant.TenantScope;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
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
            true
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

    private record Fixture(
        EntitlementShadowInterceptor interceptor,
        MockHttpServletRequest request,
        MockHttpServletResponse response
    ) {
    }
}
