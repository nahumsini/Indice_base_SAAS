package com.indice.erp.pos.square;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

class SquareWebhookInboxInsert {
    private final JdbcTemplate jdbc;
    SquareWebhookInboxInsert(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    SquareWebhookEventRepository.IngressResult ingest(SquareWebhookEventRepository.SquareWebhookEnvelope event) {
        try {
            jdbc.update("""
                INSERT INTO pos_square_webhook_events
                  (square_event_id, event_type, environment, merchant_id, object_id, payload_sha256, raw_payload)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, event.eventId(), event.eventType(), event.environment(), event.merchantId(), event.objectId(),
                event.payloadSha256(), event.rawPayload());
            var id = jdbc.queryForObject("SELECT id FROM pos_square_webhook_events WHERE square_event_id = ?", Long.class, event.eventId());
            return new SquareWebhookEventRepository.IngressResult(id, false);
        } catch (DuplicateKeyException duplicate) {
            var rows = jdbc.query("SELECT id, payload_sha256 FROM pos_square_webhook_events WHERE square_event_id = ? FOR UPDATE",
                (rs, row) -> new Existing(rs.getLong("id"), rs.getString("payload_sha256")), event.eventId());
            if (rows.isEmpty() || !rows.getFirst().hash().equals(event.payloadSha256()))
                throw new IllegalArgumentException("Square webhook event ID was reused with a different payload.");
            jdbc.update("UPDATE pos_square_webhook_events SET duplicate_count = duplicate_count + 1 WHERE id = ?", rows.getFirst().id());
            return new SquareWebhookEventRepository.IngressResult(rows.getFirst().id(), true);
        }
    }
    private record Existing(long id, String hash) {}
}
