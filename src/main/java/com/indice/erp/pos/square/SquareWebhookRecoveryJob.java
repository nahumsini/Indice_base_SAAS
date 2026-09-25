package com.indice.erp.pos.square;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class SquareWebhookRecoveryJob {
    private final JdbcTemplate jdbc;
    private final SquareWebhookIngressService ingress;
    private final SquareTerminalProperties properties;
    SquareWebhookRecoveryJob(JdbcTemplate jdbc, SquareWebhookIngressService ingress, SquareTerminalProperties properties) {
        this.jdbc = jdbc;
        this.ingress = ingress;
        this.properties = properties;
    }
    @Scheduled(fixedDelayString = "${app.pos.square.reconciliation-delay-ms:30000}")
    public void retry() {
        if (!properties.isEnabled()) return;
        var rows = jdbc.query("""
            SELECT id, raw_payload, environment FROM pos_square_webhook_events
            WHERE environment = ? AND attempt_count < 8 AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP(6))
              AND ((status='RECEIVED' AND (processed_at IS NULL OR processed_at < DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 5 MINUTE)))
                OR status='FAILED' OR (status = 'PROCESSING' AND lease_expires_at < CURRENT_TIMESTAMP(6)))
            ORDER BY received_at ASC, id ASC LIMIT 50
            """, (rs, row) -> new Saved(rs.getLong("id"), rs.getString("raw_payload"),
                rs.getString("environment")), properties.getEnvironment());
        for (var row : rows) {
            try {
                // Only ingest verifies signatures; persisted payloads contain identifiers for authenticated recovery.
                ingress.retryStored(row.id(), row.payload(), row.environment());
            } catch (RuntimeException isolatedFailure) {
                // Each durable event remains retryable independently; no credential/provider payload is logged.
            }
        }
    }
    private record Saved(long id, String payload, String environment) {}
}
