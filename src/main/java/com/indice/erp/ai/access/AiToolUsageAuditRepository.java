package com.indice.erp.ai.access;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AiToolUsageAuditRepository {

    private final JdbcTemplate jdbcTemplate;

    public AiToolUsageAuditRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void insert(
        AiAccessTokenRepository.StoredToken token,
        String toolName,
        String outcome,
        int statusCode,
        Instant occurredAt
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO ai_tool_usage_events
                (access_token_id, company_id, user_id, user_company_id,
                 tool_name, operation_type, outcome, status_code, occurred_at)
                VALUES (?, ?, ?, ?, ?, 'READ', ?, ?, ?)
                """,
            token.id(), token.user().companyId(), token.user().userId(), token.user().userCompanyId(),
            toolName, outcome, statusCode, Timestamp.from(occurredAt)
        );
    }

    public List<AiConnectionActivityService.ActivityEvent> listReadEvents(
        long connectionId,
        long ownerUserId,
        long companyId,
        int limit
    ) {
        return jdbcTemplate.query(
            """
                SELECT event_row.id, event_row.tool_name, event_row.operation_type,
                       event_row.outcome, event_row.status_code, event_row.occurred_at
                FROM ai_tool_usage_events event_row
                INNER JOIN ai_access_tokens token_row ON token_row.id = event_row.access_token_id
                WHERE event_row.access_token_id = ?
                  AND token_row.user_id = ?
                  AND token_row.company_id = ?
                ORDER BY event_row.occurred_at DESC, event_row.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> new AiConnectionActivityService.ActivityEvent(
                "read-" + rs.getLong("id"),
                "READ",
                rs.getString("tool_name"),
                rs.getString("operation_type"),
                rs.getString("outcome"),
                rs.getInt("status_code"),
                0,
                rs.getTimestamp("occurred_at").toInstant()
            ),
            connectionId, ownerUserId, companyId, limit
        );
    }

    public List<AiConnectionActivityService.ActivityEvent> listActionEvents(
        long connectionId,
        long ownerUserId,
        long companyId,
        int limit
    ) {
        return jdbcTemplate.query(
            """
                SELECT event_row.id, event_row.tool_name, event_row.event_type,
                       event_row.outcome, event_row.risk_level, event_row.created_at
                FROM ai_action_audit_events event_row
                INNER JOIN ai_access_tokens token_row ON token_row.id = event_row.access_token_id
                WHERE event_row.access_token_id = ?
                  AND token_row.user_id = ?
                  AND token_row.company_id = ?
                ORDER BY event_row.created_at DESC, event_row.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> new AiConnectionActivityService.ActivityEvent(
                "action-" + rs.getLong("id"),
                "ACTION",
                rs.getString("tool_name"),
                rs.getString("event_type"),
                rs.getString("outcome"),
                null,
                rs.getInt("risk_level"),
                rs.getTimestamp("created_at").toInstant()
            ),
            connectionId, ownerUserId, companyId, limit
        );
    }

    public boolean connectionBelongsTo(long connectionId, long ownerUserId, long companyId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM ai_access_tokens WHERE id = ? AND user_id = ? AND company_id = ?",
            Integer.class,
            connectionId,
            ownerUserId,
            companyId
        );
        return count != null && count > 0;
    }
}
