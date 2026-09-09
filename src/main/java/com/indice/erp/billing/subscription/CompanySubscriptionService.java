package com.indice.erp.billing.subscription;

import com.indice.erp.billing.lifecycle.CommercialLifecycleProperties;
import com.indice.erp.billing.collection.PaymentCollectionAccessService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CompanySubscriptionService implements CompanySubscriptionStatusProvider {

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;
    private final CommercialLifecycleProperties lifecycleProperties;
    private final PaymentCollectionAccessService collection;

    public CompanySubscriptionService(
        JdbcTemplate jdbcTemplate,
        Clock clock,
        CommercialLifecycleProperties lifecycleProperties,
        PaymentCollectionAccessService collection
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
        this.lifecycleProperties = lifecycleProperties;
        this.collection = collection;
    }

    @Override
    public CompanySubscriptionStatus currentStatus(long companyId) {
        var decision = collection.access(companyId);
        if (decision == PaymentCollectionAccessService.Access.PAYMENT_ONLY) {
            return new CompanySubscriptionStatus("payment_required", "", null, false, PaymentCollectionAccessService.OVERDUE);
        }
        if (decision == PaymentCollectionAccessService.Access.GRACE) {
            return new CompanySubscriptionStatus("payment_requested", "", null, true, "PAYMENT_REQUEST_GRACE");
        }
        var rows = jdbcTemplate.query(
            """
                SELECT
                    subscription.status AS subscription_status,
                    COALESCE(subscription.offer_code, '') AS plan_id,
                    subscription.trial_ends_at,
                    commercial.state AS lifecycle_state,
                    commercial.access_mode,
                    commercial.reason_code,
                    commercial.grace_ends_at
                FROM company_billing_subscriptions subscription
                LEFT JOIN company_commercial_states commercial
                  ON commercial.company_id = subscription.company_id
                WHERE subscription.company_id = ?
                ORDER BY subscription.last_event_created_at DESC, subscription.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> resolve(
                text(rs.getString("subscription_status")),
                text(rs.getString("plan_id")),
                instant(rs.getTimestamp("trial_ends_at")),
                text(rs.getString("lifecycle_state")),
                text(rs.getString("access_mode")),
                text(rs.getString("reason_code")),
                instant(rs.getTimestamp("grace_ends_at"))
            ),
            companyId
        );
        if (!rows.isEmpty()) {
            return rows.getFirst();
        }

        var lifecycleRows = jdbcTemplate.query(
            """
                SELECT state, access_mode, subscription_status, trial_ends_at, reason_code, grace_ends_at
                FROM company_commercial_states
                WHERE company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> resolve(
                text(rs.getString("subscription_status")),
                "",
                instant(rs.getTimestamp("trial_ends_at")),
                text(rs.getString("state")),
                text(rs.getString("access_mode")),
                text(rs.getString("reason_code")),
                instant(rs.getTimestamp("grace_ends_at"))
            ),
            companyId
        );
        return lifecycleRows.isEmpty() ? CompanySubscriptionStatus.activeLegacy() : lifecycleRows.getFirst();
    }

    public int expireTrials() {
        var now = clock.instant();
        var retentionUntil = now.plus(lifecycleProperties.getRetentionDays(), ChronoUnit.DAYS);
        return jdbcTemplate.update(
            """
                UPDATE company_commercial_states
                SET state = 'READ_ONLY',
                    access_mode = 'READ_ONLY',
                    reason_code = 'trial_expired',
                    read_only_started_at = COALESCE(read_only_started_at, ?),
                    read_only_ends_at = COALESCE(read_only_ends_at, ?),
                    retention_until = COALESCE(retention_until, ?),
                    updated_at = CURRENT_TIMESTAMP(6),
                    version = version + 1
                WHERE state = 'TRIAL'
                  AND trial_ends_at IS NOT NULL
                  AND trial_ends_at < CURRENT_TIMESTAMP(6)
                  AND NOT EXISTS (SELECT 1 FROM company_payment_requests request
                    WHERE request.company_id = company_commercial_states.company_id AND request.status = 'OPEN')
                """,
            Timestamp.from(now), Timestamp.from(retentionUntil), Timestamp.from(retentionUntil)
        );
    }

    private CompanySubscriptionStatus resolve(
        String status,
        String planId,
        Instant trialEndAt,
        String lifecycleState,
        String accessMode,
        String reasonCode,
        Instant graceEndsAt
    ) {
        var normalizedStatus = status.isBlank() ? "missing_subscription" : status.toLowerCase();
        var normalizedState = lifecycleState.toUpperCase(Locale.ROOT);
        var normalizedAccessMode = accessMode.toUpperCase(Locale.ROOT);
        if ("BILLING_ONLY".equals(normalizedAccessMode)
            || "SUSPENDED".equals(normalizedState)
            || "RETENTION".equals(normalizedState)
            || "PURGE_PENDING".equals(normalizedState)) {
            return new CompanySubscriptionStatus(normalizedStatus, planId, trialEndAt, false,
                fallback(reasonCode, normalizedState.isBlank() ? normalizedStatus : normalizedState.toLowerCase(Locale.ROOT)));
        }
        if ("active".equals(normalizedStatus)) {
            return new CompanySubscriptionStatus(normalizedStatus, planId, trialEndAt, true, "");
        }
        if ("trialing".equals(normalizedStatus)) {
            var expired = trialEndAt == null || trialEndAt.isBefore(clock.instant());
            return new CompanySubscriptionStatus(normalizedStatus, planId, trialEndAt, !expired, expired ? "trial_expired" : "");
        }
        if ("past_due".equals(normalizedStatus)
            && "payment_grace".equals(reasonCode)
            && graceEndsAt != null
            && graceEndsAt.isAfter(clock.instant())) {
            return new CompanySubscriptionStatus(normalizedStatus, planId, trialEndAt, true, "payment_grace");
        }
        if ("TRIAL".equals(normalizedState) || "ACTIVE".equals(normalizedState) || "GRACE".equals(normalizedState)
            || "READ_ONLY".equals(normalizedState)) {
            return new CompanySubscriptionStatus(normalizedStatus, planId, trialEndAt, true, fallback(reasonCode, ""));
        }
        if ("missing_subscription".equals(normalizedStatus) && normalizedState.isBlank()) {
            return CompanySubscriptionStatus.activeLegacy();
        }
        return new CompanySubscriptionStatus(normalizedStatus, planId, trialEndAt, false, fallback(reasonCode, normalizedStatus));
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
