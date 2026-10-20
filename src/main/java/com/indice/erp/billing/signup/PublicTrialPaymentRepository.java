package com.indice.erp.billing.signup;

import com.indice.erp.billing.catalog.CommercialOfferSelection;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PublicTrialPaymentRepository {
    private final JdbcTemplate jdbc;
    public PublicTrialPaymentRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Trial trial(long companyId, boolean lock) {
        return jdbc.query("SELECT country_code, trial_ends_at, status FROM billing_trial_entries WHERE company_id = ?"
            + (lock ? " FOR UPDATE" : ""), (rs, n) -> new Trial(rs.getString(1), rs.getTimestamp(2).toInstant(),
                "CONVERTED".equals(rs.getString(3))), companyId).stream().findFirst().orElse(null);
    }

    public void freeze(long companyId, long actor, long intentId, CommercialOfferSelection selection,
        PublicTrialPaymentContracts.Quote quote, Instant acceptedAt) {
        var trial = trial(companyId, true);
        if (trial == null || trial.converted() || !trial.endsAt().equals(quote.originalTrialEndsAt())) {
            throw new BillingSignupConflictException("The trial changed; review the payment terms again.");
        }
        var prior = consent(intentId);
        if (prior != null) {
            if (prior.companyId() != companyId || !prior.quoteHash().equals(quote.quoteHash())) {
                throw new BillingSignupConflictException("Payment terms changed; use a new request.");
            }
            return;
        }
        var expectedTiming = trial.endsAt().isAfter(acceptedAt) ? "AFTER_TRIAL" : "IMMEDIATE";
        if (!expectedTiming.equals(quote.chargeTiming())) throw new BillingSignupConflictException("Review the first-payment timing again.");
        var price = jdbc.queryForMap("SELECT stripe_mode, stripe_account_id FROM billing_catalog_prices WHERE catalog_product_id = ? AND currency = ? AND billing_interval = ? AND external_price_id = ?",
            selection.products().getFirst().id(), selection.currency(), selection.billingInterval().name(), selection.baseExternalPriceId());
        jdbc.update("""
            INSERT INTO billing_trial_payment_consents (company_id, actor_user_id, signup_intent_id, quote_hash,
                terms_version, catalog_version_id, catalog_product_id, currency, billing_interval,
                amount_before_tax_cents, included_seats, original_trial_ends_at, first_charge_at, charge_timing,
                external_price_id, stripe_mode, stripe_account_id, accepted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, companyId, actor, intentId, quote.quoteHash(), quote.termsVersion(), selection.catalogVersionId(),
            selection.products().getFirst().id(), selection.currency(), selection.billingInterval().name(),
            selection.estimatedAmountCents(), selection.includedSeats(), Timestamp.from(trial.endsAt()),
            Timestamp.from("IMMEDIATE".equals(quote.chargeTiming()) ? acceptedAt : providerDeadline(trial.endsAt())), quote.chargeTiming(), selection.baseExternalPriceId(),
            price.get("stripe_mode"), price.get("stripe_account_id"), Timestamp.from(acceptedAt));
    }

    public Consent consent(long intentId) {
        return jdbc.query("""
            SELECT consent.company_id, consent.signup_intent_id, consent.quote_hash, consent.currency,
                   consent.amount_before_tax_cents, consent.original_trial_ends_at, consent.first_charge_at,
                   consent.charge_timing, consent.external_price_id, consent.stripe_mode, consent.stripe_account_id,
                   intent.stripe_customer_id, intent.stripe_subscription_id, intent.stripe_checkout_session_id,
                   consent.setup_verified_at, consent.paid_invoice_id, consent.accepted_at
            FROM billing_trial_payment_consents consent
            JOIN billing_signup_intents intent ON intent.id = consent.signup_intent_id AND intent.company_id = consent.company_id
            WHERE consent.signup_intent_id = ?
            """, (rs, n) -> new Consent(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getLong(5),
                rs.getTimestamp(6).toInstant(), rs.getTimestamp(7).toInstant(), rs.getString(8), rs.getString(9),
                rs.getString(10), rs.getString(11), rs.getString(12), rs.getString(13), rs.getString(14),
                rs.getTimestamp(15) == null ? null : rs.getTimestamp(15).toInstant(), rs.getString(16), rs.getTimestamp(17).toInstant()), intentId)
            .stream().findFirst().orElse(null);
    }

    public Consent bySubscription(String subscriptionId) {
        if (subscriptionId == null || subscriptionId.isBlank()) return null;
        var ids = jdbc.query("SELECT consent.signup_intent_id FROM billing_trial_payment_consents consent JOIN billing_signup_intents intent ON intent.id = consent.signup_intent_id WHERE intent.stripe_subscription_id = ?",
            (rs, n) -> rs.getLong(1), subscriptionId);
        return ids.isEmpty() ? null : consent(ids.getFirst());
    }

    public String customer(long companyId) {
        return jdbc.query("SELECT stripe_customer_id FROM company_billing_customers WHERE company_id = ? AND status = 'ACTIVE'",
            (rs, n) -> rs.getString(1), companyId).stream().findFirst().orElse(null);
    }

    @org.springframework.transaction.annotation.Transactional
    public void saveCustomer(long companyId, long intentId, String customerId) {
        trial(companyId, true);
        var existing = customer(companyId);
        if (existing != null && !existing.equals(customerId)) throw new BillingSignupConflictException("Customer binding needs reconciliation.");
        if (existing != null) return;
        jdbc.update("""
            INSERT INTO company_billing_customers (company_id, stripe_customer_id, source_signup_intent_id, status)
            VALUES (?, ?, ?, 'ACTIVE')
            """, companyId, customerId, intentId);
    }

    public void verifiedSetup(long intentId, Instant at) {
        jdbc.update("UPDATE billing_trial_payment_consents SET setup_verified_at = COALESCE(setup_verified_at, ?) WHERE signup_intent_id = ?",
            Timestamp.from(at), intentId);
    }

    @org.springframework.transaction.annotation.Transactional
    public void requireSubscriptionAttempt(long intentId, Instant now) {
        var c = consent(intentId);
        trial(c.companyId(), true);
        var started = jdbc.queryForObject("SELECT subscription_requested_at FROM billing_trial_payment_consents WHERE signup_intent_id = ? FOR UPDATE",
            Timestamp.class, intentId);
        if (started != null && !now.isBefore(started.toInstant().plus(java.time.Duration.ofHours(23)))) {
            throw new com.indice.erp.billing.stripe.StripeEventProcessingException("TRIAL_SUBSCRIPTION_RECONCILIATION_REQUIRED",
                "The uncertain provider request requires reconciliation before another financial operation.");
        }
        if (started == null && "AFTER_TRIAL".equals(c.chargeTiming()) && !c.firstChargeAt().isAfter(now)) {
            // No create was sent: keep evidence and allow a fresh immediate-payment review.
            jdbc.update("UPDATE billing_signup_intents SET status = 'FAILED' WHERE id = ? AND company_id = ? AND stripe_subscription_id IS NULL",
                intentId, c.companyId());
            return;
        }
        if (started == null) jdbc.update("UPDATE billing_trial_payment_consents SET subscription_requested_at = ? WHERE signup_intent_id = ?",
            Timestamp.from(now), intentId);
    }

    public boolean subscriptionAttemptRecorded(long intentId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT subscription_requested_at IS NOT NULL FROM billing_trial_payment_consents WHERE signup_intent_id = ?",
            Boolean.class, intentId));
    }

    /** Called inside the signed webhook's complete native financial transaction. */
    public boolean convert(Consent consent, String invoiceId, Instant paidAt) {
        trial(consent.companyId(), true);
        var changed = jdbc.update("UPDATE billing_trial_payment_consents SET paid_invoice_id = ?, paid_at = ? WHERE company_id = ? AND signup_intent_id = ? AND paid_invoice_id IS NULL",
            invoiceId, Timestamp.from(paidAt), consent.companyId(), consent.intentId());
        if (changed != 1) return false;
        if (jdbc.update("UPDATE billing_trial_entries SET status = 'CONVERTED' WHERE company_id = ? AND status = 'ACTIVE'",
            consent.companyId()) != 1) throw new IllegalStateException("The paid trial transition is not available.");
        return true;
    }

    // Stripe accepts seconds: round up at most one second, never charge before the original promise.
    public static Instant providerDeadline(Instant original) {
        return original.getNano() == 0 ? original : original.truncatedTo(java.time.temporal.ChronoUnit.SECONDS).plusSeconds(1);
    }
    public record Trial(String countryCode, Instant endsAt, boolean converted) { }
    public record Consent(long companyId, long intentId, String quoteHash, String currency, long amountCents,
        Instant trialEndsAt, Instant firstChargeAt, String chargeTiming, String priceId, String stripeMode,
        String accountId, String customerId, String subscriptionId, String sessionId, Instant verifiedAt,
        String paidInvoiceId, Instant acceptedAt) { }
}
