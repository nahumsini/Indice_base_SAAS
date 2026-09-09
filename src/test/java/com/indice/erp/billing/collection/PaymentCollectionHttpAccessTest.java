package com.indice.erp.billing.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.billing.lifecycle.*;
import com.indice.erp.billing.subscription.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class PaymentCollectionHttpAccessTest {
    @ParameterizedTest
    @CsvSource({"GET,/api/v1/sales", "POST,/api/v1/billing/seats", "GET,/api/v1/billing/invoices",
        "POST,/api/v1/auth/register", "POST,/api/v1/account/ownership/transfer", "GET,/api/v1/distributor-portal/customers"})
    void expiredRequestBlocksPreviouslyExemptSurfacesInBothGates(String method, String path) throws Exception {
        var request = request(method, path);
        var response = new MockHttpServletResponse();
        var subscription = new SubscriptionAccessInterceptor(id -> new CompanySubscriptionStatus(
            "payment_required", "", null, false, PaymentCollectionAccessService.OVERDUE), new ObjectMapper());
        assertThat(subscription.preHandle(request, response, new Object())).isFalse();
        assertThat(response.getStatus()).isEqualTo(402);
        assertThat(response.getContentAsString()).contains(PaymentCollectionAccessService.OVERDUE);
        var auth = mock(SessionAuthService.class);
        when(auth.currentUser(request.getSession())).thenReturn(Optional.of(new AuthSessionUser(3L, 7L, "Owner", "superadmin")));
        var access = mock(CommercialLifecycleAccessService.class);
        when(access.collectionAccess(7)).thenReturn(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        var lifecycle = new CommercialLifecycleInterceptor(auth, access);
        response = new MockHttpServletResponse();
        assertThat(lifecycle.preHandle(request, response, new Object())).isFalse();
        assertThat(response.getContentAsString()).contains(PaymentCollectionAccessService.OVERDUE);
    }

    @ParameterizedTest
    @CsvSource({"GET,/api/v1/auth/me", "GET,/api/v1/auth/csrf", "POST,/api/v1/auth/logout",
        "POST,/api/v1/auth/login/otp/verify", "POST,/api/v1/auth/company", "DELETE,/api/v1/auth/managed-company",
        "POST,/api/v1/auth/password-reset/request", "GET,/api/v1/auth/password-reset/token",
        "POST,/api/v1/auth/password-reset/token/complete", "GET,/api/v1/billing/payment-request",
        "POST,/api/v1/billing/payment-request/pay", "POST,/api/v1/billing/payment-request/refresh",
        "POST,/api/v1/billing/stripe/webhook"})
    void allowsOnlyRecoveryAndSecurityMethods(String method, String path) throws Exception {
        assertThat(PaymentCollectionAccessService.permitsRecovery(method, path)).isTrue();
        var provider = mock(CompanySubscriptionStatusProvider.class);
        var gate = new SubscriptionAccessInterceptor(provider, new ObjectMapper());
        assertThat(gate.preHandle(request(method, path), new MockHttpServletResponse(), new Object())).isTrue();
        verifyNoInteractions(provider);
    }

    @Test
    void accessRestrictionStillAppliesWithLifecycleFlagOffAndDirectServiceCalls() {
        var policy = mock(PaymentCollectionAccessService.class);
        var lifecycle = mock(CommercialLifecycleService.class);
        var properties = new CommercialLifecycleProperties();
        properties.setEnabled(false);
        var service = new CommercialLifecycleAccessService(properties, lifecycle, policy);
        when(policy.access(7)).thenReturn(PaymentCollectionAccessService.Access.PAYMENT_ONLY);
        assertThatThrownBy(() -> service.requireRead(7)).isInstanceOf(CommercialAccessRestrictedException.class);
        assertThatThrownBy(() -> service.requireWrite(7)).isInstanceOf(CommercialAccessRestrictedException.class);
        when(policy.access(8)).thenReturn(PaymentCollectionAccessService.Access.NONE);
        service.requireWrite(8);
        verifyNoInteractions(lifecycle);
    }

    @Test
    void graceAllowsCommercialWorkWithoutChangingModuleOrOwnershipGuards() {
        var policy = mock(PaymentCollectionAccessService.class);
        var lifecycle = mock(CommercialLifecycleService.class);
        var properties = new CommercialLifecycleProperties();
        properties.setEnabled(true);
        when(policy.access(7)).thenReturn(PaymentCollectionAccessService.Access.GRACE);
        var service = new CommercialLifecycleAccessService(properties, lifecycle, policy);
        service.requireWrite(7);
        service.requireRead(7);
        verifyNoInteractions(lifecycle);
        assertThat(PaymentCollectionAccessService.permitsRecovery("POST", "/api/v1/billing/subscription/activate")).isFalse();
        assertThat(PaymentCollectionAccessService.permitsRecovery("DELETE", "/api/v1/auth/password-reset/token")).isFalse();
    }

    private MockHttpServletRequest request(String method, String path) {
        var request = new MockHttpServletRequest(method, path);
        request.getSession().setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        return request;
    }
}
