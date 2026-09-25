package com.indice.erp.ai.commercial;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.sales.SalesAssistantService;
import com.indice.erp.sales.SalesAssistantContracts.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import static com.indice.erp.ai.commercial.AiCommercialContracts.*;

@Service
public class AiCommercialActionService {
    private final AiActionRepository repository;
    private final AiCommercialExecutionService execution;
    private final SalesAssistantService owner;
    private final AiCommercialAccess access;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    public AiCommercialActionService(AiActionRepository repository, AiCommercialExecutionService execution,
            SalesAssistantService owner, AiCommercialAccess access, ObjectMapper mapper, Clock clock) {
        this.repository = repository; this.execution = execution; this.owner = owner; this.access = access; this.mapper = mapper; this.clock = clock;
    }
    public Preview preview(StoredToken token, String tool, Change request) {
        access.require(token, tool);
        if (!AiCommercialAccess.ACTIONS.contains(tool)) throw new IllegalArgumentException("Unknown action.");
        var parts = tool.split("_");
        var prepared = owner.prepare(token.user(), parts[1], parts[0].equals("update"), request);
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        var rawToken = "idx_confirm_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expires = clock.instant().plus(Duration.ofMinutes(5));
        Map<String, Object> normalized = mapper.convertValue(prepared, new TypeReference<>() { });
        long id = repository.insertConfirmation(token, tool, hash(rawToken), hash(json(prepared)), normalized, expires);
        repository.insertAudit(token, tool, id, "PREVIEW", "SUCCESS", UUID.randomUUID().toString(), null,
            Map.of("kind", prepared.kind()), null, null, null);
        return new Preview(tool, rawToken, expires, true, prepared.before(), prepared.after(),
            List.of("Save this commercial record in Indice. No sale, payment, stock movement or customer message is generated."));
    }
    public Committed commit(StoredToken token, String tool, CommitRequest request) {
        access.require(token, tool);
        if (request == null || request.confirmationToken() == null || !request.confirmationToken().matches("idx_confirm_[A-Za-z0-9_-]{43}")
                || request.idempotencyKey() == null || request.idempotencyKey().length() < 8 || request.idempotencyKey().length() > 128 || request.idempotencyKey().isBlank())
            throw new IllegalArgumentException("Valid confirmation token and idempotency key required.");
        var confirmation = repository.findConfirmation(hash(request.confirmationToken())).orElseThrow(() -> new Conflict("confirmation_invalid"));
        if (!tool.equals(confirmation.tool()) || confirmation.accessTokenId() != token.id() || confirmation.companyId() != token.user().companyId()
                || confirmation.userId() != token.user().userId() || confirmation.userCompanyId() != token.user().userCompanyId()) throw new Conflict("confirmation_identity_mismatch");
        String key = hash(request.idempotencyKey());
        var existing = repository.findExecution(token.user().companyId(), token.user().userId(), tool, key);
        if (existing.isPresent()) return replay(token, confirmation, existing.get(), key);
        if (confirmation.consumedAt() != null) throw new Conflict("confirmation_used");
        if (!confirmation.expiresAt().isAfter(clock.instant())) throw new Conflict("confirmation_expired");
        try { return execution.execute(token, confirmation, key, UUID.randomUUID().toString()); }
        catch (DuplicateKeyException exception) {
            var concurrent = repository.findExecution(token.user().companyId(), token.user().userId(), tool, key).orElseThrow(() -> exception);
            return replay(token, confirmation, concurrent, key);
        }
    }
    private Committed replay(StoredToken token, AiActionRepository.Confirmation confirmation, AiActionRepository.Execution result, String key) {
        if (confirmation.id() != result.confirmationId() || !confirmation.fingerprint().equals(result.fingerprint())) throw new Conflict("idempotency_key_conflict");
        if (!result.status().equals("COMPLETED")) throw new Conflict("action_in_progress");
        var record = mapper.convertValue(result.result(), RecordView.class);
        owner.detail(token.user(), record.kind(), record.id()); // Recheck live visibility before returning prior data.
        repository.insertAudit(token, confirmation.tool(), confirmation.id(), "COMMIT", "REPLAY", result.correlationId(), key,
            Map.of("kind", record.kind()), Map.of("id", record.id()), null, null);
        return new Committed(confirmation.tool(), true, result.correlationId(), record);
    }
    private String json(Object value) { try { return mapper.writeValueAsString(value); } catch (Exception e) { throw new IllegalStateException("Invalid commercial confirmation.", e); } }
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException("SHA-256 unavailable.", e); }
    }
}
