package com.indice.erp.billing.stripe;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SignupCheckoutRequest;
import com.indice.erp.auth.SignupPlanCalculator;
import com.indice.erp.auth.SignupPlanSelection;
import com.indice.erp.auth.SignupProfile;
import com.indice.erp.auth.SignupRequest;
import com.indice.erp.auth.SignupService;
import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeSignupCheckoutServiceTest {

    @Mock private SignupService signupService;
    @Mock private SignupPlanCalculator planCalculator;
    @Mock private SignupIntentRepository intentRepository;
    @Mock private SignupIntentModuleRepository intentModuleRepository;
    @Mock private StripeCheckoutLineItemFactory lineItemFactory;
    @Mock private StripeBillingGateway stripeGateway;
    @Mock private BillingPaymentAuditService auditService;

    @Test
    void createCheckoutUsesIntentScopedIdempotencyKeys() throws Exception {
        var properties = new StripeSignupProperties();
        properties.setSecretKey("sk_test_key");
        properties.setSuccessUrl("http://localhost/success");
        properties.setCancelUrl("http://localhost/cancel");
        var clock = Clock.fixed(Instant.parse("2026-07-08T12:00:00Z"), ZoneOffset.UTC);
        var service = new StripeSignupCheckoutService(properties, signupService, planCalculator, intentRepository,
            intentModuleRepository, lineItemFactory, stripeGateway, auditService, clock);
        var request = request();
        var profile = new SignupProfile("Ada Owner", "ada@example.com", "hash", "Ada Studio", "retail", "1-5", "US", "+1555");
        var plan = new SignupPlanSelection("all-modules", 7, 5, 0, 19_900, "usd", List.of("crm"));
        var customer = new Customer();
        customer.setId("cus_test");
        var session = new Session();
        session.setId("cs_test");
        session.setUrl("https://checkout.stripe.com/c/test");
        when(signupService.prepareForCheckout(any(SignupRequest.class))).thenReturn(profile);
        when(intentRepository.findExpiredCheckoutAttempts()).thenReturn(List.of());
        when(intentRepository.findActivePendingByEmail("ada@example.com")).thenReturn(List.of());
        when(planCalculator.calculate(request)).thenReturn(plan);
        when(intentRepository.create(any(), eq(profile), eq(plan), any())).thenReturn(42L);
        when(lineItemFactory.lineItems(plan)).thenReturn(new ArrayList<>());
        when(stripeGateway.createCustomer(any(), eq("indice.signup_intent.42.customer.create"))).thenReturn(customer);
        when(stripeGateway.createCheckoutSession(any(), eq("indice.signup_intent.42.checkout_session.create"))).thenReturn(session);

        var response = service.createCheckout(request, "csrf-token");

        assertEquals("https://checkout.stripe.com/c/test", response.checkoutUrl());
        var expectedExpiry = Instant.parse("2026-07-08T12:30:00Z");
        var intentExpiry = ArgumentCaptor.forClass(Instant.class);
        verify(intentRepository).create(any(), eq(profile), eq(plan), intentExpiry.capture());
        assertEquals(expectedExpiry, intentExpiry.getValue());
        @SuppressWarnings("unchecked")
        var checkoutParams = ArgumentCaptor.forClass(Map.class);
        verify(stripeGateway).createCheckoutSession(checkoutParams.capture(), eq("indice.signup_intent.42.checkout_session.create"));
        assertEquals(expectedExpiry.getEpochSecond(), ((Number) checkoutParams.getValue().get("expires_at")).longValue());
        verify(intentRepository).attachCheckout(42L, "cs_test", "cus_test");
        verify(auditService).checkoutStarted(42L, plan);
        verify(auditService).checkoutCreated(42L, "cus_test", "cs_test", plan);
    }

    private SignupCheckoutRequest request() {
        return new SignupCheckoutRequest("Ada Owner", "ada@example.com", "securePass123", "Ada Studio",
            "retail", "1-5", "US", "+1555", "all-modules", 7, 0, List.of("crm"));
    }
}
