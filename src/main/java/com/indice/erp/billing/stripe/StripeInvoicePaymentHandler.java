package com.indice.erp.billing.stripe;

import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import com.stripe.model.Invoice;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class StripeInvoicePaymentHandler {

    private final CompanyBillingSubscriptionRepository subscriptionRepository;
    private final CompanyModuleEntitlementService moduleEntitlementService;
    private final StripeSignupProperties properties;
    private final Clock clock;

    StripeInvoicePaymentHandler(
        CompanyBillingSubscriptionRepository subscriptionRepository,
        CompanyModuleEntitlementService moduleEntitlementService,
        StripeSignupProperties properties,
        Clock clock
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.moduleEntitlementService = moduleEntitlementService;
        this.properties = properties;
        this.clock = clock;
    }

    boolean handlePaymentSucceeded(Invoice invoice) {
        var subscriptionId = subscriptionId(invoice);
        if (!subscriptionId.isBlank()) {
            var updated = subscriptionRepository.markPaymentSucceeded(subscriptionId, invoice.getId());
            if (updated <= 0) {
                return false;
            }
            moduleEntitlementService.activatePaidPlanBySubscription(subscriptionId);
            return true;
        }
        return true;
    }

    boolean handlePaymentFailed(Invoice invoice) {
        var subscriptionId = subscriptionId(invoice);
        if (!subscriptionId.isBlank()) {
            return subscriptionRepository.markPaymentFailed(
                subscriptionId,
                invoice.getId(),
                "Stripe invoice payment failed.",
                paymentGraceUntil()
            ) > 0;
        }
        return true;
    }

    private Instant paymentGraceUntil() {
        var graceDays = properties.getPaymentFailureGraceDays();
        return graceDays <= 0 ? null : clock.instant().plus(Duration.ofDays(graceDays));
    }

    private String subscriptionId(Invoice invoice) {
        if (invoice.getParent() == null || invoice.getParent().getSubscriptionDetails() == null) {
            return "";
        }
        var subscriptionId = invoice.getParent().getSubscriptionDetails().getSubscription();
        return subscriptionId == null ? "" : subscriptionId.trim();
    }
}
