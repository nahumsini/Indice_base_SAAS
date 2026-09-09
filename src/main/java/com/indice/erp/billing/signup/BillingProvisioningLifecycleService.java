package com.indice.erp.billing.signup;

import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import java.time.Instant;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class BillingProvisioningLifecycleService {

    private static final Set<String> PROJECTED_STATUSES = Set.of(
        "trialing", "active", "past_due", "unpaid", "canceled", "paused", "incomplete_expired"
    );

    private final JdbcTemplate jdbc;
    private final CommercialLifecycleService lifecycle;

    public BillingProvisioningLifecycleService(JdbcTemplate jdbc, CommercialLifecycleService lifecycle) {
        this.jdbc = jdbc;
        this.lifecycle = lifecycle;
    }

    public void initializeStripe(long companyId, long intentId, Instant trialEndsAt) {
        var subscriptions = jdbc.query(
            """
                SELECT stripe_subscription_id, status, last_event_id, last_event_created_at
                FROM company_billing_subscriptions
                WHERE company_id = ? AND signup_intent_id = ?
                ORDER BY last_event_created_at DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new SubscriptionState(
                rs.getString("stripe_subscription_id"), rs.getString("status"),
                rs.getString("last_event_id"), rs.getTimestamp("last_event_created_at").toInstant()
            ),
            companyId, intentId
        );
        if (subscriptions.isEmpty() || !PROJECTED_STATUSES.contains(subscriptions.getFirst().status())) {
            lifecycle.initializeTrial(companyId, trialEndsAt);
            return;
        }
        var subscription = subscriptions.getFirst();
        lifecycle.applySubscriptionEvent(
            companyId, subscription.eventId(), subscription.createdAt(), subscription.status(), trialEndsAt
        );

        var invoices = jdbc.query(
            """
                SELECT invoice.status, invoice.period_starts_at,
                       event.stripe_event_id, event.event_type, event.event_created_at
                FROM billing_invoice_snapshots invoice
                JOIN stripe_webhook_events event ON event.stripe_event_id = invoice.last_event_id
                WHERE invoice.company_id = ? AND invoice.stripe_subscription_id = ?
                  AND event.status = 'PROCESSED'
                  AND (event.event_type = 'invoice.payment_failed'
                    OR (event.event_type IN ('invoice.paid', 'invoice.payment_succeeded') AND invoice.status = 'paid'))
                ORDER BY event.event_created_at DESC, event.stripe_event_id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new InvoiceState(
                rs.getString("stripe_event_id"), rs.getString("event_type"), rs.getString("status"),
                rs.getTimestamp("event_created_at").toInstant(),
                rs.getTimestamp("period_starts_at") == null ? null : rs.getTimestamp("period_starts_at").toInstant()
            ),
            companyId, subscription.subscriptionId()
        );
        if (invoices.isEmpty()) return;
        var invoice = invoices.getFirst();
        // Stripe also emits a paid zero-value invoice at trial start; it must not end the trial.
        if ("trialing".equals(subscription.status())
            && (invoice.periodStartsAt() == null || invoice.periodStartsAt().isBefore(trialEndsAt))) {
            return;
        }
        lifecycle.applyInvoiceEvent(
            companyId, invoice.eventId(), invoice.createdAt(), invoice.type(), invoice.status()
        );
    }

    private record SubscriptionState(String subscriptionId, String status, String eventId, Instant createdAt) {
    }

    private record InvoiceState(String eventId, String type, String status, Instant createdAt, Instant periodStartsAt) {
    }
}
