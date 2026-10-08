package com.indice.erp.billing.signup;

import com.indice.erp.billing.BillingHashing;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Billing's public-entry purpose in the existing durable auth bucket store. No raw network data. */
@Service
public class PublicTrialEntryRateLimit {
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public PublicTrialEntryRateLimit(JdbcTemplate jdbc, Clock clock) { this.jdbc = jdbc; this.clock = clock; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean consume(String networkSignal) {
        var now = clock.instant();
        var hash = BillingHashing.sha256("public-trial-entry:" + networkSignal);
        jdbc.update("""
            INSERT IGNORE INTO auth_rate_limit_buckets (purpose, rate_limit_key_hash,
                email_normalized, company_name_normalized, request_count, window_started_at, window_ends_at)
            VALUES ('PUBLIC_TRIAL_ENTRY', ?, '', '', 0, ?, ?)
            """, hash, Timestamp.from(now), Timestamp.from(now.plus(Duration.ofMinutes(10))));
        var row = jdbc.queryForObject("""
            SELECT request_count, window_ends_at FROM auth_rate_limit_buckets
            WHERE purpose = 'PUBLIC_TRIAL_ENTRY' AND rate_limit_key_hash = ? FOR UPDATE
            """, (rs, n) -> new Window(rs.getInt(1), rs.getTimestamp(2).toInstant()), hash);
        var expired = !row.endsAt().isAfter(now);
        var count = expired ? 0 : row.count();
        if (count >= 10) return false;
        jdbc.update("""
            UPDATE auth_rate_limit_buckets SET request_count = ?,
                window_started_at = CASE WHEN ? THEN ? ELSE window_started_at END,
                window_ends_at = CASE WHEN ? THEN ? ELSE window_ends_at END
            WHERE purpose = 'PUBLIC_TRIAL_ENTRY' AND rate_limit_key_hash = ?
            """, count + 1, expired, Timestamp.from(now), expired,
            Timestamp.from(now.plus(Duration.ofMinutes(10))), hash);
        return true;
    }

    private record Window(int count, java.time.Instant endsAt) { }
}
