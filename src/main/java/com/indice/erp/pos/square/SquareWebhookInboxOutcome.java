package com.indice.erp.pos.square;

import org.springframework.jdbc.core.JdbcTemplate;

class SquareWebhookInboxOutcome {
    private final JdbcTemplate jdbc;
    SquareWebhookInboxOutcome(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    void processed(long id, String owner, Long company, Long intent, Long terminal) {
        jdbc.update("""
            UPDATE pos_square_webhook_events SET status = 'PROCESSED', company_id = ?, intent_id = ?, terminal_id = ?,
                processed_at = CURRENT_TIMESTAMP, last_error_message = NULL, lease_owner = NULL, lease_expires_at = NULL
            WHERE id = ? AND status = 'PROCESSING' AND lease_owner = ?
            """, company, intent, terminal, id, owner);
    }
    void ignored(long id, String owner, Long company, String message) {
        jdbc.update("""
            UPDATE pos_square_webhook_events SET status = 'IGNORED', company_id = ?, processed_at = CURRENT_TIMESTAMP,
              last_error_message = ?, lease_owner = NULL, lease_expires_at = NULL
            WHERE id = ? AND status = 'PROCESSING' AND lease_owner = ?
            """, company, clean(message), id, owner);
    }
    void failed(long id, String owner, Long company, String message) {
        jdbc.update("""
            UPDATE pos_square_webhook_events SET
              status = CASE WHEN attempt_count >= 8 THEN 'DEAD_LETTER' ELSE 'FAILED' END,
              company_id = ?, processed_at = CURRENT_TIMESTAMP, last_error_message = ?,
              next_attempt_at = CASE WHEN attempt_count >= 8 THEN NULL ELSE TIMESTAMPADD(SECOND,
                LEAST(3600, 30 * POW(2, GREATEST(attempt_count - 1, 0))), CURRENT_TIMESTAMP(6)) END,
              dead_lettered_at = CASE WHEN attempt_count >= 8 THEN CURRENT_TIMESTAMP(6) ELSE NULL END,
              lease_owner = NULL, lease_expires_at = NULL
            WHERE id = ? AND status = 'PROCESSING' AND lease_owner = ?
            """, company, clean(message), id, owner);
    }
    private String clean(String value) { return value == null || value.length() <= 500 ? value : value.substring(0, 500); }
}
