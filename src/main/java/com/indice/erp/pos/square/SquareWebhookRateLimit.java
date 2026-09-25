package com.indice.erp.pos.square;

import jakarta.servlet.http.HttpServletRequest;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Component
class SquareWebhookRateLimit {
    private final JdbcTemplate jdbc; private final int limit;
    SquareWebhookRateLimit(JdbcTemplate jdbc,SquareWebhookProperties properties) {
        this.jdbc=jdbc; this.limit=Math.clamp(properties.getWebhookRateLimitPerMinute(),10,10_000);
    }
    @Transactional
    void require(HttpServletRequest request) {
        var peer=SquareHashing.sha256(request.getRemoteAddr()==null?"unknown":request.getRemoteAddr());
        var window=Timestamp.from(Instant.now().truncatedTo(ChronoUnit.MINUTES));
        jdbc.update("""
            INSERT INTO pos_square_webhook_rate_limits(peer_hash,window_started_at,request_count) VALUES(?,?,1)
            ON DUPLICATE KEY UPDATE request_count=request_count+1
            """,peer,window);
        var count=jdbc.queryForObject("SELECT request_count FROM pos_square_webhook_rate_limits "
            + "WHERE peer_hash=? AND window_started_at=?",Integer.class,peer,window);
        if (count!=null && count>limit) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
            "Square webhook rate limit exceeded.");
    }
}
