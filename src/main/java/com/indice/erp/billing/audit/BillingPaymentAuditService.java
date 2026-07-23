package com.indice.erp.billing.audit;

import com.indice.erp.auth.SignupPlanSelection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class BillingPaymentAuditService {

    private final BillingPaymentAuditRepository repository;
    private final boolean enabled;

    @Autowired
    public BillingPaymentAuditService(BillingPaymentAuditRepository repository) {
        this(repository, true);
    }

    private BillingPaymentAuditService(BillingPaymentAuditRepository repository, boolean enabled) {
        this.repository = repository;
        this.enabled = enabled;
    }

    public static BillingPaymentAuditService noop() {
        return new BillingPaymentAuditService(null, false);
    }

    public void checkoutStarted(long intentId, SignupPlanSelection plan) {
        record(base("signup.checkout.started", "started", "checkout_api")
            .intent(intentId)
            .amount(plan.monthlyAmountCents(), plan.currency())
            .metadata(planMetadata(plan)));
    }

    public void checkoutCreated(long intentId, String customerId, String sessionId, SignupPlanSelection plan) {
        record(base("signup.checkout.created", "succeeded", "checkout_api")
            .intent(intentId)
            .stripe(customerId, null, sessionId, null, null)
            .amount(plan.monthlyAmountCents(), plan.currency())
            .metadata(planMetadata(plan)));
    }

    public void checkoutFailed(long intentId, String message) {
        record(base("signup.checkout.failed", "failed", "checkout_api")
            .intent(intentId)
            .failure("stripe_checkout_failed", message));
    }

    public void checkoutCompleted(long intentId, long companyId, String customerId, String sessionId,
            String subscriptionId, SignupPlanSelection plan) {
        record(base("signup.checkout.completed", "succeeded", "stripe_webhook")
            .company(companyId)
            .intent(intentId)
            .stripe(customerId, subscriptionId, sessionId, null, null)
            .amount(plan.monthlyAmountCents(), plan.currency())
            .metadata(planMetadata(plan)));
    }

    public void webhook(String eventId, String eventType, String status, String subscriptionId, String message) {
        var event = base("stripe.webhook." + status, status, "stripe_webhook")
            .stripe(null, subscriptionId, null, null, eventId)
            .metadata(java.util.Map.of("stripe_event_type", clean(eventType)));
        record(message == null || message.isBlank() ? event : event.failure(status, message));
    }

    public void subscriptionEvent(String eventId, String eventType, String subscriptionId, String status) {
        record(base("stripe.subscription.changed", "succeeded", "stripe_webhook")
            .stripe(null, subscriptionId, null, null, eventId)
            .metadata(java.util.Map.of("stripe_event_type", clean(eventType), "subscription_status", clean(status))));
    }

    public void invoiceEvent(String eventId, String eventType, String subscriptionId, String invoiceId,
            String status, Integer amountCents, String currency, String failureMessage) {
        var event = base("stripe.invoice." + status, status, "stripe_webhook")
            .stripe(null, subscriptionId, null, invoiceId, eventId)
            .amount(amountCents, currency)
            .metadata(java.util.Map.of("stripe_event_type", clean(eventType)));
        record(failureMessage == null || failureMessage.isBlank()
            ? event
            : event.failure("invoice_payment_failed", failureMessage));
    }

    public void subscriptionAction(long companyId, String subscriptionId, String action, String status, String message) {
        var event = base("subscription." + action, status, "billing_api")
            .company(companyId)
            .stripe(null, subscriptionId, null, null, null);
        record(message == null || message.isBlank() ? event : event.failure(action + "_" + status, message));
    }

    public void reconciliation(String eventId, String subscriptionId, String status, String message) {
        var event = base("stripe.webhook.reconciliation", status, "reconciliation_job")
            .stripe(null, subscriptionId, null, null, eventId);
        record(message == null || message.isBlank() ? event : event.failure("reconciliation_" + status, message));
    }

    private void record(BillingPaymentAuditEvent event) {
        if (!enabled || repository == null) {
            return;
        }
        try {
            repository.insert(event);
        } catch (RuntimeException ignored) {
            // Audit logging must never block auth, checkout, webhook, or billing flows.
        }
    }

    private BillingPaymentAuditEvent base(String eventType, String status, String source) {
        return BillingPaymentAuditEvent.of(eventType, status, source);
    }

    private java.util.Map<String, Object> planMetadata(SignupPlanSelection plan) {
        return java.util.Map.of(
            "plan_id", clean(plan.planId()),
            "module_count", plan.moduleCount(),
            "included_collaborators", plan.includedCollaborators(),
            "extra_collaborators", plan.extraCollaborators(),
            "selected_module_slugs", String.join(",", plan.selectedModuleSlugs())
        );
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
