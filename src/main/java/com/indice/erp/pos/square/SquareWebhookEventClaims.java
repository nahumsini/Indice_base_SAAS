package com.indice.erp.pos.square;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareWebhookEventClaims {
    private final JdbcTemplate jdbc;
    SquareWebhookEventClaims(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    Lease claim(long id) {
        var owner = java.util.UUID.randomUUID().toString();
        int claimed = jdbc.update("""
            UPDATE pos_square_webhook_events SET status = 'PROCESSING', lease_owner = ?,
              lease_expires_at = DATE_ADD(CURRENT_TIMESTAMP(6), INTERVAL 90 SECOND),
              attempt_count = attempt_count + 1, lifetime_attempt_count = lifetime_attempt_count + 1, processed_at = NULL
            WHERE id = ? AND attempt_count < 8 AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP(6))
              AND ((status='RECEIVED' AND (processed_at IS NULL OR processed_at < DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 5 MINUTE)))
                OR status='FAILED' OR (status = 'PROCESSING' AND lease_expires_at < CURRENT_TIMESTAMP(6)))
            """, owner, id);
        return claimed == 1 ? new Lease(owner) : null;
    }
    record Lease(String owner) {}
}
