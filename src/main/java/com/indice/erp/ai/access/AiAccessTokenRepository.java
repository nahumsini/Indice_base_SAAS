package com.indice.erp.ai.access;

import com.indice.erp.auth.AuthSessionUser;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AiAccessTokenRepository {

    private final JdbcTemplate jdbcTemplate;

    public AiAccessTokenRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int countActive(long userId, long companyId, Instant now) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM ai_access_tokens
                WHERE user_id = ?
                  AND company_id = ?
                  AND revoked_at IS NULL
                  AND expires_at > ?
                """,
            Integer.class,
            userId,
            companyId,
            Timestamp.from(now)
        );
        return count == null ? 0 : count;
    }

    public long insert(
        AuthSessionUser owner,
        String provider,
        String label,
        String tokenPrefix,
        String tokenHash,
        Instant expiresAt,
        Set<String> scopes
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO ai_access_tokens
                    (user_id, company_id, user_company_id, provider, label, token_prefix, token_hash, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, owner.userId());
            statement.setLong(2, owner.companyId());
            statement.setLong(3, owner.userCompanyId());
            statement.setString(4, provider);
            statement.setString(5, label);
            statement.setString(6, tokenPrefix);
            statement.setString(7, tokenHash);
            statement.setTimestamp(8, Timestamp.from(expiresAt));
            return statement;
        }, keyHolder);

        var key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("AI connection could not be created.");
        }
        var tokenId = key.longValue();
        scopes.forEach(scope -> jdbcTemplate.update(
            "INSERT INTO ai_access_token_scopes (token_id, scope_code) VALUES (?, ?)",
            tokenId,
            scope
        ));
        return tokenId;
    }

    public List<StoredConnection> list(long userId, long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, provider, label, token_prefix, expires_at, last_used_at, revoked_at, created_at
                FROM ai_access_tokens
                WHERE user_id = ? AND company_id = ?
                ORDER BY created_at DESC, id DESC
                """,
            (rs, rowNum) -> new StoredConnectionRow(
                rs.getLong("id"),
                rs.getString("provider"),
                rs.getString("label"),
                rs.getString("token_prefix"),
                toInstant(rs.getTimestamp("expires_at")),
                toInstant(rs.getTimestamp("last_used_at")),
                toInstant(rs.getTimestamp("revoked_at")),
                toInstant(rs.getTimestamp("created_at"))
            ),
            userId,
            companyId
        );
        return rows.stream().map(row -> new StoredConnection(
            row.id(),
            row.provider(),
            row.label(),
            row.tokenPrefix(),
            row.expiresAt(),
            row.lastUsedAt(),
            row.revokedAt(),
            row.createdAt(),
            scopes(row.id())
        )).toList();
    }

    public int revoke(long tokenId, long userId, long companyId, Instant now) {
        return jdbcTemplate.update(
            """
                UPDATE ai_access_tokens
                SET revoked_at = ?
                WHERE id = ?
                  AND user_id = ?
                  AND company_id = ?
                  AND revoked_at IS NULL
                """,
            Timestamp.from(now),
            tokenId,
            userId,
            companyId
        );
    }

    public int rotate(
        long tokenId,
        AuthSessionUser owner,
        String tokenPrefix,
        String tokenHash,
        Instant expiresAt,
        Set<String> scopes
    ) {
        var updated = jdbcTemplate.update(
            """
                UPDATE ai_access_tokens
                SET token_prefix = ?, token_hash = ?, expires_at = ?, last_used_at = NULL
                WHERE id = ?
                  AND user_id = ?
                  AND company_id = ?
                  AND user_company_id = ?
                  AND revoked_at IS NULL
                """,
            tokenPrefix,
            tokenHash,
            Timestamp.from(expiresAt),
            tokenId,
            owner.userId(),
            owner.companyId(),
            owner.userCompanyId()
        );
        if (updated != 1) return updated;
        jdbcTemplate.update("DELETE FROM ai_access_token_scopes WHERE token_id = ?", tokenId);
        scopes.forEach(scope -> jdbcTemplate.update(
            "INSERT INTO ai_access_token_scopes (token_id, scope_code) VALUES (?, ?)",
            tokenId,
            scope
        ));
        return updated;
    }

    public Optional<StoredToken> findActiveByHash(String tokenHash, Instant now) {
        var rows = jdbcTemplate.query(
            """
                SELECT token_row.id,
                       token_row.user_id,
                       token_row.company_id,
                       token_row.user_company_id,
                       COALESCE(user_row.full_name, user_row.email) AS user_name,
                       membership.role
                FROM ai_access_tokens token_row
                INNER JOIN users user_row ON user_row.id = token_row.user_id
                INNER JOIN companies company_row ON company_row.id = token_row.company_id
                INNER JOIN user_companies membership
                    ON membership.id = token_row.user_company_id
                   AND membership.user_id = token_row.user_id
                   AND membership.company_id = token_row.company_id
                WHERE token_row.token_hash = ?
                  AND token_row.revoked_at IS NULL
                  AND token_row.expires_at > ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND COALESCE(company_row.platform_status, 'ACTIVE') = 'ACTIVE'
                LIMIT 1
                """,
            (rs, rowNum) -> new StoredTokenRow(
                rs.getLong("id"),
                new AuthSessionUser(
                    rs.getLong("user_id"),
                    rs.getLong("company_id"),
                    rs.getLong("user_company_id"),
                    rs.getString("user_name"),
                    rs.getString("role")
                )
            ),
            tokenHash,
            Timestamp.from(now)
        );
        return rows.stream().findFirst().map(row -> new StoredToken(
            row.id(),
            row.user(),
            scopes(row.id())
        ));
    }

    public void markUsed(long tokenId, Instant now) {
        jdbcTemplate.update(
            """
                UPDATE ai_access_tokens
                SET last_used_at = ?
                WHERE id = ?
                  AND revoked_at IS NULL
                  AND (last_used_at IS NULL OR last_used_at < ?)
                """,
            Timestamp.from(now),
            tokenId,
            Timestamp.from(now.minusSeconds(300))
        );
    }

    private Set<String> scopes(long tokenId) {
        return jdbcTemplate.query(
            "SELECT scope_code FROM ai_access_token_scopes WHERE token_id = ? ORDER BY scope_code",
            (rs, rowNum) -> rs.getString("scope_code"),
            tokenId
        ).stream().collect(Collectors.toUnmodifiableSet());
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    public record StoredConnection(
        long id,
        String provider,
        String label,
        String tokenPrefix,
        Instant expiresAt,
        Instant lastUsedAt,
        Instant revokedAt,
        Instant createdAt,
        Set<String> scopes
    ) {
    }

    public record StoredToken(long id, AuthSessionUser user, Set<String> scopes) {
    }

    private record StoredTokenRow(long id, AuthSessionUser user) {
    }

    private record StoredConnectionRow(
        long id,
        String provider,
        String label,
        String tokenPrefix,
        Instant expiresAt,
        Instant lastUsedAt,
        Instant revokedAt,
        Instant createdAt
    ) {
    }
}
