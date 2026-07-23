package com.indice.erp.auth;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SignupBillingSubscriptionWriter {

    private final JdbcTemplate jdbcTemplate;

    SignupBillingSubscriptionWriter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void store(long companyId, SignupBillingInfo billing) {
        jdbcTemplate.update(
            """
                INSERT INTO company_billing_subscriptions (
                    company_id, stripe_customer_id, stripe_subscription_id, status,
                    offer_code, billing_interval, currency, included_seats, extra_seats,
                    cancel_at_period_end, trial_starts_at, trial_ends_at,
                    current_period_starts_at, current_period_ends_at, canceled_at,
                    last_event_id, last_event_created_at
                ) VALUES (?, ?, ?, ?, ?, 'MONTH', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    trial_starts_at = VALUES(trial_starts_at),
                    trial_ends_at = VALUES(trial_ends_at),
                    current_period_starts_at = VALUES(current_period_starts_at),
                    current_period_ends_at = VALUES(current_period_ends_at),
                    cancel_at_period_end = VALUES(cancel_at_period_end),
                    canceled_at = VALUES(canceled_at),
                    last_event_id = VALUES(last_event_id),
                    last_event_created_at = VALUES(last_event_created_at)
                """,
            companyId,
            billing.stripeCustomerId(),
            billing.stripeSubscriptionId(),
            billing.stripeSubscriptionStatus(),
            offerCode(billing.plan()),
            currency(billing.plan().currency()),
            billing.plan().includedCollaborators(),
            billing.plan().extraCollaborators(),
            billing.cancelAtPeriodEnd() ? 1 : 0,
            timestamp(billing.trialStart()),
            timestamp(billing.trialEnd()),
            timestamp(billing.currentPeriodStart()),
            timestamp(billing.currentPeriodEnd()),
            timestamp(billing.canceledAt()),
            "internal_signup:" + billing.stripeSubscriptionId(),
            timestamp(eventTime(billing))
        );
        jdbcTemplate.update(
            """
                INSERT INTO company_seat_states (company_id, included_seats, purchased_extra_seats)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    included_seats = VALUES(included_seats),
                    purchased_extra_seats = VALUES(purchased_extra_seats),
                    version = version + 1
                """,
            companyId,
            Math.max(5, billing.plan().includedCollaborators()),
            Math.max(0, billing.plan().extraCollaborators())
        );
    }

    private String offerCode(SignupPlanSelection plan) {
        if ("all-modules".equals(plan.planId())) {
            return "basic_all";
        }
        return switch (plan.moduleCount()) {
            case 1 -> "basic_1";
            case 2 -> "basic_2";
            case 3 -> "basic_3";
            default -> "basic_all";
        };
    }

    private String currency(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        return normalized.isBlank() ? "USD" : normalized;
    }

    private Instant eventTime(SignupBillingInfo billing) {
        if (billing.currentPeriodStart() != null) {
            return billing.currentPeriodStart();
        }
        if (billing.trialStart() != null) {
            return billing.trialStart();
        }
        return Instant.now();
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
