package com.indice.erp.billing.stripe;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.SignupService;
import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeSignupWebhookServiceTest {

    private static final String SECRET = "whsec_test";
    private static final String PAYLOAD = """
        {"id":"evt_valid","object":"event","created":1783512000,"type":"billing.unhandled","data":{"object":{"object":"billing.test"}}}
        """;

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
    @Mock private BillingPaymentAuditService auditService;

    @Test
    void validSignatureRecordsUnhandledEvent() {
        when(eventRepository.alreadyProcessed("evt_valid")).thenReturn(false);

        service().handle(PAYLOAD, StripeWebhookTestSupport.signature(PAYLOAD, SECRET));

        verify(auditService).webhook("evt_valid", "billing.unhandled", "received", null, null);
        verify(auditService).webhook("evt_valid", "billing.unhandled", "processed", null, null);
        verify(eventRepository).recordProcessed("evt_valid", "billing.unhandled", PAYLOAD);
    }

    @Test
    void invalidSignatureIsRejectedBeforeEventLookup() {
        assertThrows(IllegalArgumentException.class, () -> service().handle(PAYLOAD, "t=1783512000,v1=bad"));
        verifyNoInteractions(eventRepository);
        verifyNoInteractions(auditService);
    }

    @Test
    void duplicateEventIsNotProcessedAgain() {
        when(eventRepository.alreadyProcessed("evt_valid")).thenReturn(true);

        service().handle(PAYLOAD, StripeWebhookTestSupport.signature(PAYLOAD, SECRET));

        verify(auditService).webhook("evt_valid", "billing.unhandled", "received", null, null);
        verify(auditService).webhook("evt_valid", "billing.unhandled", "ignored", null, "Duplicate Stripe webhook event.");
        verify(eventRepository, never()).recordProcessed(anyString(), anyString(), anyString());
        verifyNoInteractions(moduleEntitlementService, invoicePaymentHandler, notificationService);
    }

    @Test
    void activeSubscriptionUpdateActivatesPaidPlan() {
        var subscription = StripeWebhookTestSupport.subscription("sub_test", "active");
        when(subscriptionMapper.updateLocalState(subscriptionRepository, subscription)).thenReturn(1);

        service().handleSubscriptionChanged(StripeWebhookTestSupport.event("customer.subscription.updated", subscription));

        verify(moduleEntitlementService).activatePaidPlanBySubscription("sub_test");
    }

    @Test
    void deletedSubscriptionUpdateNotifiesBillingOwner() {
        var subscription = StripeWebhookTestSupport.subscription("sub_test", "canceled");
        when(subscriptionMapper.updateLocalState(subscriptionRepository, subscription)).thenReturn(1);

        service().handleSubscriptionChanged(StripeWebhookTestSupport.event(subscription));

        verify(notificationService).subscriptionCanceled(subscription);
    }

    @Test
    void unknownSubscriptionUpdateIsRetryable() {
        var subscription = StripeWebhookTestSupport.subscription("sub_missing", "past_due");
        when(subscriptionMapper.updateLocalState(subscriptionRepository, subscription)).thenReturn(0);

        assertThrows(IllegalStateException.class,
            () -> service().handleSubscriptionChanged(StripeWebhookTestSupport.event(subscription)));
    }

    @Test
    void trialWillEndRequiresLocalSubscriptionThenNotifies() {
        var subscription = StripeWebhookTestSupport.subscription("sub_test", "trialing");
        when(subscriptionRepository.exists("sub_test")).thenReturn(true);

        service().handleTrialWillEnd(StripeWebhookTestSupport.event(subscription));

        verify(notificationService).trialWillEnd(subscription);
    }

    @Test
    void paymentFailureForUnknownSubscriptionIsRetryable() {
        var invoice = StripeWebhookTestSupport.invoice("in_test", "sub_missing");
        when(invoicePaymentHandler.handlePaymentFailed(invoice)).thenReturn(false);

        assertThrows(IllegalStateException.class,
            () -> service().handleInvoicePaymentFailed(StripeWebhookTestSupport.event(invoice)));
    }

    @Test
    void invoicePaidUsesSucceededPaymentPath() {
        var invoice = StripeWebhookTestSupport.invoice("in_test", "sub_test");
        when(invoicePaymentHandler.handlePaymentSucceeded(invoice)).thenReturn(true);

        service().handleInvoicePaymentSucceeded(StripeWebhookTestSupport.event(invoice));

        verify(notificationService).paymentSucceeded(invoice, "sub_test");
    }

    private StripeSignupWebhookService service() {
        var properties = new StripeSignupProperties();
        properties.setWebhookSecret(SECRET);
        return new StripeSignupWebhookService(properties, intentRepository, intentModuleRepository,
            eventRepository, unmatchedEventRepository, subscriptionRepository, stripeGateway, subscriptionMapper, moduleEntitlementService,
            invoicePaymentHandler, notificationService, reconciliationService, signupService,
            auditService, Clock.fixed(Instant.parse("2026-07-08T12:00:00Z"), ZoneOffset.UTC));
    }

}
