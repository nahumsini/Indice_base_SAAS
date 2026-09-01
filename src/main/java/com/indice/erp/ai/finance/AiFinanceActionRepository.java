package com.indice.erp.ai.finance;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AiFinanceActionRepository {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AiFinanceActionRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public long insertConfirmation(
        AiAccessTokenRepository.StoredToken token,
        String tool,
        String confirmationHash,
        String fingerprint,
        Map<String, Object> normalized,
        Instant expiresAt
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO ai_action_confirmations
                    (access_token_id, company_id, user_id, user_company_id, tool_name,
                     confirmation_hash, request_fingerprint, normalized_args_json, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, token.id());
            statement.setLong(2, token.user().companyId());
            statement.setLong(3, token.user().userId());
            statement.setLong(4, token.user().userCompanyId());
            statement.setString(5, tool);
            statement.setString(6, confirmationHash);
            statement.setString(7, fingerprint);
            statement.setString(8, json(normalized));
            statement.setTimestamp(9, Timestamp.from(expiresAt));
            return statement;
        }, keyHolder);
        if (keyHolder.getKey() == null) throw new IllegalStateException("Action confirmation could not be created.");
        return keyHolder.getKey().longValue();
    }

    public Optional<Confirmation> findConfirmation(String confirmationHash) {
        return jdbcTemplate.query(
            """
                SELECT id, access_token_id, company_id, user_id, user_company_id, tool_name,
                       request_fingerprint, normalized_args_json, expires_at, consumed_at
                FROM ai_action_confirmations
                WHERE confirmation_hash = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new Confirmation(
                rs.getLong("id"), rs.getLong("access_token_id"), rs.getLong("company_id"),
                rs.getLong("user_id"), rs.getLong("user_company_id"), rs.getString("tool_name"),
                rs.getString("request_fingerprint"), parse(rs.getString("normalized_args_json")),
                rs.getTimestamp("expires_at").toInstant(), instant(rs.getTimestamp("consumed_at"))
            ),
            confirmationHash
        ).stream().findFirst();
    }

    public int consumeConfirmation(long confirmationId, Instant now) {
        return jdbcTemplate.update(
            "UPDATE ai_action_confirmations SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?",
            Timestamp.from(now), confirmationId, Timestamp.from(now)
        );
    }

    public long insertPendingExecution(
        AiAccessTokenRepository.StoredToken token,
        Confirmation confirmation,
        String idempotencyHash,
        String correlationId
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO ai_action_executions
                    (confirmation_id, access_token_id, company_id, user_id, user_company_id,
                     tool_name, idempotency_key_hash, request_fingerprint, correlation_id, risk_level, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, 'PENDING')
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, confirmation.id());
            statement.setLong(2, token.id());
            statement.setLong(3, token.user().companyId());
            statement.setLong(4, token.user().userId());
            statement.setLong(5, token.user().userCompanyId());
            statement.setString(6, confirmation.tool());
            statement.setString(7, idempotencyHash);
            statement.setString(8, confirmation.fingerprint());
            statement.setString(9, correlationId);
            return statement;
        }, keyHolder);
        if (keyHolder.getKey() == null) throw new IllegalStateException("Action execution could not be reserved.");
        return keyHolder.getKey().longValue();
    }

    public Optional<Execution> findExecution(long companyId, long userId, String tool, String idempotencyHash) {
        return jdbcTemplate.query(
            """
                SELECT id, confirmation_id, request_fingerprint, correlation_id, status, result_json
                FROM ai_action_executions
                WHERE company_id = ? AND user_id = ? AND tool_name = ? AND idempotency_key_hash = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new Execution(
                rs.getLong("id"), rs.getLong("confirmation_id"), rs.getString("request_fingerprint"),
                rs.getString("correlation_id"), rs.getString("status"), parse(rs.getString("result_json"))
            ),
            companyId, userId, tool, idempotencyHash
        ).stream().findFirst();
    }

    public int completeExecution(long executionId, Map<String, Object> result, Instant now) {
        return jdbcTemplate.update(
            "UPDATE ai_action_executions SET status = 'COMPLETED', result_json = CAST(? AS JSON), completed_at = ? WHERE id = ? AND status = 'PENDING'",
            json(result), Timestamp.from(now), executionId
        );
    }

    public void insertAudit(
        AiAccessTokenRepository.StoredToken token,
        String tool,
        Long confirmationId,
        String eventType,
        String outcome,
        String correlationId,
        String idempotencyHash,
        Object normalizedArgs,
        Object result,
        String errorCode,
        String errorMessage
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO ai_action_audit_events
                (confirmation_id, access_token_id, company_id, user_id, user_company_id,
                 tool_name, event_type, outcome, risk_level, correlation_id,
                 idempotency_key_hash, normalized_args_json, result_json, error_code, error_message_safe)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?)
                """,
            confirmationId, token.id(), token.user().companyId(), token.user().userId(), token.user().userCompanyId(),
            tool, eventType, outcome, correlationId, idempotencyHash,
            normalizedArgs == null ? null : json(normalizedArgs), result == null ? null : json(result),
            errorCode, truncate(errorMessage, 255)
        );
    }

    private String json(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("AI action serialization failed.", exception); }
    }

    private Map<String, Object> parse(String value) {
        if (value == null || value.isBlank()) return new LinkedHashMap<>();
        try { return objectMapper.readValue(value, MAP_TYPE); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored AI action is invalid.", exception); }
    }

    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }

    private static String truncate(String value, int maxLength) {
        return value == null || value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    public record Confirmation(
        long id, long accessTokenId, long companyId, long userId, long userCompanyId,
        String tool, String fingerprint, Map<String, Object> normalizedArgs,
        Instant expiresAt, Instant consumedAt
    ) { }

    public record Execution(
        long id, long confirmationId, String fingerprint, String correlationId,
        String status, Map<String, Object> result
    ) { }
}
