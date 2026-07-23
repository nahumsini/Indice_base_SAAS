package com.indice.erp.billing.stripe;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class CompanyBillingSubscriptionRepository {

    private final JdbcTemplate jdbcTemplate;

    CompanyBillingSubscriptionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    int updateStripeState(String subscriptionId, String status, Instant trialStart, Instant trialEnd,
            Instant currentPeriodStart, Instant currentPeriodEnd, boolean cancelAtPeriodEnd, Instant canceledAt) {
        var lockReason = lockReason(status);
        return jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions
                SET stripe_subscription_status = ?,
                    trial_start_at = COALESCE(?, trial_start_at),
                    trial_end_at = COALESCE(?, trial_end_at),
                    current_period_start_at = ?,
                    current_period_end_at = ?,
                    cancel_at_period_end = ?,
                    canceled_at = ?,
                    cancellation_effective_at = ?,
                    access_locked_at = CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(access_locked_at, UTC_TIMESTAMP()) END,
                    lock_reason = ?
                WHERE stripe_subscription_id = ?
                """,
            status,
            timestamp(trialStart),
            timestamp(trialEnd),
            timestamp(currentPeriodStart),
            timestamp(currentPeriodEnd),
            cancelAtPeriodEnd ? 1 : 0,
            timestamp(canceledAt),
            cancelAtPeriodEnd ? timestamp(currentPeriodEnd) : null,
            lockReason,
            lockReason,
            subscriptionId
        );
    }

    int markPaymentSucceeded(String subscriptionId, String invoiceId) {
        return jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions
                SET stripe_subscription_status = 'active',
                    access_locked_at = NULL,
                    lock_reason = NULL,
                    payment_failed_at = NULL,
                    payment_grace_until = NULL,
                    payment_failure_reason = NULL,
                    latest_invoice_id = ?
                WHERE stripe_subscription_id = ?
                """,
            invoiceId,
            subscriptionId
        );
    }

    int markPaymentFailed(String subscriptionId, String invoiceId, String reason, Instant paymentGraceUntil) {
        var hasGrace = paymentGraceUntil != null;
        return jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions
                SET stripe_subscription_status = 'past_due',
                    access_locked_at = CASE WHEN ? THEN access_locked_at ELSE COALESCE(access_locked_at, UTC_TIMESTAMP()) END,
                    lock_reason = CASE WHEN ? THEN 'payment_grace' ELSE 'payment_failed' END,
                    payment_failed_at = UTC_TIMESTAMP(),
                    payment_grace_until = ?,
                    payment_failure_reason = ?,
                    latest_invoice_id = ?
                WHERE stripe_subscription_id = ?
                """,
            hasGrace,
            hasGrace,
            timestamp(paymentGraceUntil),
            trim(reason, 160),
            invoiceId,
            subscriptionId
        );
    }

    boolean exists(String subscriptionId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM company_billing_subscriptions WHERE stripe_subscription_id = ?",
            Long.class,
            subscriptionId
        );
        return count != null && count > 0;
    }

    Optional<CompanyBillingRecipient> billingRecipient(String subscriptionId) {
        return jdbcTemplate.query(
            """
                SELECT subscription.company_id, user_company.id AS user_company_id
                FROM company_billing_subscriptions subscription
                JOIN user_companies user_company
                  ON user_company.company_id = subscription.company_id
                WHERE subscription.stripe_subscription_id = ?
                  AND LOWER(COALESCE(user_company.status, 'active')) IN ('active', 'activo')
                ORDER BY CASE LOWER(COALESCE(user_company.role, 'user'))
                    WHEN 'root' THEN 1
                    WHEN 'superadmin' THEN 2
                    WHEN 'owner' THEN 3
                    WHEN 'dueno' THEN 4
                    WHEN 'admin' THEN 5
                    ELSE 99
                END, user_company.id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> new CompanyBillingRecipient(
                rs.getLong("company_id"),
                rs.getLong("user_company_id")
            ),
            subscriptionId
        ).stream().findFirst();
    }

    private String lockReason(String status) {
        return switch (status == null ? "" : status.toLowerCase()) {
            case "active", "trialing" -> null;
            case "past_due", "unpaid" -> "payment_failed";
            case "canceled", "incomplete_expired" -> "subscription_canceled";
            case "incomplete" -> "payment_incomplete";
            case "paused" -> "subscription_paused";
            default -> "subscription_inactive";
        };
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private String trim(String value, int max) {
        var cleaned = value == null ? "" : value.trim();
        return cleaned.length() > max ? cleaned.substring(0, max) : cleaned;
    }
}
