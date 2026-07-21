package com.indice.erp.billing.stripe;

import com.indice.erp.billing.audit.BillingAuditService;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class StripeWebhookProcessor {

    private final String leaseOwner = "billing-" + UUID.randomUUID().toString().substring(0, 12);
    private final StripeWebhookEventRepository repository;
    private final StripeWebhookEventHandler handler;
    private final StripePhaseTwoProperties properties;
    private final BillingAuditService audit;

    public StripeWebhookProcessor(
        StripeWebhookEventRepository repository,
        StripeWebhookEventHandler handler,
        StripePhaseTwoProperties properties,
        BillingAuditService audit
    ) {
        this.repository = repository;
        this.handler = handler;
        this.properties = properties;
        this.audit = audit;
    }

    public int processBatch() {
        var processed = 0;
        for (var index = 0; index < properties.getBatchSize(); index++) {
            var event = repository.claimNext(leaseOwner, properties.getLeaseSeconds());
            if (event == null) {
                break;
            }
            try {
                var result = handler.process(event);
                repository.markProcessed(event.id(), result);
            } catch (StripeEventProcessingException exception) {
                repository.markRetry(
                    event.id(), event.attemptCount(), properties.getMaxAttempts(), exception.code(), exception.getMessage()
                );
                audit.record(
                    "STRIPE_WEBHOOK", "EVENT_PROCESSING", "RETRY", null, event.eventId(), null,
                    null, null, Map.of("code", exception.code(), "attempt", event.attemptCount())
                );
            } catch (RuntimeException exception) {
                repository.markRetry(
                    event.id(), event.attemptCount(), properties.getMaxAttempts(),
                    "UNEXPECTED_PROCESSING_ERROR", exception.getMessage()
                );
                audit.record(
                    "STRIPE_WEBHOOK", "EVENT_PROCESSING", "RETRY", null, event.eventId(), null,
                    null, null, Map.of("code", "UNEXPECTED_PROCESSING_ERROR", "attempt", event.attemptCount())
                );
            }
            processed++;
        }
        return processed;
    }
}
