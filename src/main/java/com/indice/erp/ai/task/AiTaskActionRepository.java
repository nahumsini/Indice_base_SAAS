package com.indice.erp.ai.task;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskDraft;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskResult;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AiTaskActionRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AiTaskActionRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public long insertConfirmation(
        AiAccessTokenRepository.StoredToken token,
        String confirmationHash,
        String fingerprint,
        TaskDraft draft,
        Instant expiresAt
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO ai_action_confirmations
                    (access_token_id, company_id, user_id, user_company_id, tool_name,
                     confirmation_hash, request_fingerprint, normalized_args_json,
                     task_title, task_description, task_priority, task_due_date, expires_at)
                    VALUES (?, ?, ?, ?, '%s', ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?)
                    """.formatted(confirmationTool(draft)),
                new String[] {"id"}
            );
            statement.setLong(1, token.id());
            statement.setLong(2, token.user().companyId());
            statement.setLong(3, token.user().userId());
            statement.setLong(4, token.user().userCompanyId());
            statement.setString(5, confirmationHash);
            statement.setString(6, fingerprint);
            statement.setString(7, json(draft));
            // Legacy summary columns are narrower than Tasks; the immutable JSON keeps the full values.
            statement.setString(8, truncate(draft.title(), 180));
            statement.setString(9, truncate(draft.description(), 2000));
            statement.setString(10, draft.priority());
            statement.setDate(11, draft.dueDate() == null ? null : Date.valueOf(draft.dueDate()));
            statement.setTimestamp(12, Timestamp.from(expiresAt));
            return statement;
        }, keyHolder);
        var key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Task confirmation could not be created.");
        }
        return key.longValue();
    }

    public Optional<Confirmation> findConfirmation(String confirmationHash) {
        return jdbcTemplate.query(
            """
                SELECT id, access_token_id, company_id, user_id, user_company_id,
                       request_fingerprint, normalized_args_json, task_title,
                       task_description, task_priority, task_due_date, expires_at, consumed_at
                FROM ai_action_confirmations
                WHERE confirmation_hash = ? AND tool_name IN ('create_task', 'create_task_v2', 'update_task')
                LIMIT 1
                """,
            (rs, rowNum) -> new Confirmation(
                rs.getLong("id"),
                rs.getLong("access_token_id"),
                rs.getLong("company_id"),
                rs.getLong("user_id"),
                rs.getLong("user_company_id"),
                rs.getString("request_fingerprint"),
                rs.getString("normalized_args_json"),
                parseDraft(rs.getString("normalized_args_json")),
                rs.getTimestamp("expires_at").toInstant(),
                instant(rs.getTimestamp("consumed_at"))
            ),
            confirmationHash
        ).stream().findFirst();
    }

    public int consumeConfirmation(long confirmationId, Instant now) {
        return jdbcTemplate.update(
            """
                UPDATE ai_action_confirmations
                SET consumed_at = ?
                WHERE id = ? AND consumed_at IS NULL AND expires_at > ?
                """,
            Timestamp.from(now),
            confirmationId,
            Timestamp.from(now)
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
                     tool_name, idempotency_key_hash, request_fingerprint, correlation_id,
                     risk_level, status)
                    VALUES (?, ?, ?, ?, ?, '%s', ?, ?, ?, 1, 'PENDING')
                    """.formatted(confirmation.draft().tool()),
                new String[] {"id"}
            );
            statement.setLong(1, confirmation.id());
            statement.setLong(2, token.id());
            statement.setLong(3, token.user().companyId());
            statement.setLong(4, token.user().userId());
            statement.setLong(5, token.user().userCompanyId());
            statement.setString(6, idempotencyHash);
            statement.setString(7, confirmation.fingerprint());
            statement.setString(8, correlationId);
            return statement;
        }, keyHolder);
        var key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Task execution could not be reserved.");
        }
        return key.longValue();
    }

    public Optional<Execution> findExecution(long companyId, long userId, String idempotencyHash) {
        return findExecution(companyId, userId, "create_task", idempotencyHash);
    }

    public Optional<Execution> findExecution(long companyId, long userId, String tool, String idempotencyHash) {
        return jdbcTemplate.query(
            """
                SELECT id, confirmation_id, request_fingerprint, correlation_id, status,
                       result_task_id, result_folio, result_title, result_status, result_due_date, result_json
                FROM ai_action_executions
                WHERE company_id = ? AND user_id = ?
                  AND tool_name = ? AND idempotency_key_hash = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new Execution(
                rs.getLong("id"),
                rs.getLong("confirmation_id"),
                rs.getString("request_fingerprint"),
                rs.getString("correlation_id"),
                rs.getString("status"),
                rs.getObject("result_task_id", Long.class),
                rs.getString("result_folio"),
                rs.getString("result_title"),
                rs.getString("result_status"),
                localDate(rs.getDate("result_due_date")),
                parseResult(rs.getString("result_json"))
            ),
            companyId,
            userId,
            tool,
            idempotencyHash
        ).stream().findFirst();
    }

    public int completeExecution(long executionId, TaskResult result, Instant now) {
        return jdbcTemplate.update(
            """
                UPDATE ai_action_executions
                SET status = 'COMPLETED', result_task_id = ?, result_folio = ?,
                    result_title = ?, result_status = ?, result_due_date = ?, result_json = CAST(? AS JSON), completed_at = ?
                WHERE id = ? AND status = 'PENDING'
                """,
            result.id(),
            result.folio(),
            truncate(result.title(), 180),
            result.status(),
            result.dueDate() == null ? null : Date.valueOf(result.dueDate()),
            json(result),
            Timestamp.from(now),
            executionId
        );
    }

    public void insertAudit(
        AiAccessTokenRepository.StoredToken token,
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
                 idempotency_key_hash, normalized_args_json, result_json,
                 error_code, error_message_safe)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?,
                        CAST(? AS JSON), CAST(? AS JSON), ?, ?)
                """,
            confirmationId,
            token.id(),
            token.user().companyId(),
            token.user().userId(),
            token.user().userCompanyId(),
            normalizedArgs instanceof TaskDraft draft ? draft.tool() : "create_task",
            eventType,
            outcome,
            correlationId,
            idempotencyHash,
            normalizedArgs == null ? null : json(normalizedArgs),
            result == null ? null : json(result),
            errorCode,
            truncate(errorMessage, 255)
        );
    }

    private static String confirmationTool(TaskDraft draft) {
        // Older releases reconstruct create_task confirmations as self-assigned. Keep explicit
        // assignments invisible to that reader so rollback rejects rather than changes the assignee.
        return draft.taskId() == null && draft.assigneeUserCompanyId() != null ? "create_task_v2" : draft.tool();
    }

    private TaskDraft parseDraft(String value) {
        try { return objectMapper.readValue(value, TaskDraft.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored task confirmation is invalid.", exception); }
    }

    private TaskResult parseResult(String value) {
        if (value == null) return null;
        try { return objectMapper.readValue(value, TaskResult.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored task result is invalid.", exception); }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI action audit serialization failed.", exception);
        }
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private static LocalDate localDate(Date value) {
        return value == null ? null : value.toLocalDate();
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    public record Confirmation(
        long id,
        long accessTokenId,
        long companyId,
        long userId,
        long userCompanyId,
        String fingerprint,
        String normalizedArgsJson,
        TaskDraft draft,
        Instant expiresAt,
        Instant consumedAt
    ) {
    }

    public record Execution(
        long id,
        long confirmationId,
        String fingerprint,
        String correlationId,
        String status,
        Long taskId,
        String folio,
        String title,
        String taskStatus,
        LocalDate dueDate,
        TaskResult storedResult
    ) {
        public Execution(long id, long confirmationId, String fingerprint, String correlationId, String status,
                Long taskId, String folio, String title, String taskStatus, LocalDate dueDate) {
            this(id, confirmationId, fingerprint, correlationId, status, taskId, folio, title, taskStatus, dueDate, null);
        }
        public TaskResult result() {
            return storedResult != null ? storedResult : new TaskResult(taskId == null ? 0 : taskId, folio, title, taskStatus, dueDate);
        }
    }
}
