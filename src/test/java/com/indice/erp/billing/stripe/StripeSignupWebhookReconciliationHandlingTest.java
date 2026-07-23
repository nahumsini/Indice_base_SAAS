package com.indice.erp.billing.stripe;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SignupBillingInfo;
import com.indice.erp.auth.SignupPlanSelection;
import com.indice.erp.auth.SignupProfile;
import com.indice.erp.auth.SignupService;
import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import com.stripe.Stripe;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeSignupWebhookReconciliationHandlingTest {

    private static final String SECRET = "whsec_test";

    @Mock private SignupIntentRepository intentRepository;
    @Mock private SignupIntentModuleRepository intentModuleRepository;
    @Mock private StripeWebhookEventRepository eventRepository;
    @Mock private StripeUnmatchedWebhookEventRepository unmatchedEventRepository;
    @Mock private CompanyBillingSubscriptionRepository subscriptionRepository;
    @Mock private StripeBillingGateway stripeGateway;
    @Mock private StripeSubscriptionBillingMapper subscriptionMapper;
    @Mock private CompanyModuleEntitlementService moduleEntitlementService;
    @Mock private StripeInvoicePaymentHandler invoicePaymentHandler;
    @Mock private StripeBillingNotificationService notificationService;
    @Mock private StripeWebhookReconciliationService reconciliationService;
    @Mock private SignupService signupService;

    @Test
    void retryableWebhookStoresUnmatchedEvent() {
        var payload = """
            {"id":"evt_missing","object":"event","api_version":"%s","created":1783512000,"type":"customer.subscription.updated","data":{"object":{"id":"sub_missing","object":"subscription","status":"past_due"}}}
            """.formatted(Stripe.API_VERSION);
        when(eventRepository.alreadyProcessed("evt_missing")).thenReturn(false);
        when(subscriptionMapper.updateLocalState(eq(subscriptionRepository), any(Subscription.class))).thenReturn(0);

        assertThrows(StripeWebhookRetryableException.class,
            () -> service().handle(payload, StripeWebhookTestSupport.signature(payload, SECRET)));

        verify(unmatchedEventRepository).record(eq("evt_missing"), eq("customer.subscription.updated"),
            eq(payload), eq("sub_missing"), contains("not locally available"));
        verify(eventRepository, never()).recordProcessed(anyString(), anyString(), anyString());
    }

    @Test
    void checkoutCompletionResolvesPendingWebhookEvents() throws Exception {
        var session = session();
        var profile = new SignupProfile("Ada Owner", "ada@example.com", "hash", "Ada Studio", "retail", "1-5", "US", "+1555");
        var plan = new SignupPlanSelection("all-modules", 7, 5, 0, 19_900, "usd", List.of("crm"));
        var intent = new SignupIntentRecord(42L, "intent-token", "checkout_created", profile, plan,
            "cs_test", "cus_test", null, null, null, Instant.parse("2026-07-08T12:05:00Z"));
        var subscription = StripeWebhookTestSupport.subscription("sub_test", "trialing");
        var billing = new SignupBillingInfo(plan, "cus_test", "sub_test", "trialing",
            null, null, null, null, false, null, "stripe");
        when(intentRepository.findByToken("intent-token")).thenReturn(Optional.of(intent));
        when(intentModuleRepository.list(42L)).thenReturn(List.of("crm"));
        when(stripeGateway.retrieveSubscription("sub_test")).thenReturn(subscription);
        when(subscriptionMapper.billingInfo(any(SignupIntentRecord.class), eq(session), eq(subscription))).thenReturn(billing);
        when(signupService.createVerifiedAccount(profile, billing)).thenReturn(new SignupService.SignupResult(7L, 8L, 9L));

        service().handleCheckoutCompleted(StripeWebhookTestSupport.event(session));

        verify(intentRepository).markCompleted(42L, 8L, "sub_test");
        verify(reconciliationService).resolvePendingForSubscription(subscription);
    }

    @Test
    void checkoutCompletionProvisionsExpiredLocalIntent() throws Exception {
        var session = session();
        var profile = new SignupProfile("Ada Owner", "ada@example.com", "hash", "Ada Studio", "retail", "1-5", "US", "+1555");
        var plan = new SignupPlanSelection("all-modules", 7, 5, 0, 19_900, "usd", List.of("crm"));
        var intent = new SignupIntentRecord(42L, "intent-token", "expired", profile, plan,
            "cs_test", "cus_test", null, null, null, Instant.parse("2026-07-08T11:59:00Z"));
        var subscription = StripeWebhookTestSupport.subscription("sub_test", "trialing");
        var billing = new SignupBillingInfo(plan, "cus_test", "sub_test", "trialing",
            null, null, null, null, false, null, "stripe");
        when(intentRepository.findByToken("intent-token")).thenReturn(Optional.of(intent));
        when(intentModuleRepository.list(42L)).thenReturn(List.of("crm"));
        when(stripeGateway.retrieveSubscription("sub_test")).thenReturn(subscription);
        when(subscriptionMapper.billingInfo(any(SignupIntentRecord.class), eq(session), eq(subscription))).thenReturn(billing);
        when(signupService.createVerifiedAccount(profile, billing)).thenReturn(new SignupService.SignupResult(7L, 8L, 9L));

        service().handleCheckoutCompleted(StripeWebhookTestSupport.event(session));

        verify(intentRepository).markCompleted(42L, 8L, "sub_test");
        verify(intentRepository, never()).deleteInactive(42L);
    }

    private Session session() {
        var session = new Session();
        session.setStatus("complete");
        session.setClientReferenceId("intent-token");
        session.setCustomer("cus_test");
        session.setSubscription("sub_test");
        return session;
    }

    private StripeSignupWebhookService service() {
        var properties = new StripeSignupProperties();
        properties.setWebhookSecret(SECRET);
        return new StripeSignupWebhookService(properties, intentRepository, intentModuleRepository,
            eventRepository, unmatchedEventRepository, subscriptionRepository, stripeGateway, subscriptionMapper,
            moduleEntitlementService, invoicePaymentHandler, notificationService, reconciliationService, signupService,
            BillingPaymentAuditService.noop(), Clock.fixed(Instant.parse("2026-07-08T12:00:00Z"), ZoneOffset.UTC));
    }
}
