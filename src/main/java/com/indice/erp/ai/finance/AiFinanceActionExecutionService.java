package com.indice.erp.ai.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.ExpenseType;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.pettycash.PettyCashMovementType;
import com.indice.erp.finance.pettycash.PettyCashService;
import com.indice.erp.finance.pettycash.PettyCashSettlementLineStatus;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiFinanceActionExecutionService {

    private final AiFinanceActionRepository repository;
    private final FinanceAccessService financeAccessService;
    private final ExpenseService expenseService;
    private final PettyCashService pettyCashService;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public AiFinanceActionExecutionService(
        AiFinanceActionRepository repository,
        FinanceAccessService financeAccessService,
        ExpenseService expenseService,
        PettyCashService pettyCashService,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.repository = repository;
        this.financeAccessService = financeAccessService;
        this.expenseService = expenseService;
        this.pettyCashService = pettyCashService;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional
    public AiFinanceActionContracts.CommitResponse execute(
        AiAccessTokenRepository.StoredToken token,
        AiFinanceActionRepository.Confirmation confirmation,
        String idempotencyHash,
        String correlationId
    ) {
        var executionId = repository.insertPendingExecution(token, confirmation, idempotencyHash, correlationId);
        if (repository.consumeConfirmation(confirmation.id(), clock.instant()) != 1) {
            throw new AiFinanceActionConflictException(
                "confirmation_unavailable", "The confirmation expired or was already used. Prepare the action again."
            );
        }
        var context = financeAccessService.resolveContext(token.user())
            .orElseThrow(() -> new SecurityException("The current Indice permissions do not allow finance actions."));
        var result = switch (confirmation.tool()) {
            case AiFinanceActionService.CREATE_EXPENSE_DRAFT -> createExpense(context, confirmation.normalizedArgs());
            case AiFinanceActionService.REGISTER_FUND_EXPENSE -> registerFundExpense(context, confirmation.normalizedArgs());
            case AiFinanceActionService.ADD_MONEY_TO_FUND -> addMoneyToFund(context, confirmation.normalizedArgs());
            default -> throw new IllegalArgumentException("Unsupported finance action.");
        };
        if (repository.completeExecution(executionId, result, clock.instant()) != 1) {
            throw new IllegalStateException("Action execution could not be completed.");
        }
        return new AiFinanceActionContracts.CommitResponse(false, correlationId, confirmation.tool(), result);
    }

    private Map<String, Object> createExpense(
        com.indice.erp.finance.shared.FinanceContext context,
        Map<String, Object> args
    ) {
        var metadata = objectMapper.createObjectNode().put("source", "mcp").put("mode", "confirmed_draft");
        var request = new CreateExpenseRequest(
            optionalLong(args, "unitId"), optionalLong(args, "businessId"), optionalLong(args, "providerId"),
            optionalLong(args, "budgetLineId"), optionalLong(args, "accountingAccountId"),
            optionalLong(args, "paymentAccountId"), null, "AUTO-EXP", requiredText(args, "concept"),
            text(args, "description"), ExpenseType.valueOf(requiredText(args, "expenseType")),
            decimal(args, "subtotalAmount"), decimal(args, "taxAmount"), decimal(args, "totalAmount"),
            requiredText(args, "currencyCode"), date(args, "expenseDate"), optionalDate(args, "dueDate"),
            context.userId(), null, context.userId(), false, null, metadata
        );
        var expense = expenseService.createDraft(context, request);
        var result = new LinkedHashMap<String, Object>();
        result.put("id", expense.id()); result.put("folio", expense.folio()); result.put("concept", expense.concept());
        result.put("total", expense.totalAmount()); result.put("currency", expense.currencyCode());
        result.put("status", expense.status()); result.put("paymentStatus", expense.paymentStatus());
        result.put("expenseDate", expense.expenseDate()); result.put("dueDate", expense.dueDate());
        return result;
    }

    private Map<String, Object> registerFundExpense(
        com.indice.erp.finance.shared.FinanceContext context,
        Map<String, Object> args
    ) {
        var metadata = objectMapper.createObjectNode().put("source", "mcp").put("mode", "confirmed_capture");
        var response = pettyCashService.createSettlementLine(
            context,
            requiredLong(args, "fundId"),
            new CreatePettyCashSettlementLineRequest(
                optionalLong(args, "statementId"), null, optionalLong(args, "providerId"),
                optionalLong(args, "accountingAccountId"), requiredText(args, "description"),
                text(args, "receiptReference"), decimal(args, "subtotalAmount"), decimal(args, "taxAmount"),
                decimal(args, "totalAmount"), requiredText(args, "currencyCode"), date(args, "expenseDate"),
                0, PettyCashSettlementLineStatus.DRAFT, null, metadata
            )
        );
        var result = new LinkedHashMap<String, Object>();
        result.put("fundId", response.fund().id()); result.put("fundName", response.fund().name());
        result.put("currentBalance", response.fund().currentBalanceAmount()); result.put("currency", response.fund().currencyCode());
        result.put("statementId", response.statement().id()); result.put("settlementLineId", response.settlementLine().id());
        result.put("description", response.settlementLine().description()); result.put("total", response.settlementLine().totalAmount());
        result.put("status", response.settlementLine().status());
        return result;
    }

    private Map<String, Object> addMoneyToFund(
        com.indice.erp.finance.shared.FinanceContext context,
        Map<String, Object> args
    ) {
        var fundId = requiredLong(args, "fundId");
        var fund = pettyCashService.getFund(context, fundId);
        var metadata = objectMapper.createObjectNode().put("source", "mcp").put("mode", "confirmed_deposit");
        var response = pettyCashService.createMovement(
            context,
            fundId,
            new CreatePettyCashMovementRequest(
                optionalLong(args, "statementId"), requiredLong(args, "sourcePaymentAccountId"),
                fund.paymentAccountId(), PettyCashMovementType.ADDITIONAL_DEPOSIT,
                decimal(args, "amount"), requiredText(args, "currencyCode"), date(args, "movementDate"),
                null, "ADDITIONAL_FUNDING", null,
                text(args, "reference") == null ? "Entrada de dinero registrada desde ChatGPT" : text(args, "reference"),
                "INTERNAL_TRANSFER", "Registrado mediante MCP", text(args, "reference"), null, metadata
            )
        );
        var result = new LinkedHashMap<String, Object>();
        result.put("fundId", response.fund().id()); result.put("fundName", response.fund().name());
        result.put("currentBalance", response.fund().currentBalanceAmount()); result.put("currency", response.fund().currencyCode());
        result.put("statementId", response.statement().id()); result.put("movementId", response.movement().id());
        result.put("amount", response.movement().amount()); result.put("movementDate", response.movement().movementDate());
        result.put("type", response.movement().type());
        return result;
    }

    private String requiredText(Map<String, Object> args, String key) {
        var value = text(args, key);
        if (value == null) throw new IllegalArgumentException(key + " is required.");
        return value;
    }

    private String text(Map<String, Object> args, String key) {
        var value = args.get(key);
        if (value == null) return null;
        var normalized = String.valueOf(value).trim();
        return normalized.isBlank() ? null : normalized;
    }

    private Long optionalLong(Map<String, Object> args, String key) {
        var value = args.get(key);
        if (value == null) return null;
        return value instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(value));
    }

    private long requiredLong(Map<String, Object> args, String key) {
        var value = optionalLong(args, key);
        if (value == null || value <= 0) throw new IllegalArgumentException(key + " must be positive.");
        return value;
    }

    private BigDecimal decimal(Map<String, Object> args, String key) {
        var value = args.get(key);
        if (value instanceof BigDecimal decimal) return decimal;
        return new BigDecimal(String.valueOf(value));
    }

    private LocalDate date(Map<String, Object> args, String key) {
        var value = optionalDate(args, key);
        if (value == null) throw new IllegalArgumentException(key + " is required.");
        return value;
    }

    private LocalDate optionalDate(Map<String, Object> args, String key) {
        var value = text(args, key);
        return value == null ? null : LocalDate.parse(value);
    }
}
