package com.indice.erp.billing.stripe;

import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.notifications.AppNotificationService;
import com.stripe.model.Invoice;
import com.stripe.model.Subscription;
import org.springframework.stereotype.Service;

@Service
class StripeBillingNotificationService {

    private static final String ACTION_URL = "/billing/subscription";

    private final CompanyBillingSubscriptionRepository repository;
    private final AppNotificationService notificationService;

    StripeBillingNotificationService(
        CompanyBillingSubscriptionRepository repository,
        AppNotificationService notificationService
    ) {
        this.repository = repository;
        this.notificationService = notificationService;
    }

    void trialWillEnd(Subscription subscription) {
        publish(subscription.getId(), "trial_will_end", "Trial ending soon",
            "Your Indice trial is ending soon. Review your billing settings to avoid interruption.");
    }

    void paymentSucceeded(Invoice invoice, String subscriptionId) {
        publish(subscriptionId, "payment_succeeded", "Payment received",
            "Your subscription payment succeeded and billing access is active.");
    }

    void paymentFailed(Invoice invoice, String subscriptionId) {
        publish(subscriptionId, "payment_failed", "Payment failed",
            "Your subscription payment failed. Update your payment method to restore access.");
    }

    void subscriptionCanceled(Subscription subscription) {
        publish(subscription.getId(), "subscription_canceled", "Subscription canceled",
            "Your subscription was canceled and account access is now limited.");
    }

    private void publish(String subscriptionId, String eventType, String title, String description) {
        if (subscriptionId == null || subscriptionId.isBlank()) {
            return;
        }
        repository.billingRecipient(subscriptionId.trim()).ifPresent(recipient ->
            notificationService.publish(new AppNotificationEvent(
                recipient.companyId(),
                recipient.userCompanyId(),
                "billing",
                "stripe_subscription",
                null,
                eventType,
                "billing." + eventType + "." + subscriptionId.trim(),
                title,
                description,
                ACTION_URL
            ))
        );
    }
}
