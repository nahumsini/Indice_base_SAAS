package com.indice.erp.ai.finance;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.finance.FinanceAccessService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class AiFinanceActionService {

    public static final String CREATE_EXPENSE_DRAFT = "create_expense_draft";
    public static final String REGISTER_FUND_EXPENSE = "register_fund_expense";
    public static final String ADD_MONEY_TO_FUND = "add_money_to_fund";
    public static final Set<String> TOOLS = Set.of(CREATE_EXPENSE_DRAFT, REGISTER_FUND_EXPENSE, ADD_MONEY_TO_FUND);

    private static final String CONFIRMATION_PREFIX = "idx_confirm_";
    private static final Duration CONFIRMATION_TTL = Duration.ofMinutes(5);

    private final AiFinanceActionRepository repository;
    private final AiFinanceActionExecutionService executionService;
    private final FinanceAccessService financeAccessService;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public AiFinanceActionService(
        AiFinanceActionRepository repository,
        AiFinanceActionExecutionService executionService,
        FinanceAccessService financeAccessService,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.repository = repository;
        this.executionService = executionService;
        this.financeAccessService = financeAccessService;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public AiFinanceActionContracts.PreviewResponse preview(
        AiAccessTokenRepository.StoredToken token,
        String tool,
        Map<String, Object> request
    ) {
        requireTool(tool);
        var context = financeAccessService.resolveContext(token.user())
            .orElseThrow(() -> new SecurityException("The current Indice permissions do not allow finance actions."));
        var normalized = normalize(tool, request == null ? Map.of() : request);
        if (!CREATE_EXPENSE_DRAFT.equals(tool)) {
            var fundId = longValue(normalized, "fundId");
            // Domain existence and scope are revalidated atomically during commit.
            if (fundId <= 0 || context.companyId() == null) throw new IllegalArgumentException("fundId is required.");
        }
        var confirmationToken = generateConfirmationToken();
        var fingerprint = sha256Hex(json(normalized));
        var expiresAt = clock.instant().plus(CONFIRMATION_TTL);
        var confirmationId = repository.insertConfirmation(
            token, tool, sha256Hex(confirmationToken), fingerprint, normalized, expiresAt
        );
        repository.insertAudit(token, tool, confirmationId, "PREVIEW", "SUCCESS", UUID.randomUUID().toString(),
            null, normalized, null, null, null);
        return new AiFinanceActionContracts.PreviewResponse(confirmationToken, expiresAt, true, tool, normalized);
    }

    public AiFinanceActionContracts.CommitResponse commit(
        AiAccessTokenRepository.StoredToken token,
        String tool,
        AiFinanceActionContracts.CommitRequest request
    ) {
        requireTool(tool);
        if (request == null) throw new IllegalArgumentException("Confirmation and idempotency key are required.");
        var confirmationToken = requiredText(request.confirmationToken(), "confirmationToken", 128);
        if (!confirmationToken.startsWith(CONFIRMATION_PREFIX)) throw new IllegalArgumentException("confirmationToken is invalid.");
        var idempotencyKey = requiredText(request.idempotencyKey(), "idempotencyKey", 128);
        if (idempotencyKey.length() < 8) throw new IllegalArgumentException("idempotencyKey must contain at least 8 characters.");
        var confirmation = repository.findConfirmation(sha256Hex(confirmationToken))
            .orElseThrow(() -> conflict("confirmation_invalid", "The confirmation is invalid. Prepare the action again."));
        requireIdentity(token, tool, confirmation);
        var idempotencyHash = sha256Hex(idempotencyKey);
        var existing = repository.findExecution(token.user().companyId(), token.user().userId(), tool, idempotencyHash);
        if (existing.isPresent()) return replay(token, confirmation, idempotencyHash, existing.get());
        if (confirmation.consumedAt() != null) throw conflict("confirmation_used", "The confirmation was already used.");
        if (!confirmation.expiresAt().isAfter(clock.instant())) throw conflict("confirmation_expired", "The confirmation expired.");

        var correlationId = UUID.randomUUID().toString();
        try {
            var response = executionService.execute(token, confirmation, idempotencyHash, correlationId);
            repository.insertAudit(token, tool, confirmation.id(), "COMMIT", "SUCCESS", correlationId,
                idempotencyHash, confirmation.normalizedArgs(), response.result(), null, null);
            return response;
        } catch (DuplicateKeyException exception) {
            var concurrent = repository.findExecution(token.user().companyId(), token.user().userId(), tool, idempotencyHash)
                .orElseThrow(() -> exception);
            return replay(token, confirmation, idempotencyHash, concurrent);
        } catch (RuntimeException exception) {
            repository.insertAudit(token, tool, confirmation.id(), "COMMIT", "FAILURE", correlationId,
                idempotencyHash, confirmation.normalizedArgs(), null, errorCode(exception), exception.getMessage());
            throw exception;
        }
    }

    private AiFinanceActionContracts.CommitResponse replay(
        AiAccessTokenRepository.StoredToken token,
        AiFinanceActionRepository.Confirmation confirmation,
        String idempotencyHash,
        AiFinanceActionRepository.Execution execution
    ) {
        if (execution.confirmationId() != confirmation.id() || !execution.fingerprint().equals(confirmation.fingerprint())) {
            throw conflict("idempotency_key_conflict", "That idempotency key was already used for a different action.");
        }
        if (!"COMPLETED".equals(execution.status())) {
            throw conflict("action_in_progress", "The action is still being processed. Try again shortly.");
        }
        var response = new AiFinanceActionContracts.CommitResponse(
            true, execution.correlationId(), confirmation.tool(), execution.result()
        );
        repository.insertAudit(token, confirmation.tool(), confirmation.id(), "COMMIT", "REPLAY",
            execution.correlationId(), idempotencyHash, confirmation.normalizedArgs(), response.result(), null, null);
        return response;
    }

    private Map<String, Object> normalize(String tool, Map<String, Object> request) {
        return switch (tool) {
            case CREATE_EXPENSE_DRAFT -> normalizeExpense(request);
            case REGISTER_FUND_EXPENSE -> normalizeFundExpense(request);
            case ADD_MONEY_TO_FUND -> normalizeFundDeposit(request);
            default -> throw new IllegalArgumentException("Unsupported finance action.");
        };
    }

    private Map<String, Object> normalizeExpense(Map<String, Object> request) {
        var result = new LinkedHashMap<String, Object>();
        result.put("concept", requiredText(request.get("concept"), "concept", 220));
        putText(result, "description", request.get("description"), 2000);
        var expenseType = text(request.get("expenseType"));
        expenseType = expenseType == null ? "VARIABLE" : expenseType.toUpperCase(Locale.ROOT);
        if (!Set.of("FIXED", "VARIABLE").contains(expenseType)) throw new IllegalArgumentException("expenseType must be FIXED or VARIABLE.");
        result.put("expenseType", expenseType);
        putMoney(result, request);
        result.put("currencyCode", currency(request.get("currencyCode")));
        result.put("expenseDate", date(request.get("expenseDate"), "expenseDate").toString());
        putDate(result, "dueDate", request.get("dueDate"));
        putId(result, "unitId", request.get("unitId")); putId(result, "businessId", request.get("businessId"));
        putId(result, "providerId", request.get("providerId")); putId(result, "budgetLineId", request.get("budgetLineId"));
        putId(result, "accountingAccountId", request.get("accountingAccountId"));
        putId(result, "paymentAccountId", request.get("paymentAccountId"));
        result.put("mode", "DRAFT_ONLY");
        return result;
    }

    private Map<String, Object> normalizeFundExpense(Map<String, Object> request) {
        var result = new LinkedHashMap<String, Object>();
        result.put("fundId", positiveLong(request.get("fundId"), "fundId"));
        putId(result, "statementId", request.get("statementId"));
        putId(result, "providerId", request.get("providerId"));
        putId(result, "accountingAccountId", request.get("accountingAccountId"));
        result.put("description", requiredText(request.get("description"), "description", 220));
        putText(result, "receiptReference", request.get("receiptReference"), 160);
        putMoney(result, request);
        if (decimal(result.get("totalAmount"), "totalAmount").signum() <= 0) throw new IllegalArgumentException("totalAmount must be greater than zero.");
        result.put("currencyCode", currency(request.get("currencyCode")));
        result.put("expenseDate", date(request.get("expenseDate"), "expenseDate").toString());
        result.put("mode", "FUND_CAPTURE_ONLY");
        return result;
    }

    private Map<String, Object> normalizeFundDeposit(Map<String, Object> request) {
        var result = new LinkedHashMap<String, Object>();
        result.put("fundId", positiveLong(request.get("fundId"), "fundId"));
        putId(result, "statementId", request.get("statementId"));
        result.put("sourcePaymentAccountId", positiveLong(request.get("sourcePaymentAccountId"), "sourcePaymentAccountId"));
        var amount = decimal(request.get("amount"), "amount");
        if (amount.signum() <= 0) throw new IllegalArgumentException("amount must be greater than zero.");
        result.put("amount", amount);
        result.put("currencyCode", currency(request.get("currencyCode")));
        result.put("movementDate", date(request.get("movementDate"), "movementDate").toString());
        putText(result, "reference", request.get("reference"), 220);
        result.put("type", "ADDITIONAL_DEPOSIT");
        return result;
    }

    private void putMoney(Map<String, Object> result, Map<String, Object> request) {
        var total = decimal(request.get("totalAmount"), "totalAmount");
        var tax = request.get("taxAmount") == null ? BigDecimal.ZERO : decimal(request.get("taxAmount"), "taxAmount");
        var subtotal = request.get("subtotalAmount") == null ? total.subtract(tax) : decimal(request.get("subtotalAmount"), "subtotalAmount");
        if (total.signum() < 0 || tax.signum() < 0 || subtotal.signum() < 0) throw new IllegalArgumentException("Amounts cannot be negative.");
        if (subtotal.add(tax).compareTo(total) != 0) throw new IllegalArgumentException("subtotalAmount plus taxAmount must equal totalAmount.");
        result.put("subtotalAmount", subtotal); result.put("taxAmount", tax); result.put("totalAmount", total);
    }

    private void requireIdentity(
        AiAccessTokenRepository.StoredToken token,
        String tool,
        AiFinanceActionRepository.Confirmation confirmation
    ) {
        if (!tool.equals(confirmation.tool()) || confirmation.accessTokenId() != token.id()
            || confirmation.companyId() != token.user().companyId() || confirmation.userId() != token.user().userId()
            || confirmation.userCompanyId() != token.user().userCompanyId()) {
            throw conflict("confirmation_identity_mismatch", "The confirmation does not belong to this connection or action.");
        }
    }

    private void requireTool(String tool) {
        if (!TOOLS.contains(tool)) throw new IllegalArgumentException("Unsupported finance action.");
    }

    private void putText(Map<String, Object> result, String key, Object value, int maxLength) {
        var normalized = text(value);
        if (normalized == null) return;
        if (normalized.length() > maxLength) throw new IllegalArgumentException(key + " is too long.");
        result.put(key, normalized);
    }

    private void putDate(Map<String, Object> result, String key, Object value) {
        if (value != null && !String.valueOf(value).isBlank()) result.put(key, date(value, key).toString());
    }

    private void putId(Map<String, Object> result, String key, Object value) {
        if (value != null) result.put(key, positiveLong(value, key));
    }

    private String currency(Object value) {
        var normalized = requiredText(value, "currencyCode", 3).toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{3}")) throw new IllegalArgumentException("currencyCode must use three letters.");
        return normalized;
    }

    private LocalDate date(Object value, String field) {
        try { return LocalDate.parse(requiredText(value, field, 10)); }
        catch (RuntimeException exception) { throw new IllegalArgumentException(field + " must use YYYY-MM-DD."); }
    }

    private long positiveLong(Object value, String field) {
        try {
            var parsed = value instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(value));
            if (parsed <= 0) throw new NumberFormatException();
            return parsed;
        } catch (RuntimeException exception) { throw new IllegalArgumentException(field + " must be a positive identifier."); }
    }

    private long longValue(Map<String, Object> value, String key) {
        var item = value.get(key);
        return item instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(item));
    }

    private BigDecimal decimal(Object value, String field) {
        try { return value instanceof BigDecimal decimal ? decimal : new BigDecimal(String.valueOf(value)); }
        catch (RuntimeException exception) { throw new IllegalArgumentException(field + " must be a valid amount."); }
    }

    private String requiredText(Object value, String field, int maxLength) {
        var normalized = text(value);
        if (normalized == null) throw new IllegalArgumentException(field + " is required.");
        if (normalized.length() > maxLength) throw new IllegalArgumentException(field + " must not exceed " + maxLength + " characters.");
        return normalized;
    }

    private String text(Object value) {
        if (value == null) return null;
        var normalized = String.valueOf(value).trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String generateConfirmationToken() {
        var bytes = new byte[32]; secureRandom.nextBytes(bytes);
        return CONFIRMATION_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String json(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Action confirmation serialization failed.", exception); }
    }

    private String sha256Hex(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 is unavailable.", exception); }
    }

    private AiFinanceActionConflictException conflict(String code, String message) {
        return new AiFinanceActionConflictException(code, message);
    }

    private String errorCode(RuntimeException exception) {
        if (exception instanceof AiFinanceActionConflictException conflict) return conflict.code();
        if (exception instanceof SecurityException) return "permission_required";
        if (exception instanceof IllegalArgumentException) return "invalid_request";
        return "action_failed";
    }
}
