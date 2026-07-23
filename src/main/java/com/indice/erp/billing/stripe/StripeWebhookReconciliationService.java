package com.indice.erp.billing.stripe;

import com.indice.erp.billing.audit.BillingPaymentAuditService;
import com.indice.erp.billing.subscription.CompanyModuleEntitlementService;
import com.stripe.exception.StripeException;
import com.stripe.model.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class StripeWebhookReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookReconciliationService.class);
    private static final int BATCH_SIZE = 25;

    private final StripeUnmatchedWebhookEventRepository eventRepository;
    private final CompanyBillingSubscriptionRepository subscriptionRepository;
    private final StripeSubscriptionBillingMapper subscriptionMapper;
    private final CompanyModuleEntitlementService moduleEntitlementService;
    private final StripeBillingNotificationService notificationService;
    private final StripeBillingGateway stripeGateway;
    private final BillingPaymentAuditService auditService;

    StripeWebhookReconciliationService(
        StripeUnmatchedWebhookEventRepository eventRepository,
        CompanyBillingSubscriptionRepository subscriptionRepository,
        StripeSubscriptionBillingMapper subscriptionMapper,
        CompanyModuleEntitlementService moduleEntitlementService,
        StripeBillingNotificationService notificationService,
        StripeBillingGateway stripeGateway,
        BillingPaymentAuditService auditService
    ) {
        this.eventRepository = eventRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionMapper = subscriptionMapper;
        this.moduleEntitlementService = moduleEntitlementService;
        this.notificationService = notificationService;
        this.stripeGateway = stripeGateway;
        this.auditService = auditService;
    }

    @Transactional
    int reconcilePending() {
        var resolved = 0;
        for (var event : eventRepository.pending(BATCH_SIZE)) {
            resolved += reconcile(event);
        }
        return resolved;
    }

    @Transactional
    int resolvePendingForSubscription(Subscription subscription) {
        var subscriptionId = subscription == null ? "" : clean(subscription.getId());
        if (subscriptionId.isBlank()) {
            return 0;
        }
        var pending = eventRepository.pendingForSubscription(subscriptionId, BATCH_SIZE);
        if (pending.isEmpty() || !applyLatestSubscription(subscription)) {
            return 0;
        }
        pending.forEach(event -> {
            eventRepository.markResolved(event);
            auditService.reconciliation(event.stripeEventId(), subscriptionId, "resolved", null);
        });
        return pending.size();
    }

    private int reconcile(StripeUnmatchedWebhookEvent event) {
        var subscriptionId = clean(event.stripeSubscriptionId());
        if (subscriptionId.isBlank() || "unknown".equals(subscriptionId)) {
            eventRepository.markAttemptFailed(event.id(), "Stripe subscription id is missing.");
            auditService.reconciliation(event.stripeEventId(), subscriptionId, "retrying", "Stripe subscription id is missing.");
            return 0;
        }
        if (!subscriptionRepository.exists(subscriptionId)) {
            eventRepository.markAttemptFailed(event.id(), "Local subscription row is not ready.");
            auditService.reconciliation(event.stripeEventId(), subscriptionId, "retrying", "Local subscription row is not ready.");
            return 0;
        }
        try {
            var subscription = stripeGateway.retrieveSubscription(subscriptionId);
            if (!applyLatestSubscription(subscription)) {
                eventRepository.markAttemptFailed(event.id(), "Local subscription update touched zero rows.");
                auditService.reconciliation(event.stripeEventId(), subscriptionId, "retrying", "Local subscription update touched zero rows.");
                return 0;
            }
            eventRepository.markResolved(event);
            auditService.reconciliation(event.stripeEventId(), subscriptionId, "resolved", null);
            return 1;
        } catch (StripeException ex) {
            log.info("Stripe unmatched webhook reconciliation failed for {}", subscriptionId, ex);
            eventRepository.markAttemptFailed(event.id(), "Stripe subscription could not be retrieved.");
            auditService.reconciliation(event.stripeEventId(), subscriptionId, "retrying", "Stripe subscription could not be retrieved.");
            return 0;
        }
    }

    private boolean applyLatestSubscription(Subscription subscription) {
        var updated = subscriptionMapper.updateLocalState(subscriptionRepository, subscription);
        if (updated <= 0) {
            return false;
        }
        if ("active".equals(subscription.getStatus())) {
            moduleEntitlementService.activatePaidPlanBySubscription(subscription.getId());
        }
        if ("canceled".equals(subscription.getStatus())) {
            notificationService.subscriptionCanceled(subscription);
        }
        return true;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
