package com.indice.erp.pos.square;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class SquareWebhookRateLimitCleanupJob {
    private final JdbcTemplate jdbc;
    SquareWebhookRateLimitCleanupJob(JdbcTemplate jdbc){this.jdbc=jdbc;}
    @Scheduled(fixedDelayString="${app.pos.square.webhook-rate-cleanup-delay-ms:3600000}")
    void cleanup(){jdbc.update("DELETE FROM pos_square_webhook_rate_limits "
        + "WHERE window_started_at < DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 2 DAY) LIMIT 10000");}
}
