package com.indice.erp.ai.mailing;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.sales.mailing.MailingAudienceContracts.*;
import com.indice.erp.sales.mailing.MailingAudienceService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiMailingListService {
    public static final String READ = "list_mailing_lists";
    public static final String ASSIGN = "assign_mailing_list_contacts";
    private static final String ACTION = "mailing_list_v1:" + ASSIGN;
    private final MailingAudienceService audience;
    private final AiToolAuthorizationService authorization;
    private final AiActionRepository actions;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final TransactionTemplate transaction;
    private final SecureRandom random = new SecureRandom();

    public AiMailingListService(MailingAudienceService audience, AiToolAuthorizationService authorization,
        AiActionRepository actions, ObjectMapper mapper, Clock clock, PlatformTransactionManager transactions) {
        this.audience = audience;
        this.authorization = authorization;
        this.actions = actions;
        this.mapper = mapper;
        this.clock = clock;
        transaction = new TransactionTemplate(transactions);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    public record Directory(List<SavedList> lists, Options filters, int total) { }
    public record Preview(SavedList list, List<AssignmentContact> additions, int alreadyInList,
        int projectedCount, String confirmationToken, Instant expiresAt, boolean confirmationRequired) { }
    public record Result(SavedList list, int added) { }
    public record Commit(Result result, boolean replayed, String correlationId) { }

    @Transactional(readOnly = true)
    public Directory list(StoredToken token, String search, int page) {
        requireAccess(token, false);
        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        var lists = audience.lists(token.user()).stream()
            .filter(list -> list.name().toLowerCase(Locale.ROOT).contains(query)).toList();
        int start = Math.min((page - 1) * 50, lists.size());
        return new Directory(lists.subList(start, Math.min(start + 50, lists.size())),
            audience.options(token.user()), lists.size());
    }

    @Transactional
    public Preview preview(StoredToken token, String listId, List<Long> ids, Filters filters) {
        requireAccess(token, true);
        var plan = audience.planAssignment(token.user(), listId, ids, filters);
        if (plan.additions().isEmpty()) {
            return new Preview(plan.list(), plan.additions(), plan.alreadyInList(), plan.projectedCount(), null, null, false);
        }

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String confirmation = "idx_confirm_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = clock.instant().plusSeconds(300);
        var assignment = plan.assignment();
        Map<String, Object> stored = mapper.convertValue(assignment, new TypeReference<>() {});
        long id = actions.insertConfirmation(token, ACTION, hash(confirmation),
            hash(assignment.listId() + ":" + assignment.version() + ":" + assignment.contactIds()), stored, expires);
        actions.insertAudit(token, ASSIGN, id, "PREVIEW", "SUCCESS", UUID.randomUUID().toString(), null,
            Map.of("listId", listId, "count", plan.additions().size()), null, null, null);
        return new Preview(plan.list(), plan.additions(), plan.alreadyInList(), plan.projectedCount(), confirmation, expires, true);
    }

    public Commit commit(StoredToken token, String confirmationToken, String idempotencyKey) {
        requireAccess(token, true);
        var confirmation = actions.findConfirmation(hash(confirmationToken)).orElseThrow(() -> conflict("confirmation_invalid"));
        if (!ACTION.equals(confirmation.tool()) || confirmation.accessTokenId() != token.id()
            || confirmation.companyId() != token.user().companyId() || confirmation.userId() != token.user().userId()
            || confirmation.userCompanyId() != token.user().userCompanyId()) {
            throw conflict("confirmation_identity_mismatch");
        }
        String key = hash(idempotencyKey);
        try {
            return transaction.execute(status -> execute(token, confirmation, key));
        } catch (DuplicateKeyException e) {
            return replay(token, confirmation, key);
        }
    }

    private Commit execute(StoredToken token, AiActionRepository.Confirmation confirmation, String key) {
        requireAccess(token, true);
        if (execution(token, key).isPresent()) return replay(token, confirmation, key);
        if (actions.consumeConfirmation(confirmation.id(), clock.instant()) != 1) {
            if (execution(token, key).isPresent()) return replay(token, confirmation, key);
            throw conflict("confirmation_expired_or_used");
        }
        var assignment = actions.readConfirmationArgs(confirmation, MemberAssignment.class);
        String correlation = UUID.randomUUID().toString();
        long executionId = actions.insertPendingExecution(token, confirmation, key, correlation);
        var result = new Result(audience.applyAssignment(token.user(), assignment), assignment.contactIds().size());
        if (actions.completeExecution(executionId, mapper.convertValue(result, new TypeReference<>() {}), clock.instant()) != 1) {
            throw new IllegalStateException("Mailing execution could not be completed.");
        }
        actions.insertAudit(token, ASSIGN, confirmation.id(), "COMMIT", "SUCCESS", correlation, key,
            Map.of("listId", assignment.listId()), Map.of("added", result.added()), null, null);
        return new Commit(result, false, correlation);
    }

    private Commit replay(StoredToken token, AiActionRepository.Confirmation confirmation, String key) {
        requireAccess(token, true);
        var execution = execution(token, key).orElseThrow(() -> conflict("action_in_progress"));
        if (execution.confirmationId() != confirmation.id() || !execution.fingerprint().equals(confirmation.fingerprint())) {
            throw conflict("idempotency_key_conflict");
        }
        if (!"COMPLETED".equals(execution.status())) throw conflict("action_in_progress");
        var result = actions.readExecutionResult(token.user().companyId(), token.user().userId(), ACTION, execution, Result.class);
        actions.insertAudit(token, ASSIGN, confirmation.id(), "COMMIT", "REPLAY", execution.correlationId(), key,
            Map.of("listId", result.list().id()), null, null, null);
        return new Commit(result, true, execution.correlationId());
    }

    private java.util.Optional<AiActionRepository.Execution> execution(StoredToken token, String key) {
        return actions.findExecution(token.user().companyId(), token.user().userId(), ACTION, key);
    }

    private void requireAccess(StoredToken token, boolean assign) {
        String scope = assign ? AiAccessTokenService.MAILING_LISTS_ASSIGN : AiAccessTokenService.MAILING_LISTS_READ;
        if (!token.scopes().contains(scope) || !authorization.canUseMailingLists(token.user(), assign)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "mailing_lists_permission_required");
        }
    }

    private static ResponseStatusException conflict(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
