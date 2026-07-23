package com.indice.erp.billing.stripe;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class StripeUnmatchedWebhookEventRepository {

    private final JdbcTemplate jdbcTemplate;
    private final StripeWebhookEventRepository processedRepository;

    StripeUnmatchedWebhookEventRepository(JdbcTemplate jdbcTemplate, StripeWebhookEventRepository processedRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.processedRepository = processedRepository;
    }

    void record(String eventId, String eventType, String payload, String subscriptionId, String message) {
        jdbcTemplate.update(
            """
                INSERT INTO stripe_unmatched_webhook_events
                    (stripe_event_id, event_type, stripe_subscription_id, payload_sha256,
                     attempts, last_failure_message, last_attempt_at)
                VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE
                    status = 'pending',
                    attempts = attempts + 1,
                    last_failure_message = VALUES(last_failure_message),
                    last_attempt_at = UTC_TIMESTAMP()
                """,
            eventId,
            eventType,
            subscriptionId,
            sha256(payload),
            trim(message, 500)
        );
    }

    List<StripeUnmatchedWebhookEvent> pending(int limit) {
        return jdbcTemplate.query(
            """
                SELECT id, stripe_event_id, event_type, stripe_subscription_id, payload_sha256
                FROM stripe_unmatched_webhook_events
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT ?
                """,
            this::map,
            limit
        );
    }

    List<StripeUnmatchedWebhookEvent> pendingForSubscription(String subscriptionId, int limit) {
        return jdbcTemplate.query(
            """
                SELECT id, stripe_event_id, event_type, stripe_subscription_id, payload_sha256
                FROM stripe_unmatched_webhook_events
                WHERE status = 'pending'
                  AND stripe_subscription_id = ?
                ORDER BY created_at ASC
                LIMIT ?
                """,
            this::map,
            subscriptionId,
            limit
        );
    }

    void markAttemptFailed(long id, String message) {
        jdbcTemplate.update(
            """
                UPDATE stripe_unmatched_webhook_events
                SET attempts = attempts + 1,
                    last_failure_message = ?,
                    last_attempt_at = UTC_TIMESTAMP()
                WHERE id = ?
                  AND status = 'pending'
                """,
            trim(message, 500),
            id
        );
    }

    void markResolved(StripeUnmatchedWebhookEvent event) {
        processedRepository.recordProcessedHash(event.stripeEventId(), event.eventType(), event.payloadSha256());
        jdbcTemplate.update(
            "UPDATE stripe_unmatched_webhook_events SET status = 'resolved', resolved_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'pending'",
            event.id()
        );
    }

    private StripeUnmatchedWebhookEvent map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new StripeUnmatchedWebhookEvent(rs.getLong("id"), rs.getString("stripe_event_id"),
            rs.getString("event_type"), rs.getString("stripe_subscription_id"), rs.getString("payload_sha256"));
    }

    private String sha256(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            var bytes = digest.digest((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
            var hex = new StringBuilder();
            for (var current : bytes) {
                hex.append(String.format("%02x", current));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available.", ex);
        }
    }

    private String trim(String value, int max) {
        var cleaned = value == null ? "" : value.trim();
        return cleaned.length() > max ? cleaned.substring(0, max) : cleaned;
    }
}
