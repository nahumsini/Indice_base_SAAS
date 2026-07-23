package com.indice.erp.billing.stripe;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.billing.legacy-stripe-jobs.enabled", havingValue = "true")
class StripeWebhookReconciliationJob {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookReconciliationJob.class);

    private final StripeWebhookReconciliationService reconciliationService;

    StripeWebhookReconciliationJob(StripeWebhookReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @Scheduled(fixedDelayString = "${app.billing.stripe.webhook-reconciliation-delay-ms:300000}")
    void reconcileUnmatchedWebhooks() {
        var resolved = reconciliationService.reconcilePending();
        if (resolved > 0) {
            log.info("Reconciled {} unmatched Stripe webhook events", resolved);
        }
    }
}
