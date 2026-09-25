package com.indice.erp.workspace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class UserWorkspaceStateService {

    private static final Pattern KEY_PATTERN = Pattern.compile("[a-z0-9][a-z0-9_-]{0,79}");
    private static final int MAX_STATE_BYTES = 64 * 1024;
    private static final int RETENTION_DAYS = 90;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public UserWorkspaceStateService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> get(long companyId, long userId, String moduleKey, String tabKey) {
        var scope = validatedScope(moduleKey, tabKey);
        var rows = jdbcTemplate.query(
            """
                SELECT state_json, schema_version, updated_at
                FROM user_workspace_states
                WHERE company_id = ? AND user_id = ? AND module_key = ? AND tab_key = ?
                  AND (expires_at IS NULL OR expires_at > NOW())
                LIMIT 1
                """,
            (resultSet, rowNumber) -> new WorkspaceRow(
                resultSet.getString("state_json"),
                resultSet.getInt("schema_version"),
                resultSet.getTimestamp("updated_at")
            ),
            companyId,
            userId,
            scope.moduleKey(),
            scope.tabKey()
        );

        return rows.stream().findFirst()
            .map(this::response)
            .orElseGet(() -> Map.of(
                "state", objectMapper.createObjectNode(),
                "schemaVersion", 1
            ));
    }

    public Map<String, Object> save(
        long companyId,
        long userId,
        String moduleKey,
        String tabKey,
        JsonNode state,
        Integer schemaVersion
    ) {
        var scope = validatedScope(moduleKey, tabKey);
        if (state == null || !state.isObject()) {
            throw new IllegalArgumentException("state must be a JSON object.");
        }

        var serializedState = serialize(state);
        if (serializedState.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_STATE_BYTES) {
            throw new IllegalArgumentException("Workspace state exceeds the 64 KB limit.");
        }
        var resolvedSchemaVersion = schemaVersion == null ? 1 : Math.max(1, schemaVersion);
        // Column preferences last until the user changes them; navigation keeps its retention.
        Integer retentionDays = scope.moduleKey().equals("expenses") && scope.tabKey().equals("expenses-columns")
            ? null : RETENTION_DAYS;

        jdbcTemplate.update(
            """
                INSERT INTO user_workspace_states (
                    company_id, user_id, module_key, tab_key, state_json,
                    schema_version, last_used_at, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))
                ON DUPLICATE KEY UPDATE
                    state_json = VALUES(state_json),
                    schema_version = VALUES(schema_version),
                    last_used_at = NOW(),
                    expires_at = VALUES(expires_at),
                    updated_at = NOW()
                """,
            companyId,
            userId,
            scope.moduleKey(),
            scope.tabKey(),
            serializedState,
            resolvedSchemaVersion,
            retentionDays
        );

        return get(companyId, userId, scope.moduleKey(), scope.tabKey());
    }

    public void delete(long companyId, long userId, String moduleKey, String tabKey) {
        var scope = validatedScope(moduleKey, tabKey);
        jdbcTemplate.update(
            "DELETE FROM user_workspace_states WHERE company_id = ? AND user_id = ? AND module_key = ? AND tab_key = ?",
            companyId,
            userId,
            scope.moduleKey(),
            scope.tabKey()
        );
    }

    private WorkspaceScope validatedScope(String moduleKey, String tabKey) {
        var normalizedModuleKey = normalizeKey(moduleKey, "moduleKey");
        var normalizedTabKey = normalizeKey(tabKey, "tabKey");
        return new WorkspaceScope(normalizedModuleKey, normalizedTabKey);
    }

    private static String normalizeKey(String value, String field) {
        var normalized = Optional.ofNullable(value).orElse("").trim().toLowerCase();
        if (!KEY_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException(field + " is invalid.");
        }
        return normalized;
    }

    private String serialize(JsonNode state) {
        try {
            return objectMapper.writeValueAsString(state);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("state is not valid JSON.", ex);
        }
    }

    private Map<String, Object> response(WorkspaceRow row) {
        try {
            return Map.of(
                "state", objectMapper.readTree(row.stateJson()),
                "schemaVersion", row.schemaVersion(),
                "updatedAt", row.updatedAt().toInstant().toString()
            );
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Stored workspace state is invalid.", ex);
        }
    }

    private record WorkspaceScope(String moduleKey, String tabKey) {}

    private record WorkspaceRow(String stateJson, int schemaVersion, Timestamp updatedAt) {}
}
