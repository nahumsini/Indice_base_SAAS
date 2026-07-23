package com.indice.erp.billing.stripe;

import com.indice.erp.auth.SignupBillingInfo;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class StripeSubscriptionBillingMapper {

    SignupBillingInfo billingInfo(SignupIntentRecord intent, Session session, Subscription subscription) {
        var status = requireActiveSubscriptionStatus(subscription.getStatus());
        var customerId = firstText(session.getCustomer(), subscription.getCustomer(), intent.stripeCustomerId());
        return new SignupBillingInfo(
            intent.plan(),
            requireText(customerId, "Stripe customer is missing."),
            subscription.getId(),
            status,
            instant(subscription.getTrialStart()),
            instant(subscription.getTrialEnd()),
            currentPeriodStart(subscription),
            currentPeriodEnd(subscription),
            Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd()),
            instant(subscription.getCanceledAt()),
            "stripe"
        );
    }

    int updateLocalState(CompanyBillingSubscriptionRepository repository, Subscription subscription) {
        return repository.updateStripeState(
            subscription.getId(),
            subscription.getStatus(),
            instant(subscription.getTrialStart()),
            instant(subscription.getTrialEnd()),
            currentPeriodStart(subscription),
            currentPeriodEnd(subscription),
            Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd()),
            instant(subscription.getCanceledAt())
        );
    }

    private String requireActiveSubscriptionStatus(String status) {
        var value = requireText(status, "Stripe subscription status is missing.");
        if (!"trialing".equals(value) && !"active".equals(value)) {
            throw new IllegalArgumentException("Stripe subscription is not active or trialing.");
        }
        return value;
    }

    private String requireText(String value, String message) {
        var cleaned = value == null ? "" : value.trim();
        if (cleaned.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return cleaned;
    }

    private String firstText(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private Instant currentPeriodStart(Subscription subscription) {
        if (subscription.getItems() == null || subscription.getItems().getData().isEmpty()) {
            return null;
        }
        return instant(subscription.getItems().getData().getFirst().getCurrentPeriodStart());
    }

    private Instant currentPeriodEnd(Subscription subscription) {
        if (subscription.getItems() == null || subscription.getItems().getData().isEmpty()) {
            return null;
        }
        return instant(subscription.getItems().getData().getFirst().getCurrentPeriodEnd());
    }

    private Instant instant(Long epochSeconds) {
        return epochSeconds == null ? null : Instant.ofEpochSecond(epochSeconds);
    }
}
