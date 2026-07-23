package com.indice.erp.billing.stripe;

import com.indice.erp.billing.BillingHashing;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class StripeWebhookEventRepository {

    private final JdbcTemplate jdbcTemplate;

    public StripeWebhookEventRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public IngressResult ingest(StripeWebhookEnvelope event) {
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO stripe_webhook_events (
                        stripe_event_id, event_type, livemode, stripe_api_version,
                        object_id, object_type, payload_sha256, raw_payload,
                        event_created_at, payload_retention_until
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                event.eventId(),
                event.eventType(),
                event.livemode(),
                blankToNull(event.apiVersion()),
                blankToNull(event.objectId()),
                blankToNull(event.objectType()),
                event.payloadSha256(),
                event.rawPayload(),
                Timestamp.from(event.eventCreatedAt()),
                Timestamp.from(event.payloadRetentionUntil())
            );
            var id = jdbcTemplate.queryForObject(
                "SELECT id FROM stripe_webhook_events WHERE stripe_event_id = ?",
                Long.class,
                event.eventId()
            );
            return new IngressResult(id, false);
        } catch (DuplicateKeyException exception) {
            var existing = jdbcTemplate.query(
                "SELECT id, payload_sha256 FROM stripe_webhook_events WHERE stripe_event_id = ? FOR UPDATE",
                (rs, rowNum) -> new ExistingEvent(rs.getLong("id"), rs.getString("payload_sha256")),
                event.eventId()
            );
            if (existing.isEmpty()) {
                throw exception;
            }
            if (!existing.getFirst().payloadSha256().equals(event.payloadSha256())) {
                throw new StripeWebhookIntegrityException("Stripe event ID was received with a different payload.");
            }
            jdbcTemplate.update(
                """
                    UPDATE stripe_webhook_events
                    SET duplicate_count = duplicate_count + 1, last_received_at = CURRENT_TIMESTAMP(6)
                    WHERE id = ?
                    """,
                existing.getFirst().id()
            );
            return new IngressResult(existing.getFirst().id(), true);
        }
    }

    @Transactional
    public ClaimedEvent claimNext(String leaseOwner, int leaseSeconds) {
        jdbcTemplate.update(
            """
                UPDATE stripe_webhook_events
                SET status = 'RETRY', lease_owner = NULL, lease_expires_at = NULL,
                    available_at = CURRENT_TIMESTAMP(6), last_error_code = 'LEASE_EXPIRED'
                WHERE status = 'PROCESSING'
                  AND lease_expires_at < CURRENT_TIMESTAMP(6)
                """
        );
        var rows = jdbcTemplate.query(
            """
                SELECT id, stripe_event_id, event_type, raw_payload, attempt_count, event_created_at
                FROM stripe_webhook_events
                WHERE status IN ('RECEIVED', 'RETRY')
                  AND available_at <= CURRENT_TIMESTAMP(6)
                  AND raw_payload IS NOT NULL
                ORDER BY event_created_at, id
                LIMIT 1
                FOR UPDATE SKIP LOCKED
                """,
            (rs, rowNum) -> new ClaimedEvent(
                rs.getLong("id"),
                rs.getString("stripe_event_id"),
                rs.getString("event_type"),
                rs.getString("raw_payload"),
                rs.getInt("attempt_count") + 1,
                rs.getTimestamp("event_created_at").toInstant()
            )
        );
        if (rows.isEmpty()) {
            return null;
        }
        var event = rows.getFirst();
        jdbcTemplate.update(
            """
                UPDATE stripe_webhook_events
                SET status = 'PROCESSING', attempt_count = attempt_count + 1,
                    lease_owner = ?, lease_expires_at = TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP(6))
                WHERE id = ?
                """,
            leaseOwner,
            leaseSeconds,
            event.id()
        );
        return event;
    }

    public void markProcessed(long id, ProcessingResult result) {
        jdbcTemplate.update(
            """
                UPDATE stripe_webhook_events
                SET status = ?, processed_at = CURRENT_TIMESTAMP(6), lease_owner = NULL,
                    lease_expires_at = NULL, last_error_code = NULL, last_error_message = NULL,
                    company_id = COALESCE(?, company_id),
                    signup_intent_id = COALESCE(?, signup_intent_id),
                    stripe_subscription_id = COALESCE(?, stripe_subscription_id)
                WHERE id = ? AND status = 'PROCESSING'
                """,
            result.ignored() ? "IGNORED" : "PROCESSED",
            result.companyId(),
            result.signupIntentId(),
            blankToNull(result.stripeSubscriptionId()),
            id
        );
    }

    public void markRetry(long id, int attemptCount, int maxAttempts, String code, String message) {
        var terminal = attemptCount >= maxAttempts;
        var delaySeconds = Math.min(3_600, (long) Math.pow(2, Math.min(10, attemptCount)));
        jdbcTemplate.update(
            """
                UPDATE stripe_webhook_events
                SET status = ?, available_at = TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP(6)),
                    lease_owner = NULL, lease_expires_at = NULL,
                    last_error_code = ?, last_error_message = ?,
                    processed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP(6) ELSE processed_at END
                WHERE id = ? AND status = 'PROCESSING'
                """,
            terminal ? "DEAD" : "RETRY",
            delaySeconds,
            truncate(code, 80),
            truncate(message, 500),
            terminal,
            id
        );
    }

    public int purgeExpiredPayloads() {
        return jdbcTemplate.update(
            """
                UPDATE stripe_webhook_events
                SET raw_payload = NULL
                WHERE raw_payload IS NOT NULL
                  AND payload_retention_until < CURRENT_TIMESTAMP(6)
                  AND status IN ('PROCESSED', 'IGNORED', 'DEAD')
                """
        );
    }

    boolean alreadyProcessed(String eventId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM stripe_webhook_events WHERE stripe_event_id = ?",
            Long.class,
            eventId
        );
        return count != null && count > 0;
    }

    void recordProcessed(String eventId, String eventType, String payload) {
        recordProcessedHash(eventId, eventType, BillingHashing.sha256(payload == null ? "" : payload));
    }

    void recordProcessedHash(String eventId, String eventType, String payloadSha256) {
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO stripe_webhook_events (
                        stripe_event_id, event_type, payload_sha256, raw_payload, status,
                        event_created_at, processed_at, payload_retention_until
                    ) VALUES (?, ?, ?, NULL, 'PROCESSED', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6),
                        TIMESTAMPADD(DAY, 30, CURRENT_TIMESTAMP(6)))
                    """,
                eventId,
                eventType,
                payloadSha256
            );
        } catch (DuplicateKeyException ignored) {
        }
    }

    public List<EventStatus> statuses() {
        return jdbcTemplate.query(
            "SELECT stripe_event_id, status, attempt_count, duplicate_count FROM stripe_webhook_events ORDER BY id",
            (rs, rowNum) -> new EventStatus(
                rs.getString("stripe_event_id"),
                rs.getString("status"),
                rs.getInt("attempt_count"),
                rs.getInt("duplicate_count")
            )
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String truncate(String value, int length) {
        if (value == null) {
            return null;
        }
        return value.length() <= length ? value : value.substring(0, length);
    }

    public record IngressResult(long id, boolean duplicate) {
    }

    public record ClaimedEvent(
        long id,
        String eventId,
        String eventType,
        String rawPayload,
        int attemptCount,
        Instant eventCreatedAt
    ) {
    }

    public record ProcessingResult(
        boolean ignored,
        Long companyId,
        Long signupIntentId,
        String stripeSubscriptionId
    ) {
        public static ProcessingResult processed(Long companyId, Long signupIntentId, String subscriptionId) {
            return new ProcessingResult(false, companyId, signupIntentId, subscriptionId);
        }

        public static ProcessingResult ignoredResult() {
            return new ProcessingResult(true, null, null, null);
        }
    }

    public record EventStatus(String eventId, String status, int attempts, int duplicates) {
    }

    private record ExistingEvent(long id, String payloadSha256) {
    }
}
