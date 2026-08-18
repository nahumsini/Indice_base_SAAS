package com.indice.erp.auth;

import com.indice.erp.billing.BillingHashing;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthLockoutService {

    private static final String PASSWORD_PURPOSE = "PASSWORD";
    private static final String OTP_SEND_PURPOSE = "OTP_SEND";

    private final JdbcTemplate jdbcTemplate;
    private final AuthSecurityProperties properties;
    private final Clock clock;

    public AuthLockoutService(JdbcTemplate jdbcTemplate, AuthSecurityProperties properties, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public LockoutState passwordLockout(String emailNormalized, String companyNameNormalized) {
        var keyHash = passwordKey(emailNormalized, companyNameNormalized);
        var rows = jdbcTemplate.query(
            """
                SELECT failure_count, locked_until
                FROM auth_login_lockouts
                WHERE lockout_key_hash = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new LockoutState(
                rs.getInt("failure_count"),
                instant(rs.getTimestamp("locked_until")),
                active(instant(rs.getTimestamp("locked_until")))
            ),
            keyHash
        );
        if (rows.isEmpty()) {
            return LockoutState.open();
        }
        var state = rows.getFirst();
        if (state.locked()) {
            return state;
        }
        if (state.lockedUntil() != null) {
            jdbcTemplate.update(
                """
                    UPDATE auth_login_lockouts
                    SET failure_count = 0,
                        locked_until = NULL
                    WHERE lockout_key_hash = ?
                    """,
                keyHash
            );
            return LockoutState.open();
        }
        return LockoutState.open(state.failureCount());
    }

    @Transactional
    public LockoutState recordPasswordFailure(LoginCredentialVerificationResult result) {
        var now = clock.instant();
        var keyHash = passwordKey(result.emailNormalized(), result.companyNameNormalized());
        var rows = jdbcTemplate.query(
            """
                SELECT id, failure_count, locked_until, updated_at
                FROM auth_login_lockouts
                WHERE lockout_key_hash = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new LockoutRow(
                rs.getLong("id"),
                rs.getInt("failure_count"),
                instant(rs.getTimestamp("locked_until")),
                instant(rs.getTimestamp("updated_at"))
            ),
            keyHash
        );
        var previous = rows.isEmpty() ? null : rows.getFirst();
        var expiredLockout = previous != null
            && previous.lockedUntil() != null
            && !previous.lockedUntil().isAfter(now);
        var stale = previous == null
            || expiredLockout
            || previous.updatedAt() == null
            || previous.updatedAt().plus(Duration.ofMinutes(properties.getLoginLockoutMinutes())).isBefore(now);
        var count = stale ? 1 : previous.failureCount() + 1;
        var lockedUntil = count >= properties.getLoginLockoutAttempts()
            ? now.plus(Duration.ofMinutes(properties.getLoginLockoutMinutes()))
            : null;

        if (previous == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO auth_login_lockouts (
                        lockout_key_hash, email_normalized, company_name_normalized,
                        user_id, company_id, user_company_id, failure_count,
                        locked_until, last_failure_reason_code
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                keyHash,
                clean(result.emailNormalized()),
                clean(result.companyNameNormalized()),
                result.userId(),
                result.companyId(),
                result.userCompanyId(),
                count,
                timestamp(lockedUntil),
                result.failureReasonCode()
            );
        } else {
            jdbcTemplate.update(
                """
                    UPDATE auth_login_lockouts
                    SET email_normalized = ?, company_name_normalized = ?,
                        user_id = COALESCE(?, user_id),
                        company_id = COALESCE(?, company_id),
                        user_company_id = COALESCE(?, user_company_id),
                        failure_count = ?,
                        locked_until = ?,
                        last_failure_reason_code = ?
                    WHERE id = ?
                    """,
                clean(result.emailNormalized()),
                clean(result.companyNameNormalized()),
                result.userId(),
                result.companyId(),
                result.userCompanyId(),
                count,
                timestamp(lockedUntil),
                result.failureReasonCode(),
                previous.id()
            );
        }
        return new LockoutState(count, lockedUntil, lockedUntil != null);
    }

    @Transactional
    public void clearPasswordFailures(AuthenticatedLogin login) {
        jdbcTemplate.update(
            "DELETE FROM auth_login_lockouts WHERE lockout_key_hash = ?",
            passwordKey(login.email(), login.companyName())
        );
    }

    @Transactional
    public RateLimitDecision consumeOtpSend(AuthenticatedLogin login) {
        var now = clock.instant();
        var keyHash = otpSendKey(login.email(), login.companyName());
        var rows = jdbcTemplate.query(
            """
                SELECT id, request_count, window_ends_at, blocked_until
                FROM auth_rate_limit_buckets
                WHERE purpose = ? AND rate_limit_key_hash = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> new RateLimitRow(
                rs.getLong("id"),
                rs.getInt("request_count"),
                instant(rs.getTimestamp("window_ends_at")),
                instant(rs.getTimestamp("blocked_until"))
            ),
            OTP_SEND_PURPOSE,
            keyHash
        );
        var row = rows.isEmpty() ? null : rows.getFirst();
        if (row != null && active(row.blockedUntil())) {
            return new RateLimitDecision(false, row.requestCount(), row.blockedUntil());
        }

        var windowExpired = row == null || row.windowEndsAt() == null || !row.windowEndsAt().isAfter(now);
        var windowEndsAt = windowExpired
            ? now.plus(Duration.ofMinutes(properties.getMfaSendWindowMinutes()))
            : row.windowEndsAt();
        var count = windowExpired ? 1 : row.requestCount() + 1;
        Instant blockedUntil = null;
        var allowed = true;
        if (!windowExpired && row.requestCount() >= properties.getMfaSendMaxRequests()) {
            allowed = false;
            count = row.requestCount();
            blockedUntil = now.plus(Duration.ofMinutes(properties.getLoginLockoutMinutes()));
        }

        if (row == null) {
            jdbcTemplate.update(
                """
                    INSERT INTO auth_rate_limit_buckets (
                        purpose, rate_limit_key_hash, email_normalized, company_name_normalized,
                        user_id, company_id, user_company_id, request_count,
                        window_started_at, window_ends_at, blocked_until
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                OTP_SEND_PURPOSE,
                keyHash,
                normalize(login.email()),
                normalize(login.companyName()),
                login.userId(),
                login.companyId(),
                login.userCompanyId(),
                count,
                timestamp(now),
                timestamp(windowEndsAt),
                timestamp(blockedUntil)
            );
        } else {
            jdbcTemplate.update(
                """
                    UPDATE auth_rate_limit_buckets
                    SET email_normalized = ?, company_name_normalized = ?,
                        user_id = ?, company_id = ?, user_company_id = ?,
                        request_count = ?,
                        window_started_at = CASE WHEN ? = 1 THEN ? ELSE window_started_at END,
                        window_ends_at = ?,
                        blocked_until = ?
                    WHERE id = ?
                    """,
                normalize(login.email()),
                normalize(login.companyName()),
                login.userId(),
                login.companyId(),
                login.userCompanyId(),
                count,
                windowExpired ? 1 : 0,
                timestamp(now),
                timestamp(windowEndsAt),
                timestamp(blockedUntil),
                row.id()
            );
        }
        return new RateLimitDecision(allowed, count, blockedUntil);
    }

    @Transactional
    public LockoutState lockAccount(AuthenticatedLogin login, String reasonCode) {
        var result = LoginCredentialVerificationResult.failure(
            "Invalid login or account temporarily locked.",
            reasonCode,
            normalize(login.email()),
            normalize(login.companyName()),
            login.userId(),
            login.companyId(),
            login.userCompanyId(),
            login.role()
        );
        var state = recordPasswordFailure(result);
        if (!state.locked()) {
            var lockedUntil = clock.instant().plus(Duration.ofMinutes(properties.getLoginLockoutMinutes()));
            jdbcTemplate.update(
                """
                    UPDATE auth_login_lockouts
                    SET failure_count = ?, locked_until = ?, last_failure_reason_code = ?
                    WHERE lockout_key_hash = ?
                    """,
                properties.getLoginLockoutAttempts(),
                timestamp(lockedUntil),
                reasonCode,
                passwordKey(login.email(), login.companyName())
            );
            return new LockoutState(properties.getLoginLockoutAttempts(), lockedUntil, true);
        }
        return state;
    }

    private String passwordKey(String email, String company) {
        return BillingHashing.sha256(PASSWORD_PURPOSE + ":" + normalize(company) + ":" + normalize(email));
    }

    private String otpSendKey(String email, String company) {
        return BillingHashing.sha256(OTP_SEND_PURPOSE + ":" + normalize(company) + ":" + normalize(email));
    }

    private boolean active(Instant value) {
        return value != null && value.isAfter(clock.instant());
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String clean(String value) {
        return normalize(value);
    }

    private Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private Timestamp timestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private record LockoutRow(long id, int failureCount, Instant lockedUntil, Instant updatedAt) {
    }

    private record RateLimitRow(long id, int requestCount, Instant windowEndsAt, Instant blockedUntil) {
    }

    public record LockoutState(int failureCount, Instant lockedUntil, boolean locked) {
        static LockoutState open() {
            return new LockoutState(0, null, false);
        }

        static LockoutState open(int failureCount) {
            return new LockoutState(failureCount, null, false);
        }
    }

    public record RateLimitDecision(boolean allowed, int attemptsUsed, Instant blockedUntil) {
    }
}
