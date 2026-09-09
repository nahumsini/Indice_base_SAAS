package com.indice.erp.billing.stripe;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class BillingProjectionRepository {

    private final JdbcTemplate jdbcTemplate;

    public BillingProjectionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public ProjectionAssociation upsertSubscription(SubscriptionSnapshot incoming, Long signupIntentId) {
        var existing = jdbcTemplate.query(
            """
                SELECT id, company_id, signup_intent_id, catalog_version_id, last_event_id, last_event_created_at
                FROM company_billing_subscriptions
                WHERE stripe_subscription_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new ExistingSubscription(
                rs.getLong("id"),
                (Long) rs.getObject("company_id"),
                (Long) rs.getObject("signup_intent_id"),
                (Long) rs.getObject("catalog_version_id"),
                rs.getString("last_event_id"),
                rs.getTimestamp("last_event_created_at").toInstant()
            ),
            incoming.subscriptionId()
        );
        if (existing.isEmpty()) {
            var intent = signupIntentId == null ? null : intentDetails(signupIntentId);
            jdbcTemplate.update(
                """
                    INSERT INTO company_billing_subscriptions (
                        stripe_subscription_id, stripe_customer_id, company_id, signup_intent_id,
                        catalog_version_id, offer_code, billing_interval, currency,
                        status, collection_method, included_seats, extra_seats,
                        subtotal_amount_cents, discount_amount_cents, promotion_code,
                        cancel_at_period_end, trial_starts_at, trial_ends_at,
                        current_period_starts_at, current_period_ends_at, canceled_at,
                        latest_invoice_id, last_payment_status, last_event_id, last_event_created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                incoming.subscriptionId(),
                incoming.customerId(),
                intent == null ? null : intent.companyId(),
                signupIntentId,
                intent == null ? null : intent.catalogVersionId(),
                intent == null ? null : intent.offerCode(),
                intent == null ? null : intent.billingInterval(),
                incoming.currency() == null && intent != null ? intent.currency() : incoming.currency(),
                incoming.status(),
                incoming.collectionMethod(),
                intent == null ? 5 : intent.includedSeats(),
                intent == null ? 0 : intent.extraSeats(),
                intent == null ? null : intent.subtotalAmountCents(),
                intent == null ? 0 : intent.discountAmountCents(),
                intent == null ? null : intent.promotionCode(),
                incoming.cancelAtPeriodEnd(),
                timestamp(incoming.trialStartsAt()),
                timestamp(incoming.trialEndsAt()),
                timestamp(incoming.currentPeriodStartsAt()),
                timestamp(incoming.currentPeriodEndsAt()),
                timestamp(incoming.canceledAt()),
                incoming.latestInvoiceId(),
                incoming.lastPaymentStatus(),
                incoming.eventId(),
                Timestamp.from(incoming.eventCreatedAt())
            );
            var internalId = jdbcTemplate.queryForObject(
                "SELECT id FROM company_billing_subscriptions WHERE stripe_subscription_id = ?",
                Long.class,
                incoming.subscriptionId()
            );
            copyIntentProducts(internalId, signupIntentId);
            return new ProjectionAssociation(internalId, intent == null ? null : intent.companyId(), signupIntentId, true);
        }

        var current = existing.getFirst();
        var effectiveIntentId = current.signupIntentId() == null ? signupIntentId : current.signupIntentId();
        if (effectiveIntentId != null && (current.catalogVersionId() == null
                || current.signupIntentId() == null || current.companyId() == null)) {
            associate(current.id(), effectiveIntentId);
        }
        if (isNewer(incoming.eventCreatedAt(), incoming.eventId(), current.lastEventCreatedAt(), current.lastEventId())) {
            jdbcTemplate.update(
                """
                    UPDATE company_billing_subscriptions
                    SET stripe_customer_id = COALESCE(?, stripe_customer_id),
                        currency = COALESCE(currency, ?),
                        status = ?, collection_method = ?,
                        cancel_at_period_end = ?, trial_starts_at = ?, trial_ends_at = ?,
                        current_period_starts_at = ?, current_period_ends_at = ?, canceled_at = ?,
                        latest_invoice_id = COALESCE(?, latest_invoice_id),
                        last_payment_status = COALESCE(?, last_payment_status),
                        last_event_id = ?, last_event_created_at = ?, projection_version = projection_version + 1
                    WHERE id = ?
                    """,
                incoming.customerId(),
                incoming.currency(),
                incoming.status(),
                incoming.collectionMethod(),
                incoming.cancelAtPeriodEnd(),
                timestamp(incoming.trialStartsAt()),
                timestamp(incoming.trialEndsAt()),
                timestamp(incoming.currentPeriodStartsAt()),
                timestamp(incoming.currentPeriodEndsAt()),
                timestamp(incoming.canceledAt()),
                incoming.latestInvoiceId(),
                incoming.lastPaymentStatus(),
                incoming.eventId(),
                Timestamp.from(incoming.eventCreatedAt()),
                current.id()
            );
            var association = associationForSubscription(incoming.subscriptionId());
            return new ProjectionAssociation(
                association.subscriptionInternalId(), association.companyId(), association.signupIntentId(), true
            );
        }
        return associationForSubscription(incoming.subscriptionId());
    }

    @Transactional
    public ProjectionAssociation associateSubscription(String stripeSubscriptionId, Long signupIntentId) {
        if (stripeSubscriptionId == null || signupIntentId == null) {
            return null;
        }
        var ids = jdbcTemplate.query(
            "SELECT id FROM company_billing_subscriptions WHERE stripe_subscription_id = ? FOR UPDATE",
            (rs, rowNum) -> rs.getLong(1),
            stripeSubscriptionId
        );
        if (ids.isEmpty()) {
            return null;
        }
        associate(ids.getFirst(), signupIntentId);
        return associationForSubscription(stripeSubscriptionId);
    }

    public ProjectionAssociation associationForSubscription(String stripeSubscriptionId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, company_id, signup_intent_id
                FROM company_billing_subscriptions
                WHERE stripe_subscription_id = ?
                """,
            (rs, rowNum) -> new ProjectionAssociation(
                rs.getLong("id"),
                (Long) rs.getObject("company_id"),
                (Long) rs.getObject("signup_intent_id"),
                false
            ),
            stripeSubscriptionId
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public ProjectionAssociation associationForInvoice(String stripeInvoiceId) {
        if (stripeInvoiceId == null || stripeInvoiceId.isBlank()) {
            return null;
        }
        var rows = jdbcTemplate.query(
            """
                SELECT COALESCE(subscription.id, 0) AS subscription_id,
                       COALESCE(invoice.company_id, subscription.company_id) AS company_id,
                       subscription.signup_intent_id
                FROM billing_invoice_snapshots invoice
                LEFT JOIN company_billing_subscriptions subscription
                  ON subscription.stripe_subscription_id = invoice.stripe_subscription_id
                WHERE invoice.stripe_invoice_id = ?
                ORDER BY invoice.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new ProjectionAssociation(
                rs.getLong("subscription_id"),
                (Long) rs.getObject("company_id"),
                (Long) rs.getObject("signup_intent_id"),
                false
            ),
            stripeInvoiceId.trim()
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public ProjectionAssociation associationForCustomer(String stripeCustomerId) {
        if (stripeCustomerId == null || stripeCustomerId.isBlank()) {
            return null;
        }
        var rows = jdbcTemplate.query(
            """
                SELECT id, company_id, signup_intent_id
                FROM company_billing_subscriptions
                WHERE stripe_customer_id = ?
                ORDER BY last_event_created_at DESC, id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new ProjectionAssociation(
                rs.getLong("id"),
                (Long) rs.getObject("company_id"),
                (Long) rs.getObject("signup_intent_id"),
                false
            ),
            stripeCustomerId.trim()
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public void upsertInvoice(InvoiceSnapshot incoming, ProjectionAssociation association) {
        var existing = jdbcTemplate.query(
            """
                SELECT id, last_event_id, last_event_created_at
                FROM billing_invoice_snapshots
                WHERE stripe_invoice_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new ExistingInvoice(
                rs.getLong("id"), rs.getString("last_event_id"), rs.getTimestamp("last_event_created_at").toInstant()
            ),
            incoming.invoiceId()
        );
        var companyId = association == null ? null : association.companyId();
        if (existing.isEmpty()) {
            jdbcTemplate.update(
                """
                    INSERT INTO billing_invoice_snapshots (
                        stripe_invoice_id, stripe_subscription_id, stripe_customer_id, company_id,
                        status, currency, amount_due_cents, amount_paid_cents,
                        hosted_invoice_url, invoice_pdf_url, period_starts_at, period_ends_at,
                        last_event_id, last_event_created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                incoming.invoiceId(), incoming.subscriptionId(), incoming.customerId(), companyId,
                incoming.status(), incoming.currency(), incoming.amountDueCents(), incoming.amountPaidCents(),
                incoming.hostedInvoiceUrl(), incoming.invoicePdfUrl(), timestamp(incoming.periodStartsAt()),
                timestamp(incoming.periodEndsAt()), incoming.eventId(), Timestamp.from(incoming.eventCreatedAt())
            );
            return;
        }
        var current = existing.getFirst();
        if (!isNewer(incoming.eventCreatedAt(), incoming.eventId(), current.lastEventCreatedAt(), current.lastEventId())) {
            return;
        }
        jdbcTemplate.update(
            """
                UPDATE billing_invoice_snapshots
                SET stripe_subscription_id = COALESCE(?, stripe_subscription_id),
                    stripe_customer_id = COALESCE(?, stripe_customer_id), company_id = COALESCE(company_id, ?),
                    status = ?, currency = ?, amount_due_cents = ?, amount_paid_cents = ?,
                    hosted_invoice_url = ?, invoice_pdf_url = ?, period_starts_at = ?, period_ends_at = ?,
                    last_event_id = ?, last_event_created_at = ?
                WHERE id = ?
                """,
            incoming.subscriptionId(), incoming.customerId(), companyId, incoming.status(), incoming.currency(),
            incoming.amountDueCents(), incoming.amountPaidCents(), incoming.hostedInvoiceUrl(), incoming.invoicePdfUrl(),
            timestamp(incoming.periodStartsAt()), timestamp(incoming.periodEndsAt()), incoming.eventId(),
            Timestamp.from(incoming.eventCreatedAt()), current.id()
        );
    }

    public ProjectionAssociation associationForPaymentCustomer(String stripeCustomerId) {
        var companyIds = jdbcTemplate.queryForList(
            """
                SELECT company_id FROM company_billing_customers WHERE stripe_customer_id = ?
                UNION
                SELECT company_id FROM company_billing_subscriptions
                WHERE stripe_customer_id = ? AND company_id IS NOT NULL
                """,
            Long.class, stripeCustomerId, stripeCustomerId
        );
        if (companyIds.size() > 1) {
            throw new StripeEventProcessingException(
                "AMBIGUOUS_PAYMENT_COMPANY", "The payment customer is associated with multiple companies."
            );
        }
        if (companyIds.isEmpty()) {
            return null;
        }
        var subscription = associationForCustomer(stripeCustomerId);
        var matchingSubscription = subscription != null && companyIds.getFirst().equals(subscription.companyId());
        return new ProjectionAssociation(
            matchingSubscription ? subscription.subscriptionInternalId() : 0,
            companyIds.getFirst(),
            matchingSubscription ? subscription.signupIntentId() : null,
            false
        );
    }

    @Transactional
    public int reconcileUnassociatedSubscriptions() {
        var candidates = jdbcTemplate.query(
            """
                SELECT s.id, i.id AS signup_intent_id
                FROM company_billing_subscriptions s
                JOIN billing_signup_intents i
                  ON i.stripe_customer_id = s.stripe_customer_id
                WHERE s.signup_intent_id IS NULL
                ORDER BY s.id
                LIMIT 100
                """,
            (rs, rowNum) -> new ReconciliationCandidate(rs.getLong("id"), rs.getLong("signup_intent_id"))
        );
        for (var candidate : candidates) {
            associate(candidate.subscriptionInternalId(), candidate.signupIntentId());
        }
        jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions s
                JOIN billing_signup_intents i ON i.id = s.signup_intent_id
                SET s.company_id = i.company_id
                WHERE s.company_id IS NULL AND i.company_id IS NOT NULL
                """
        );
        jdbcTemplate.update(
            """
                UPDATE billing_invoice_snapshots i
                JOIN company_billing_subscriptions s
                  ON s.stripe_subscription_id = i.stripe_subscription_id
                SET i.company_id = s.company_id
                WHERE i.company_id IS NULL AND s.company_id IS NOT NULL
                """
        );
        return candidates.size();
    }

    private void associate(long subscriptionInternalId, long signupIntentId) {
        var current = jdbcTemplate.query(
            "SELECT signup_intent_id, catalog_version_id FROM company_billing_subscriptions WHERE id = ? FOR UPDATE",
            (rs, rowNum) -> new AssociationState((Long) rs.getObject(1), (Long) rs.getObject(2)),
            subscriptionInternalId
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("Subscription projection is missing."));
        var effectiveIntentId = current.signupIntentId() == null ? signupIntentId : current.signupIntentId();
        var intent = intentDetails(effectiveIntentId);
        jdbcTemplate.update(
            "UPDATE company_billing_subscriptions SET signup_intent_id = COALESCE(signup_intent_id, ?), company_id = COALESCE(company_id, ?) WHERE id = ?",
            effectiveIntentId, intent.companyId(), subscriptionInternalId
        );
        if (current.catalogVersionId() != null) return;
        // A signup intent initializes the commercial agreement once. Renewals and seat purchases
        // own subsequent changes; later webhooks must not restore the original signup selection.
        jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions
                SET catalog_version_id = ?, offer_code = ?, billing_interval = ?, currency = ?,
                    included_seats = ?, extra_seats = ?,
                    subtotal_amount_cents = ?, discount_amount_cents = ?, promotion_code = ?
                WHERE id = ? AND catalog_version_id IS NULL
                """,
            intent.catalogVersionId(), intent.offerCode(), intent.billingInterval(), intent.currency(), intent.includedSeats(), intent.extraSeats(),
            intent.subtotalAmountCents(), intent.discountAmountCents(), intent.promotionCode(), subscriptionInternalId
        );
        copyIntentProducts(subscriptionInternalId, effectiveIntentId);
    }

    private void copyIntentProducts(Long subscriptionInternalId, Long signupIntentId) {
        if (subscriptionInternalId == null || signupIntentId == null) {
            return;
        }
        jdbcTemplate.update(
            """
                INSERT IGNORE INTO company_billing_subscription_products (
                    subscription_id, catalog_product_id, source
                )
                SELECT ?, catalog_product_id, 'SIGNUP_INTENT'
                FROM billing_signup_intent_products
                WHERE signup_intent_id = ?
                """,
            subscriptionInternalId,
            signupIntentId
        );
    }

    private IntentDetails intentDetails(long signupIntentId) {
        var rows = jdbcTemplate.query(
            """
                SELECT company_id, catalog_version_id, offer_code, billing_interval, currency,
                       included_seats, requested_extra_seats, subtotal_amount_cents,
                       discount_amount_cents, promotion_code
                FROM billing_signup_intents
                WHERE id = ?
                """,
            (rs, rowNum) -> new IntentDetails(
                (Long) rs.getObject("company_id"), rs.getLong("catalog_version_id"),
                rs.getString("offer_code"), rs.getString("billing_interval"), rs.getString("currency"),
                rs.getInt("included_seats"), rs.getInt("requested_extra_seats"),
                (Long) rs.getObject("subtotal_amount_cents"), rs.getLong("discount_amount_cents"),
                rs.getString("promotion_code")
            ),
            signupIntentId
        );
        if (rows.isEmpty()) {
            throw new StripeEventProcessingException("SIGNUP_INTENT_MISSING", "Signup intent is not available yet.");
        }
        return rows.getFirst();
    }

    private boolean isNewer(Instant incomingAt, String incomingId, Instant currentAt, String currentId) {
        var comparison = incomingAt.compareTo(currentAt);
        return comparison > 0 || (comparison == 0 && incomingId.compareTo(currentId) > 0);
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    public record SubscriptionSnapshot(
        String eventId,
        Instant eventCreatedAt,
        String subscriptionId,
        String customerId,
        String status,
        String collectionMethod,
        String currency,
        boolean cancelAtPeriodEnd,
        Instant trialStartsAt,
        Instant trialEndsAt,
        Instant currentPeriodStartsAt,
        Instant currentPeriodEndsAt,
        Instant canceledAt,
        String latestInvoiceId,
        String lastPaymentStatus
    ) {
    }

    public record InvoiceSnapshot(
        String eventId,
        Instant eventCreatedAt,
        String invoiceId,
        String subscriptionId,
        String customerId,
        String status,
        String currency,
        Long amountDueCents,
        Long amountPaidCents,
        String hostedInvoiceUrl,
        String invoicePdfUrl,
        Instant periodStartsAt,
        Instant periodEndsAt
    ) {
    }

    public record ProjectionAssociation(long subscriptionInternalId, Long companyId, Long signupIntentId, boolean applied) {
    }

    private record ExistingSubscription(long id, Long companyId, Long signupIntentId, Long catalogVersionId,
        String lastEventId, Instant lastEventCreatedAt) {
    }

    private record AssociationState(Long signupIntentId, Long catalogVersionId) { }

    private record ExistingInvoice(long id, String lastEventId, Instant lastEventCreatedAt) {
    }

    private record IntentDetails(
        Long companyId,
        long catalogVersionId,
        String offerCode,
        String billingInterval,
        String currency,
        int includedSeats,
        int extraSeats,
        Long subtotalAmountCents,
        long discountAmountCents,
        String promotionCode
    ) {
    }

    private record ReconciliationCandidate(long subscriptionInternalId, long signupIntentId) {
    }
}
