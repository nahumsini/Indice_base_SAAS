package com.indice.erp.ai.oauth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AiOAuthRepository {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() { };

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AiOAuthRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public RegisteredClient registerOrReuse(String clientId, String clientName, String metadataHash, List<String> redirectUris) {
        try {
            jdbcTemplate.update(
                """
                    INSERT INTO ai_oauth_clients (client_id, client_name, metadata_hash, redirect_uris)
                    VALUES (?, ?, ?, CAST(? AS JSON))
                    """,
                clientId, clientName, metadataHash, json(redirectUris)
            );
        } catch (DuplicateKeyException ignored) {
            // Dynamic registration is idempotent for the exact same validated client metadata.
        }
        return findByMetadataHash(metadataHash)
            .orElseThrow(() -> new IllegalStateException("OAuth client registration could not be completed."));
    }

    public Optional<RegisteredClient> findActiveClient(String clientId) {
        return jdbcTemplate.query(
            """
                SELECT client_id, client_name, redirect_uris, created_at
                FROM ai_oauth_clients
                WHERE client_id = ? AND disabled_at IS NULL
                LIMIT 1
                """,
            (rs, rowNum) -> new RegisteredClient(
                rs.getString("client_id"),
                rs.getString("client_name"),
                strings(rs.getString("redirect_uris")),
                rs.getTimestamp("created_at").toInstant()
            ),
            clientId
        ).stream().findFirst();
    }

    public void insertAuthorizationCode(
        String codeHash,
        RegisteredClient client,
        AuthSessionUser user,
        String redirectUri,
        String resource,
        Set<String> scopes,
        String codeChallenge,
        Instant expiresAt
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO ai_oauth_authorization_codes
                    (code_hash, client_id, user_id, company_id, user_company_id, redirect_uri,
                     resource_uri, scopes, code_challenge, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
                """,
            codeHash,
            client.clientId(),
            user.userId(),
            user.companyId(),
            user.userCompanyId(),
            redirectUri,
            resource,
            json(scopes.stream().sorted().toList()),
            codeChallenge,
            Timestamp.from(expiresAt)
        );
    }

    public Optional<StoredAuthorizationCode> findForUpdate(String codeHash) {
        return jdbcTemplate.query(
            """
                SELECT authorization_code.id,
                       authorization_code.client_id,
                       authorization_code.redirect_uri,
                       authorization_code.resource_uri,
                       authorization_code.scopes,
                       authorization_code.code_challenge,
                       authorization_code.expires_at,
                       authorization_code.used_at,
                       authorization_code.user_id,
                       authorization_code.company_id,
                       authorization_code.user_company_id,
                       COALESCE(user_row.full_name, user_row.email) AS user_name,
                       membership.role
                FROM ai_oauth_authorization_codes authorization_code
                INNER JOIN users user_row ON user_row.id = authorization_code.user_id
                INNER JOIN companies company_row ON company_row.id = authorization_code.company_id
                INNER JOIN user_companies membership
                    ON membership.id = authorization_code.user_company_id
                   AND membership.user_id = authorization_code.user_id
                   AND membership.company_id = authorization_code.company_id
                WHERE authorization_code.code_hash = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND COALESCE(company_row.platform_status, 'ACTIVE') = 'ACTIVE'
                LIMIT 1
                FOR UPDATE
                """,
            (rs, rowNum) -> new StoredAuthorizationCode(
                rs.getLong("id"),
                rs.getString("client_id"),
                rs.getString("redirect_uri"),
                rs.getString("resource_uri"),
                Set.copyOf(strings(rs.getString("scopes"))),
                rs.getString("code_challenge"),
                rs.getTimestamp("expires_at").toInstant(),
                rs.getTimestamp("used_at") == null ? null : rs.getTimestamp("used_at").toInstant(),
                new AuthSessionUser(
                    rs.getLong("user_id"),
                    rs.getLong("company_id"),
                    rs.getLong("user_company_id"),
                    rs.getString("user_name"),
                    rs.getString("role")
                )
            ),
            codeHash
        ).stream().findFirst();
    }

    public void markAuthorizationCodeUsed(long id, Instant now) {
        var updated = jdbcTemplate.update(
            "UPDATE ai_oauth_authorization_codes SET used_at = ? WHERE id = ? AND used_at IS NULL",
            Timestamp.from(now), id
        );
        if (updated != 1) throw new IllegalArgumentException("invalid_grant");
    }

    public void markClientUsed(String clientId, Instant now) {
        jdbcTemplate.update(
            "UPDATE ai_oauth_clients SET last_used_at = ? WHERE client_id = ? AND disabled_at IS NULL",
            Timestamp.from(now), clientId
        );
    }

    private Optional<RegisteredClient> findByMetadataHash(String metadataHash) {
        return jdbcTemplate.query(
            """
                SELECT client_id, client_name, redirect_uris, created_at
                FROM ai_oauth_clients
                WHERE metadata_hash = ? AND disabled_at IS NULL
                LIMIT 1
                """,
            (rs, rowNum) -> new RegisteredClient(
                rs.getString("client_id"),
                rs.getString("client_name"),
                strings(rs.getString("redirect_uris")),
                rs.getTimestamp("created_at").toInstant()
            ),
            metadataHash
        ).stream().findFirst();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("OAuth metadata could not be serialized.", exception);
        }
    }

    private List<String> strings(String value) {
        try {
            return objectMapper.readValue(value, STRING_LIST);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored OAuth metadata is invalid.", exception);
        }
    }

    public record RegisteredClient(String clientId, String clientName, List<String> redirectUris, Instant createdAt) { }

    public record StoredAuthorizationCode(
        long id,
        String clientId,
        String redirectUri,
        String resource,
        Set<String> scopes,
        String codeChallenge,
        Instant expiresAt,
        Instant usedAt,
        AuthSessionUser user
    ) { }
}
