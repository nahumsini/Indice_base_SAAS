package com.indice.erp.billing.lifecycle;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommercialLifecycleService {

    private final JdbcTemplate jdbc;
    private final CommercialLifecycleProperties properties;
    private final Clock clock;

    public CommercialLifecycleService(
        JdbcTemplate jdbc,
        CommercialLifecycleProperties properties,
        Clock clock
    ) {
        this.jdbc = jdbc;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public TransitionResult initializeTrial(long companyId, Instant trialEndsAt) {
        var now = clock.instant();
        return apply(companyId, "PROVISIONING", "provisioning:" + companyId, now,
            "trialing", null, trialEndsAt, "TRIAL_STARTED");
    }

    @Transactional
    public TransitionResult applySubscriptionEvent(
        long companyId,
        String eventId,
        Instant eventCreatedAt,
        String subscriptionStatus,
        Instant trialEndsAt
    ) {
        return apply(companyId, "STRIPE_SUBSCRIPTION", eventId, eventCreatedAt,
            subscriptionStatus, null, trialEndsAt, "SUBSCRIPTION_" + normalized(subscriptionStatus));
    }

    @Transactional
    public TransitionResult applyInvoiceEvent(
        long companyId,
        String eventId,
        Instant eventCreatedAt,
        String eventType,
        String paymentStatus
    ) {
        var normalizedType = normalized(eventType);
        var effectivePayment = normalizedType.contains("PAYMENT_FAILED")
            || normalizedType.contains("PAYMENT_SUCCEEDED")
            || normalizedType.equals("INVOICE_PAID")
                ? normalizedType
                : paymentStatus;
        return apply(companyId, "STRIPE_INVOICE", eventId, eventCreatedAt,
            null, effectivePayment, null, normalizedType);
    }

    @Transactional(readOnly = true)
    public Optional<CommercialLifecycleSnapshot> snapshot(long companyId) {
        return rows(companyId, false).stream().findFirst().map(this::snapshot);
    }

    @Transactional
    public int advanceDueStates() {
        var now = databaseInstant(clock.instant());
        var companyIds = jdbc.query(
            """
                SELECT company_id
                FROM company_commercial_states
                WHERE (state = 'GRACE' AND (grace_ends_at IS NULL OR grace_ends_at <= ?))
                   OR (state = 'READ_ONLY' AND (read_only_ends_at IS NULL OR read_only_ends_at <= ?))
                   OR (state IN ('SUSPENDED', 'RETENTION') AND retention_until <= ?)
                ORDER BY updated_at, company_id
                LIMIT ?
                """,
            (rs, rowNum) -> rs.getLong(1),
            Timestamp.from(now), Timestamp.from(now), Timestamp.from(now), properties.getSchedulerBatchSize()
        );
        var changed = 0;
        for (var companyId : companyIds) {
            var state = rows(companyId, true).stream().findFirst().orElse(null);
            if (state == null) continue;
            var next = switch (state.state()) {
                case GRACE -> state.withState(
                    CommercialLifecycleState.READ_ONLY, "READ_ONLY", "GRACE_EXPIRED",
                    state.graceStartedAt(), state.graceEndsAt(), now,
                    now.plus(properties.getReadOnlyDays(), ChronoUnit.DAYS), null, null, null
                );
                case READ_ONLY -> state.withState(
                    CommercialLifecycleState.SUSPENDED, "BILLING_ONLY", "READ_ONLY_EXPIRED",
                    state.graceStartedAt(), state.graceEndsAt(), state.readOnlyStartedAt(),
                    state.readOnlyEndsAt(), now,
                    now.plus(properties.getRetentionDays(), ChronoUnit.DAYS), null
                );
                case SUSPENDED, RETENTION -> state.withState(
                    CommercialLifecycleState.PURGE_PENDING, "BILLING_ONLY", "RETENTION_EXPIRED",
                    state.graceStartedAt(), state.graceEndsAt(), state.readOnlyStartedAt(),
                    state.readOnlyEndsAt(), state.suspendedAt(), state.retentionUntil(), now
                );
                default -> null;
            };
            if (next != null) {
                persist(state, next, "SCHEDULER", null, now);
                changed++;
            }
        }
        return changed;
    }

    private TransitionResult apply(
        long companyId,
        String sourceType,
        String eventId,
        Instant eventCreatedAt,
        String subscriptionStatus,
        String paymentStatus,
        Instant trialEndsAt,
        String reason
    ) {
        if (!enrolled(companyId)) return new TransitionResult(false, false, null);
        ensureState(companyId);
        var current = rows(companyId, true).getFirst();
        var occurredAt = databaseInstant(eventCreatedAt == null ? clock.instant() : eventCreatedAt);
        var persistedTrialEndsAt = databaseInstant(trialEndsAt);
        if (!isNewer(occurredAt, eventId, current.lastEventCreatedAt(), current.lastEventId())) {
            return new TransitionResult(true, false, snapshot(current));
        }

        var next = resolve(current, subscriptionStatus, paymentStatus, persistedTrialEndsAt, occurredAt, reason);
        next = next.withSource(eventId, occurredAt,
            subscriptionStatus == null ? current.subscriptionStatus() : normalizedValue(subscriptionStatus),
            paymentStatus == null ? current.paymentStatus() : normalizedValue(paymentStatus));
        persist(current, next, sourceType, eventId, occurredAt);
        return new TransitionResult(true, current.state() != next.state(), snapshot(next));
    }

    private StateRow resolve(
        StateRow current,
        String subscriptionStatus,
        String paymentStatus,
        Instant trialEndsAt,
        Instant occurredAt,
        String reason
    ) {
        var subscription = normalized(subscriptionStatus);
        var payment = normalized(paymentStatus);
        if (subscription.equals("TRIALING")) {
            return current.withState(CommercialLifecycleState.TRIAL, "FULL", reason,
                null, null, null, null, null, null, null).withTrialEnd(trialEndsAt);
        }
        if (subscription.equals("ACTIVE") || subscription.equals("RESUMED")) {
            return active(current, "SUBSCRIPTION_ACTIVE", trialEndsAt);
        }
        if (payment.contains("PAID") || payment.contains("PAYMENT_SUCCEEDED")) {
            if ((current.state() == CommercialLifecycleState.RETENTION
                || current.state() == CommercialLifecycleState.PURGE_PENDING)
                && "canceled".equalsIgnoreCase(current.subscriptionStatus())) {
                return current.withReason("PAYMENT_RECEIVED_AFTER_CANCELLATION");
            }
            return active(current, "PAYMENT_RECOVERED", trialEndsAt);
        }
        if (subscription.equals("CANCELED") || subscription.equals("DELETED")) {
            return current.withState(CommercialLifecycleState.RETENTION, "BILLING_ONLY", "SUBSCRIPTION_CANCELED",
                current.graceStartedAt(), current.graceEndsAt(), current.readOnlyStartedAt(),
                current.readOnlyEndsAt(), occurredAt,
                occurredAt.plus(properties.getRetentionDays(), ChronoUnit.DAYS), null);
        }
        if (subscription.equals("PAUSED")) {
            return current.withState(CommercialLifecycleState.SUSPENDED, "BILLING_ONLY", "SUBSCRIPTION_PAUSED",
                current.graceStartedAt(), current.graceEndsAt(), current.readOnlyStartedAt(),
                current.readOnlyEndsAt(), occurredAt,
                occurredAt.plus(properties.getRetentionDays(), ChronoUnit.DAYS), null);
        }
        if (subscription.equals("PAST_DUE") || subscription.equals("UNPAID")
            || subscription.equals("INCOMPLETE_EXPIRED") || payment.contains("PAYMENT_FAILED")) {
            var graceStarted = current.state() == CommercialLifecycleState.GRACE && current.graceStartedAt() != null
                ? current.graceStartedAt() : occurredAt;
            var graceEnds = current.state() == CommercialLifecycleState.GRACE && current.graceEndsAt() != null
                ? current.graceEndsAt() : graceStarted.plus(properties.getGraceDays(), ChronoUnit.DAYS);
            return current.withState(CommercialLifecycleState.GRACE, "FULL", "PAYMENT_PAST_DUE",
                graceStarted, graceEnds, null, null, null, null, null);
        }
        return current.withReason(reason);
    }

    private StateRow active(StateRow current, String reason, Instant trialEndsAt) {
        return current.withState(CommercialLifecycleState.ACTIVE, "FULL", reason,
            null, null, null, null, null, null, null).withTrialEnd(trialEndsAt);
    }

    private void persist(StateRow prior, StateRow next, String sourceType, String eventId, Instant occurredAt) {
        jdbc.update(
            """
                UPDATE company_commercial_states
                SET state = ?, access_mode = ?, subscription_status = ?, payment_status = ?, trial_ends_at = ?,
                    grace_started_at = ?, grace_ends_at = ?, read_only_started_at = ?, read_only_ends_at = ?,
                    suspended_at = ?, retention_until = ?, purge_eligible_at = ?, reason_code = ?,
                    last_source_event_id = ?, last_source_event_created_at = ?, version = version + 1
                WHERE company_id = ?
                """,
            next.state().name(), next.accessMode(), next.subscriptionStatus(), next.paymentStatus(), ts(next.trialEndsAt()),
            ts(next.graceStartedAt()), ts(next.graceEndsAt()), ts(next.readOnlyStartedAt()), ts(next.readOnlyEndsAt()),
            ts(next.suspendedAt()), ts(next.retentionUntil()), ts(next.purgeEligibleAt()), next.reasonCode(),
            next.lastEventId(), ts(next.lastEventCreatedAt()), next.companyId()
        );
        jdbc.update(
            """
                INSERT IGNORE INTO company_commercial_state_events (
                    company_id, source_type, source_event_id, source_event_created_at,
                    prior_state, new_state, reason_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
            next.companyId(), sourceType, eventId, ts(occurredAt), prior.state().name(), next.state().name(), next.reasonCode()
        );
        if (next.state() == CommercialLifecycleState.SUSPENDED
            || next.state() == CommercialLifecycleState.RETENTION) {
            scheduleRetention(next);
        } else if (next.state() == CommercialLifecycleState.ACTIVE || next.state() == CommercialLifecycleState.TRIAL) {
            jdbc.update(
                """
                    UPDATE company_data_retention_jobs
                    SET status = 'CANCELED', cancellation_reason = 'BILLING_RECOVERED'
                    WHERE company_id = ? AND status = 'SCHEDULED'
                    """,
                next.companyId()
            );
        }
    }

    private void scheduleRetention(StateRow state) {
        if (state.retentionUntil() == null) return;
        var updated = jdbc.update(
            """
                UPDATE company_data_retention_jobs
                SET eligible_at = ?, updated_at = CURRENT_TIMESTAMP(6)
                WHERE company_id = ? AND status = 'SCHEDULED'
                """,
            ts(state.retentionUntil()), state.companyId()
        );
        if (updated == 0) {
            jdbc.update(
                "INSERT INTO company_data_retention_jobs (company_id, status, eligible_at) VALUES (?, 'SCHEDULED', ?)",
                state.companyId(), ts(state.retentionUntil())
            );
        }
    }

    private boolean enrolled(long companyId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT COUNT(*) > 0 FROM company_entitlement_policies WHERE company_id = ?",
            Boolean.class, companyId));
    }

    private void ensureState(long companyId) {
        jdbc.update(
            """
                INSERT IGNORE INTO company_commercial_states (company_id, state, access_mode, reason_code)
                VALUES (?, 'ACTIVE', 'FULL', 'PREMIUM_ENROLLED')
                """,
            companyId
        );
    }

    private List<StateRow> rows(long companyId, boolean lock) {
        return jdbc.query(
            """
                SELECT company_id, state, access_mode, subscription_status, payment_status, trial_ends_at,
                       grace_started_at, grace_ends_at, read_only_started_at, read_only_ends_at,
                       suspended_at, retention_until, purge_eligible_at, reason_code,
                       last_source_event_id, last_source_event_created_at
                FROM company_commercial_states WHERE company_id = ?
                """ + (lock ? " FOR UPDATE" : ""),
            (rs, rowNum) -> new StateRow(
                rs.getLong("company_id"), CommercialLifecycleState.valueOf(rs.getString("state")),
                rs.getString("access_mode"), rs.getString("subscription_status"), rs.getString("payment_status"),
                instant(rs.getTimestamp("trial_ends_at")), instant(rs.getTimestamp("grace_started_at")),
                instant(rs.getTimestamp("grace_ends_at")), instant(rs.getTimestamp("read_only_started_at")),
                instant(rs.getTimestamp("read_only_ends_at")), instant(rs.getTimestamp("suspended_at")),
                instant(rs.getTimestamp("retention_until")), instant(rs.getTimestamp("purge_eligible_at")),
                rs.getString("reason_code"), rs.getString("last_source_event_id"),
                instant(rs.getTimestamp("last_source_event_created_at"))
            ),
            companyId
        );
    }

    private CommercialLifecycleSnapshot snapshot(StateRow row) {
        return new CommercialLifecycleSnapshot(
            row.companyId(), row.state().name(), row.accessMode(), row.subscriptionStatus(), row.paymentStatus(),
            row.trialEndsAt(), row.graceEndsAt(), row.readOnlyEndsAt(), row.retentionUntil(), row.reasonCode(),
            row.state().allowsOperationalRead(), row.state().allowsOperationalWrite()
        );
    }

    private boolean isNewer(Instant incomingAt, String incomingId, Instant currentAt, String currentId) {
        if (currentAt == null) return true;
        var compare = incomingAt.compareTo(currentAt);
        if (compare != 0) return compare > 0;
        if (incomingId == null) return currentId == null;
        return currentId == null || incomingId.compareTo(currentId) > 0;
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replace('.', '_').replace('-', '_');
    }

    private String normalizedValue(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private Timestamp ts(Instant value) { return value == null ? null : Timestamp.from(value); }
    private Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private Instant databaseInstant(Instant value) {
        return value == null ? null : value.truncatedTo(ChronoUnit.MICROS);
    }

    public record TransitionResult(boolean enrolled, boolean state_changed, CommercialLifecycleSnapshot snapshot) {}

    private record StateRow(
        long companyId, CommercialLifecycleState state, String accessMode,
        String subscriptionStatus, String paymentStatus, Instant trialEndsAt,
        Instant graceStartedAt, Instant graceEndsAt, Instant readOnlyStartedAt,
        Instant readOnlyEndsAt, Instant suspendedAt, Instant retentionUntil,
        Instant purgeEligibleAt, String reasonCode, String lastEventId, Instant lastEventCreatedAt
    ) {
        StateRow withState(CommercialLifecycleState next, String mode, String reason,
                           Instant graceStart, Instant graceEnd, Instant readStart, Instant readEnd,
                           Instant suspended, Instant retention, Instant purge) {
            return new StateRow(companyId, next, mode, subscriptionStatus, paymentStatus, trialEndsAt,
                graceStart, graceEnd, readStart, readEnd, suspended, retention, purge,
                reason, lastEventId, lastEventCreatedAt);
        }
        StateRow withSource(String eventId, Instant eventAt, String subscription, String payment) {
            return new StateRow(companyId, state, accessMode, subscription, payment, trialEndsAt,
                graceStartedAt, graceEndsAt, readOnlyStartedAt, readOnlyEndsAt, suspendedAt,
                retentionUntil, purgeEligibleAt, reasonCode, eventId, eventAt);
        }
        StateRow withTrialEnd(Instant trialEnd) {
            return new StateRow(companyId, state, accessMode, subscriptionStatus, paymentStatus, trialEnd,
                graceStartedAt, graceEndsAt, readOnlyStartedAt, readOnlyEndsAt, suspendedAt,
                retentionUntil, purgeEligibleAt, reasonCode, lastEventId, lastEventCreatedAt);
        }
        StateRow withReason(String reason) {
            return new StateRow(companyId, state, accessMode, subscriptionStatus, paymentStatus, trialEndsAt,
                graceStartedAt, graceEndsAt, readOnlyStartedAt, readOnlyEndsAt, suspendedAt,
                retentionUntil, purgeEligibleAt, reason, lastEventId, lastEventCreatedAt);
        }
    }
}
