package com.indice.erp.billing.stripe;

import com.indice.erp.billing.signup.BillingSignupIntentRepository;
import com.indice.erp.billing.signup.BillingTenantProvisioningService;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BillingReconciliationJob {

    private static final Logger log = LoggerFactory.getLogger(BillingReconciliationJob.class);

    private final AtomicBoolean running = new AtomicBoolean();
    private final StripePhaseTwoProperties properties;
    private final StripeWebhookProcessor processor;
    private final BillingProjectionRepository projections;
    private final BillingSignupIntentRepository signupIntents;
    private final BillingTenantProvisioningService provisioning;
    private final StripeWebhookEventRepository events;

    public BillingReconciliationJob(
        StripePhaseTwoProperties properties,
        StripeWebhookProcessor processor,
        BillingProjectionRepository projections,
        BillingSignupIntentRepository signupIntents,
        BillingTenantProvisioningService provisioning,
        StripeWebhookEventRepository events
    ) {
        this.properties = properties;
        this.processor = processor;
        this.projections = projections;
        this.signupIntents = signupIntents;
        this.provisioning = provisioning;
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
            if (provisioning.enabled()) {
                for (var intentId : signupIntents.findProvisionableIds(provisioning.reconciliationBatchSize())) {
                    try {
                        provisioning.provisionIfEligible(intentId);
                    } catch (RuntimeException exception) {
                        log.error("billing_signup_provisioning_failed intentId={}", intentId, exception);
                    }
                }
            }
            signupIntents.expireStaleCheckouts();
            events.purgeExpiredPayloads();
        } finally {
            running.set(false);
        }
    }
}
