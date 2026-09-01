package com.indice.erp.pos.square;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SquareWebhookEventRepository {

    private final JdbcTemplate jdbcTemplate;

    public SquareWebhookEventRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public IngressResult ingest(SquareWebhookEnvelope event) {
        try {
            jdbcTemplate.update("""
                INSERT INTO pos_square_webhook_events
                  (square_event_id, event_type, environment, merchant_id, object_id,
                   payload_sha256, raw_payload)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, event.eventId(), event.eventType(), event.environment(), event.merchantId(),
                event.objectId(), event.payloadSha256(), event.rawPayload());
            var id = jdbcTemplate.queryForObject(
                "SELECT id FROM pos_square_webhook_events WHERE square_event_id = ?",
                Long.class, event.eventId());
            return new IngressResult(id, false);
        } catch (DuplicateKeyException duplicate) {
            var existing = jdbcTemplate.query("""
                SELECT id, payload_sha256
                FROM pos_square_webhook_events
                WHERE square_event_id = ? FOR UPDATE
                """, (rs, row) -> new Existing(rs.getLong("id"), rs.getString("payload_sha256")),
                event.eventId());
            if (existing.isEmpty() || !existing.getFirst().payloadSha256().equals(event.payloadSha256())) {
                throw new IllegalArgumentException("Square webhook event ID was reused with a different payload.");
            }
            jdbcTemplate.update("""
                UPDATE pos_square_webhook_events
                SET duplicate_count = duplicate_count + 1
                WHERE id = ?
                """, existing.getFirst().id());
            return new IngressResult(existing.getFirst().id(), true);
        }
    }

    public void markProcessed(long id, Long companyId, Long intentId, Long terminalId) {
        jdbcTemplate.update("""
            UPDATE pos_square_webhook_events
            SET status = 'PROCESSED', company_id = ?, intent_id = ?, terminal_id = ?,
                processed_at = CURRENT_TIMESTAMP, last_error_message = NULL
            WHERE id = ?
            """, companyId, intentId, terminalId, id);
    }

    public void markIgnored(long id, Long companyId, String message) {
        jdbcTemplate.update("""
            UPDATE pos_square_webhook_events
            SET status = 'IGNORED', company_id = ?, processed_at = CURRENT_TIMESTAMP,
                last_error_message = ?
            WHERE id = ?
            """, companyId, truncate(message), id);
    }

    public void markFailed(long id, Long companyId, String message) {
        jdbcTemplate.update("""
            UPDATE pos_square_webhook_events
            SET status = 'FAILED', company_id = ?, processed_at = CURRENT_TIMESTAMP,
                last_error_message = ?
            WHERE id = ?
            """, companyId, truncate(message), id);
    }

    private String truncate(String message) {
        if (message == null) return null;
        return message.length() <= 500 ? message : message.substring(0, 500);
    }

    public record SquareWebhookEnvelope(
        String eventId,
        String eventType,
        String environment,
        String merchantId,
        String objectId,
        String payloadSha256,
        String rawPayload
    ) {
    }

    public record IngressResult(long id, boolean duplicate) {
    }

    private record Existing(long id, String payloadSha256) {
    }
}
