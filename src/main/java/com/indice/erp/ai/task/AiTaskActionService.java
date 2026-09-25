package com.indice.erp.ai.task;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.CommitResponse;
import com.indice.erp.ai.task.AiTaskActionContracts.PreviewRequest;
import com.indice.erp.ai.task.AiTaskActionContracts.PreviewResponse;
import com.indice.erp.ai.task.AiTaskActionContracts.TaskDraft;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class AiTaskActionService {

    private static final String CONFIRMATION_PREFIX = "idx_confirm_";
    private static final int CONFIRMATION_BYTES = 32;
    private static final Duration CONFIRMATION_TTL = Duration.ofMinutes(5);

    private final AiTaskActionRepository repository;
    private final AiTaskActionExecutionService executionService;
    private final AiTaskActionAuditService auditService;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final AiTaskDraftService drafts;
    private final SecureRandom secureRandom = new SecureRandom();

    public AiTaskActionService(
        AiTaskActionRepository repository,
        AiTaskActionExecutionService executionService,
        AiTaskActionAuditService auditService,
        ObjectMapper objectMapper,
        Clock clock,
        AiTaskDraftService drafts
    ) {
        this.repository = repository;
        this.executionService = executionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.drafts = drafts;
    }

    public PreviewResponse preview(AiAccessTokenRepository.StoredToken token, PreviewRequest request) {
        AiTaskDraftService.requireScope(token, "tasks.create");
        return storePreview(token, drafts.create(token, request), null);
    }

    public PreviewResponse previewUpdate(AiAccessTokenRepository.StoredToken token, AiTaskActionContracts.UpdateRequest request) {
        var edit = drafts.edit(token, request);
        return storePreview(token, edit.after(), edit.before());
    }

    private PreviewResponse storePreview(AiAccessTokenRepository.StoredToken token, TaskDraft draft, TaskDraft before) {
        var rawConfirmation = generateConfirmationToken();
        var fingerprint = sha256Hex(json(draft));
        var expiresAt = clock.instant().plus(CONFIRMATION_TTL);
        var confirmationId = repository.insertConfirmation(
            token,
            sha256Hex(rawConfirmation),
            fingerprint,
            draft,
            expiresAt
        );
        auditService.record(
            token,
            confirmationId,
            "PREVIEW",
            "SUCCESS",
            UUID.randomUUID().toString(),
            null,
            draft,
            null,
            null,
            null
        );
        return new PreviewResponse(rawConfirmation, expiresAt, true, draft, before);
    }

    public CommitResponse commit(AiAccessTokenRepository.StoredToken token, CommitRequest request) {
        return commit(token, request, "create_task");
    }

    public CommitResponse commitUpdate(AiAccessTokenRepository.StoredToken token, CommitRequest request) {
        return commit(token, request, "update_task");
    }

    private CommitResponse commit(AiAccessTokenRepository.StoredToken token, CommitRequest request, String tool) {
        if (request == null) {
            throw new IllegalArgumentException("Confirmation and idempotency key are required.");
        }
        var confirmationToken = normalizeConfirmationToken(request.confirmationToken());
        var idempotencyKey = normalizeIdempotencyKey(request.idempotencyKey());
        var confirmation = repository.findConfirmation(sha256Hex(confirmationToken))
            .orElseThrow(() -> conflict("confirmation_invalid", "The confirmation is invalid. Prepare the task again."));
        requireBoundIdentity(token, confirmation);
        if (!tool.equals(confirmation.draft().tool())) throw conflict("confirmation_tool_mismatch", "Confirmation belongs to another action.");
        AiTaskDraftService.requireCommitScopes(token, confirmation.draft());

        var idempotencyHash = sha256Hex(idempotencyKey);
        var existing = repository.findExecution(
            token.user().companyId(),
            token.user().userId(),
            tool,
            idempotencyHash
        );
        if (existing.isPresent()) {
            return replay(token, confirmation, idempotencyHash, existing.get());
        }
        if (confirmation.consumedAt() != null) {
            throw conflict("confirmation_used", "The confirmation was already used. Prepare the task again.");
        }
        if (!confirmation.expiresAt().isAfter(clock.instant())) {
            throw conflict("confirmation_expired", "The confirmation expired. Prepare the task again.");
        }

        var correlationId = UUID.randomUUID().toString();
        try {
            return executionService.execute(token, confirmation, idempotencyHash, correlationId);
        } catch (DuplicateKeyException exception) {
            var concurrent = repository.findExecution(
                token.user().companyId(),
                token.user().userId(),
                tool,
                idempotencyHash
            ).orElseThrow(() -> exception);
            return replay(token, confirmation, idempotencyHash, concurrent);
        } catch (RuntimeException exception) {
            auditService.record(
                token,
                confirmation.id(),
                "COMMIT",
                "FAILURE",
                correlationId,
                idempotencyHash,
                confirmation.draft(),
                null,
                errorCode(exception),
                exception.getMessage()
            );
            throw exception;
        }
    }

    private CommitResponse replay(
        AiAccessTokenRepository.StoredToken token,
        AiTaskActionRepository.Confirmation confirmation,
        String idempotencyHash,
        AiTaskActionRepository.Execution execution
    ) {
        if (execution.confirmationId() != confirmation.id()
            || !execution.fingerprint().equals(confirmation.fingerprint())) {
            throw conflict(
                "idempotency_key_conflict",
                "That idempotency key was already used for a different task."
            );
        }
        if (!"COMPLETED".equals(execution.status()) || execution.taskId() == null) {
            throw conflict("action_in_progress", "The task creation is still being processed. Try again shortly.");
        }
        drafts.requireResultAccess(token, execution.taskId());
        var response = new CommitResponse(true, execution.correlationId(), execution.result());
        auditService.record(
            token,
            confirmation.id(),
            "COMMIT",
            "REPLAY",
            execution.correlationId(),
            idempotencyHash,
            confirmation.draft(),
            response.task(),
            null,
            null
        );
        return response;
    }

    private void requireBoundIdentity(
        AiAccessTokenRepository.StoredToken token,
        AiTaskActionRepository.Confirmation confirmation
    ) {
        if (confirmation.accessTokenId() != token.id()
            || confirmation.companyId() != token.user().companyId()
            || confirmation.userId() != token.user().userId()
            || confirmation.userCompanyId() != token.user().userCompanyId()) {
            throw conflict("confirmation_identity_mismatch", "The confirmation does not belong to this connection.");
        }
    }

    private String normalizeConfirmationToken(String value) {
        var normalized = requiredText(value, "confirmationToken", 128);
        if (!normalized.startsWith(CONFIRMATION_PREFIX) || normalized.contains(" ")) {
            throw new IllegalArgumentException("confirmationToken is invalid.");
        }
        return normalized;
    }

    private String normalizeIdempotencyKey(String value) {
        var normalized = requiredText(value, "idempotencyKey", 128);
        if (normalized.length() < 8) {
            throw new IllegalArgumentException("idempotencyKey must contain at least 8 characters.");
        }
        return normalized;
    }

    private String requiredText(String value, String field, int maxLength) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException(field + " is required.");
        }
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(field + " must not exceed " + maxLength + " characters.");
        }
        return normalized;
    }

    private String generateConfirmationToken() {
        var bytes = new byte[CONFIRMATION_BYTES];
        secureRandom.nextBytes(bytes);
        return CONFIRMATION_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Task confirmation serialization failed.", exception);
        }
    }

    private String sha256Hex(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private AiTaskActionConflictException conflict(String code, String message) {
        return new AiTaskActionConflictException(code, message);
    }

    private String errorCode(RuntimeException exception) {
        if (exception instanceof AiTaskActionConflictException conflictException) {
            return conflictException.code();
        }
        if (exception instanceof IllegalArgumentException) {
            return "invalid_request";
        }
        return "action_failed";
    }
}
