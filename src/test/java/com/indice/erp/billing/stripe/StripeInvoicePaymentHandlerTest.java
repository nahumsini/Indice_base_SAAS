package com.indice.erp.billing.stripe;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StripeInvoicePaymentHandlerTest {

    @Mock private CompanyBillingSubscriptionRepository repository;
    @Mock private CompanyModuleEntitlementService moduleEntitlementService;

    @Test
    void succeededPaymentClearsFailureAndActivatesPaidPlan() {
        var invoice = StripeWebhookTestSupport.invoice("in_test", "sub_test");
        when(repository.markPaymentSucceeded("sub_test", "in_test")).thenReturn(1);

        assertTrue(handler().handlePaymentSucceeded(invoice));

        verify(moduleEntitlementService).activatePaidPlanBySubscription("sub_test");
    }

    @Test
    void succeededPaymentReturnsFalseWhenSubscriptionIsUnknown() {
        var invoice = StripeWebhookTestSupport.invoice("in_test", "sub_missing");
        when(repository.markPaymentSucceeded("sub_missing", "in_test")).thenReturn(0);

        assertFalse(handler().handlePaymentSucceeded(invoice));

        verify(moduleEntitlementService, never()).activatePaidPlanBySubscription("sub_missing");
    }

    @Test
    void failedPaymentLocksKnownSubscription() {
        var invoice = StripeWebhookTestSupport.invoice("in_test", "sub_test");
        when(repository.markPaymentFailed(
            "sub_test",
            "in_test",
            "Stripe invoice payment failed.",
            Instant.parse("2026-07-23T12:00:00Z")
        )).thenReturn(1);

        assertTrue(handler().handlePaymentFailed(invoice));
    }

    @Test
    void failedPaymentReturnsFalseWhenSubscriptionIsUnknown() {
        var invoice = StripeWebhookTestSupport.invoice("in_test", "sub_missing");
        when(repository.markPaymentFailed(
            "sub_missing",
            "in_test",
            "Stripe invoice payment failed.",
            Instant.parse("2026-07-23T12:00:00Z")
        )).thenReturn(0);

        assertFalse(handler().handlePaymentFailed(invoice));
    }

    private StripeInvoicePaymentHandler handler() {
        var properties = new StripeSignupProperties();
        properties.setPaymentFailureGraceDays(3);
        return new StripeInvoicePaymentHandler(
            repository,
            moduleEntitlementService,
            properties,
            Clock.fixed(Instant.parse("2026-07-20T12:00:00Z"), ZoneOffset.UTC)
        );
    }
}
