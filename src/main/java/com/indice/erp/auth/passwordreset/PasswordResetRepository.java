package com.indice.erp.auth.passwordreset;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PasswordResetRepository {

    private final JdbcTemplate jdbcTemplate;

    public PasswordResetRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int countRequestsByEmailHashSince(String emailHash, Instant since) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_password_reset_requests
                WHERE email_hash = ?
                  AND created_at >= ?
                """,
            Integer.class,
            emailHash,
            Timestamp.from(since)
        );
        return count == null ? 0 : count;
    }

    public int countRequestsByIpHashSince(String ipHash, Instant since) {
        if (ipHash == null || ipHash.isBlank()) {
            return 0;
        }

        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_password_reset_requests
                WHERE ip_hash = ?
                  AND created_at >= ?
                """,
            Integer.class,
            ipHash,
            Timestamp.from(since)
        );
        return count == null ? 0 : count;
    }

    public void recordRequest(
        String emailHash,
        String ipHash,
        String userAgentHash,
        boolean accepted,
        boolean emailSent,
        String blockedReason
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO user_password_reset_requests
                (email_hash, ip_hash, user_agent_hash, accepted, email_sent, blocked_reason)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
            emailHash,
            blankToNull(ipHash),
            blankToNull(userAgentHash),
            accepted,
            emailSent,
            blankToNull(blockedReason)
        );
    }

    public Optional<PasswordResetUser> findUserByEmail(String normalizedEmail) {
        var users = jdbcTemplate.query(
            """
                SELECT id, email, COALESCE(full_name, email) AS full_name
                FROM users
                WHERE LOWER(email) = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PasswordResetUser(
                rs.getLong("id"),
                rs.getString("email"),
                rs.getString("full_name")
            ),
            normalizedEmail
        );

        return users.stream().findFirst();
    }

    public void invalidateActiveTokensForUser(long userId, Instant now) {
        jdbcTemplate.update(
            """
                UPDATE user_password_reset_tokens
                SET status = 'superseded',
                    invalidated_at = ?
                WHERE user_id = ?
                  AND status = 'active'
                  AND used_at IS NULL
                  AND invalidated_at IS NULL
                """,
            Timestamp.from(now),
            userId
        );
    }

    public void insertToken(
        long userId,
        String tokenHash,
        Instant expiresAt,
        String requestedIpHash,
        String userAgentHash
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO user_password_reset_tokens
                (user_id, token_hash, expires_at, requested_ip_hash, user_agent_hash)
                VALUES (?, ?, ?, ?, ?)
                """,
            userId,
            tokenHash,
            Timestamp.from(expiresAt),
            blankToNull(requestedIpHash),
            blankToNull(userAgentHash)
        );
    }

    public Optional<PasswordResetTokenRecord> findTokenByHash(String tokenHash) {
        return findToken(tokenHash, false);
    }

    public Optional<PasswordResetTokenRecord> findTokenByHashForUpdate(String tokenHash) {
        return findToken(tokenHash, true);
    }

    public int updateUserPassword(long userId, String encodedPassword) {
        return jdbcTemplate.update(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            encodedPassword,
            userId
        );
    }

    public void markTokenUsed(long tokenId, Instant now) {
        jdbcTemplate.update(
            """
                UPDATE user_password_reset_tokens
                SET status = 'used',
                    used_at = ?
                WHERE id = ?
                """,
            Timestamp.from(now),
            tokenId
        );
    }

    public void invalidateOtherActiveTokens(long userId, long tokenId, Instant now) {
        jdbcTemplate.update(
            """
                UPDATE user_password_reset_tokens
                SET status = 'superseded',
                    invalidated_at = ?
                WHERE user_id = ?
                  AND id <> ?
                  AND status = 'active'
                  AND used_at IS NULL
                  AND invalidated_at IS NULL
                """,
            Timestamp.from(now),
            userId,
            tokenId
        );
    }

    private Optional<PasswordResetTokenRecord> findToken(String tokenHash, boolean forUpdate) {
        var sql = """
            SELECT id, user_id, status, expires_at, used_at, invalidated_at
            FROM user_password_reset_tokens
            WHERE token_hash = ?
            LIMIT 1
            """;

        if (forUpdate) {
            sql = sql + " FOR UPDATE";
        }

        var tokens = jdbcTemplate.query(
            sql,
            (rs, rowNum) -> new PasswordResetTokenRecord(
                rs.getLong("id"),
                rs.getLong("user_id"),
                rs.getString("status"),
                toInstant(rs.getTimestamp("expires_at")),
                toInstant(rs.getTimestamp("used_at")),
                toInstant(rs.getTimestamp("invalidated_at"))
            ),
            tokenHash
        );

        return tokens.stream().findFirst();
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
