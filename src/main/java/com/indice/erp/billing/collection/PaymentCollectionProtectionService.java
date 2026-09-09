package com.indice.erp.billing.collection;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Current promised access, independently of the collection window and without provider calls. */
@Service
public class PaymentCollectionProtectionService {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public PaymentCollectionProtectionService(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public Protection protection(long companyId) {
        return load(companyId, true);
    }

    /** Existing collection debt is not waived by a different invoice being paid later. */
    public Protection collectionProtection(long companyId) {
        return load(companyId, false);
    }

    /** Called before a product grant or trial-extension provider operation, in its transaction. */
    public void requireGrantAllowed(long companyId) {
        lockCompany(companyId);
        var pending = jdbc.query("""
            SELECT intent.id FROM company_payment_requests request
            LEFT JOIN payment_collection_payment_states payment ON payment.request_id = request.id AND payment.company_id = request.company_id
            JOIN billing_signup_intents intent ON intent.company_id = request.company_id
                AND intent.intent_kind = 'EXISTING_COMPANY_ACTIVATION'
            WHERE request.company_id = ? AND request.status = 'OPEN' AND request.kind = 'ACTIVATION'
              AND (intent.status IN ('PENDING', 'CUSTOMER_CREATED', 'CHECKOUT_CREATED')
                   OR (intent.id = payment.signup_intent_id AND intent.status = 'CHECKOUT_COMPLETED'))
            FOR UPDATE
            """, (rs, row) -> rs.getLong(1), companyId);
        if (!pending.isEmpty()) {
            throw new IllegalStateException("Confirma o resuelve el pago de activación pendiente antes de conceder más prueba o acceso gratuito.");
        }
    }

    public boolean trialExtensionPending(long companyId) {
        return !pendingTrialExtensions(companyId, false).isEmpty();
    }

    /** A failed remote update may already have reached Stripe; retain its reservation for retry. */
    public void requireCollectionActivationAllowed(long companyId) {
        lockCompany(companyId);
        if (!pendingTrialExtensions(companyId, true).isEmpty()) {
            throw new IllegalStateException("Resuelve la extensión de prueba en proceso antes de iniciar el pago de activación.");
        }
    }

    private java.util.List<Long> pendingTrialExtensions(long companyId, boolean lock) {
        return jdbc.query("SELECT id FROM platform_trial_extensions WHERE company_id = ? AND status IN ('PREPARED', 'FAILED')"
            + (lock ? " FOR UPDATE" : ""), (rs, row) -> rs.getLong(1), companyId);
    }

    private void lockCompany(long companyId) {
        if (!org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Payment and trial admission requires the company transaction.");
        }
        jdbc.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, companyId);
    }

    private Protection load(long companyId, boolean includePaidPeriods) {
        var now = Timestamp.from(clock.instant());
        var params = new java.util.ArrayList<Object>(java.util.List.of(companyId, now, now,
            companyId, now, now, companyId, now));
        var sql = """
            SELECT MAX(protected_until) AS protected_until, COALESCE(MAX(indefinite), 0) AS indefinite
            FROM (
                SELECT ends_at AS protected_until, (ends_at IS NULL) AS indefinite
                FROM company_benefit_grants
                WHERE company_id = ? AND status = 'ACTIVE' AND benefit_type = 'PRODUCT'
                  AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)
                UNION ALL
                SELECT ends_at, 0 FROM company_trial_product_grants
                WHERE company_id = ? AND status = 'ACTIVE' AND starts_at <= ? AND ends_at > ?
                UNION ALL
                SELECT trial_ends_at, 0 FROM company_billing_subscriptions
                WHERE company_id = ? AND LOWER(status) = 'trialing' AND trial_ends_at > ?
            """;
        if (includePaidPeriods) {
            sql += """
                UNION ALL
                SELECT period_ends_at, 0 FROM billing_invoice_snapshots
                WHERE company_id = ? AND LOWER(status) = 'paid' AND amount_paid_cents > 0 AND period_ends_at > ?
                UNION ALL
                SELECT current_period_ends_at, 0 FROM company_billing_subscriptions
                WHERE company_id = ? AND LOWER(status) = 'active' AND current_period_ends_at > ?
                  AND (LEFT(stripe_subscription_id, 9) = 'internal_' OR LEFT(stripe_subscription_id, 7) = 'legacy_')
                """;
            params.addAll(java.util.List.of(companyId, now, companyId, now));
        }
        return jdbc.queryForObject(sql + ") promises", (rs, row) -> new Protection(
            rs.getTimestamp(1) == null ? null : rs.getTimestamp(1).toInstant(), rs.getBoolean(2)), params.toArray());
    }

    public record Protection(Instant protectedUntil, boolean indefiniteBenefit) {}
}
