package com.indice.erp.billing.stripe;

import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BillingReconciliationJob {

    private final AtomicBoolean running = new AtomicBoolean();
    private final StripePhaseTwoProperties properties;
    private final StripeWebhookProcessor processor;
    private final BillingProjectionRepository projections;
    private final BillingSignupIntentRepository signupIntents;
    private final StripeWebhookEventRepository events;

    public BillingReconciliationJob(
        StripePhaseTwoProperties properties,
        StripeWebhookProcessor processor,
        BillingProjectionRepository projections,
        BillingSignupIntentRepository signupIntents,
        StripeWebhookEventRepository events
    ) {
        this.properties = properties;
        this.processor = processor;
        this.projections = projections;
        this.signupIntents = signupIntents;
        this.events = events;
    }

    @Scheduled(fixedDelayString = "${app.billing.stripe.processor-delay-ms:5000}")
    public void reconcile() {
        if (!properties.isEnabled() || !properties.isProcessorEnabled() || !running.compareAndSet(false, true)) {
            return;
        }
        try {
            processor.processBatch();
            projections.reconcileUnassociatedSubscriptions();
            signupIntents.expireStaleCheckouts();
            events.purgeExpiredPayloads();
        } finally {
            running.set(false);
        }
    }
}
