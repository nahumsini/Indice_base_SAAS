package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.ClosePettyCashStatementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.DeletePettyCashFundResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashFundResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashMovementMutationResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashStatementCloseResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashSettlementLineMutationResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashWorkspaceResponse;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PettyCashService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final ZoneId OPERATIONAL_ZONE = ZoneId.of("America/Cancun");
    private static final Set<String> ADMIN_ROLES = Set.of("root", "superadmin", "admin", "owner", "dueno", "dueño");

    private final PettyCashRepository repository;
    private final PettyCashMapper mapper;
    private final PettyCashValidator validator;

    public PettyCashService(PettyCashRepository repository, PettyCashMapper mapper, PettyCashValidator validator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
    }

    @Transactional
    public PettyCashWorkspaceResponse workspace(FinanceContext context) {
        var fundRecords = repository.findFunds(context);
        var currentPeriod = YearMonth.now(OPERATIONAL_ZONE);
        for (var fund : fundRecords) {
            if (fund.status() != PettyCashFundStatus.CLOSED) {
                repository.markPriorOpenStatementsCutPending(context, fund.id(), currentPeriod.toString());
                ensureStatement(context, fund, null, currentPeriod.atDay(1));
            }
        }
        var funds = fundRecords.stream().map(mapper::toResponse).toList();
        var statements = repository.findStatements(context).stream().map(mapper::toResponse).toList();
        var movements = repository.findMovements(context).stream().map(mapper::toResponse).toList();
        var settlementLines = repository.findSettlementLines(context).stream().map(mapper::toResponse).toList();
        return new PettyCashWorkspaceResponse(funds, statements, movements, settlementLines, funds.size());
    }

    @Transactional(readOnly = true)
    public PettyCashFundResponse getFund(FinanceContext context, long fundId) {
        return mapper.toResponse(requireFund(context, fundId));
    }

    @Transactional
    public PettyCashFundResponse createFund(FinanceContext context, CreatePettyCashFundRequest request) {
        var assignment = validator.validateCreate(context, request);
        var kioskPublicToken = resolveKioskPublicToken(
            request.kioskPublicToken(),
            null,
            request.kioskEnabled() != null && request.kioskEnabled(),
            null
        );
        var command = mapper.toCreateCommand(context, request, assignment, kioskPublicToken);
        requireUniqueName(context, command.name(), null);
        var fund = repository.insertFund(context, command);
        ensureStatement(context, fund, null, LocalDate.now(OPERATIONAL_ZONE));
        return mapper.toResponse(fund);
    }

    @Transactional
    public PettyCashFundResponse updateFund(FinanceContext context, long fundId, UpdatePettyCashFundRequest request) {
        var existing = requireFund(context, fundId);
        var assignment = validator.validateUpdate(context, request);
        var kioskPublicToken = resolveKioskPublicToken(
            request.kioskPublicToken(),
            existing.kioskPublicToken(),
            request.kioskEnabled() != null && request.kioskEnabled(),
            fundId
        );
        var command = mapper.toUpdateCommand(context, request, assignment, existing, kioskPublicToken);
        requireUniqueName(context, command.name(), fundId);
        if (!repository.updateFund(context, fundId, command)) {
            throw new NoSuchElementException("Petty cash fund not found.");
        }
        return getFund(context, fundId);
    }

    @Transactional
    public DeletePettyCashFundResponse deleteFund(FinanceContext context, long fundId) {
        requireFund(context, fundId);
        if (!repository.softDeleteFund(context, fundId)) {
            throw new NoSuchElementException("Petty cash fund not found.");
        }
        return new DeletePettyCashFundResponse(true);
    }

    @Transactional
    public PettyCashFundResponse rotateKioskPublicToken(FinanceContext context, long fundId) {
        requireFund(context, fundId);
        var kioskPublicToken = generateUniqueKioskPublicToken();
        var kioskAccessUrl = "/petty-cash/kiosk/" + kioskPublicToken;
        if (!repository.rotateKioskPublicToken(context, fundId, kioskPublicToken, kioskAccessUrl)) {
            throw new NoSuchElementException("Petty cash fund not found.");
        }
        return getFund(context, fundId);
    }

    @Transactional
    public PettyCashMovementMutationResponse createMovement(
            FinanceContext context,
            long fundId,
            CreatePettyCashMovementRequest request) {
        var fund = requireFund(context, fundId);
        validator.validateMovement(context, request);
        requireCurrencyMatch(fund, request.currencyCode());
        var statement = ensureStatement(context, fund, request.pettyCashStatementId(), request.movementDate());
        var command = mapper.toCommand(context, request);
        command = new PettyCashMovementCommand(
            statement.id(), command.fromPaymentAccountId(), command.toPaymentAccountId(), command.type(),
            command.amount(), command.currencyCode(), command.movementDate(), command.reference(),
            command.createdByUserId(), command.customFieldsJson(), command.metadataJson()
        );
        requireResolvedMovementAccounts(fund, command);
        var movement = repository.insertMovement(context, fund.id(), command);
        var balanceDelta = balanceDelta(command.type(), command.amount());
        if (balanceDelta.signum() != 0) {
            repository.adjustFundBalance(context, fund.id(), balanceDelta);
        }
        applyPaymentAccountImpact(context, fund, command);
        repository.applyMovementToStatement(context, statement.id(), command.type(), command.amount(), balanceDelta);
        repository.applyMovementToBudgetLine(context, fund.budgetLineId(), command.type(), command.amount());
        return new PettyCashMovementMutationResponse(
            mapper.toResponse(requireFund(context, fund.id())),
            mapper.toResponse(requireStatement(context, statement.id())),
            mapper.toResponse(movement)
        );
    }

    @Transactional
    public PettyCashSettlementLineMutationResponse createSettlementLine(
            FinanceContext context,
            long fundId,
            CreatePettyCashSettlementLineRequest request) {
        var fund = requireFund(context, fundId);
        validator.validateSettlementLine(context, request);
        requireCurrencyMatch(fund, request.currencyCode());
        var statement = ensureStatement(context, fund, request.pettyCashStatementId(), request.expenseDate());
        var command = mapper.toCommand(context, request);
        var captureStatus = command.attachmentCount() > 0
            ? PettyCashSettlementLineStatus.RECEIPT_ATTACHED
            : PettyCashSettlementLineStatus.DRAFT;
        command = new PettyCashSettlementLineCommand(
            statement.id(), null, command.providerId(), command.accountingAccountId(),
            command.description(), command.receiptReference(), command.subtotalAmount(), command.taxAmount(),
            command.totalAmount(), command.currencyCode(), command.expenseDate(), command.attachmentCount(),
            captureStatus, command.createdByUserId(), command.customFieldsJson(), command.metadataJson()
        );
        var line = repository.insertSettlementLine(context, fund.id(), command);
        repository.adjustFundBalance(context, fund.id(), command.totalAmount().negate());
        repository.adjustPaymentAccountBalance(context, fund.paymentAccountId(), command.totalAmount().negate());
        repository.applySettlementLineToStatement(context, statement.id(), command.totalAmount(), command.attachmentCount());
        return new PettyCashSettlementLineMutationResponse(
            mapper.toResponse(requireFund(context, fund.id())),
            mapper.toResponse(requireStatement(context, statement.id())),
            mapper.toResponse(repository.findSettlementLineById(context, line.id()).orElse(line))
        );
    }

    @Transactional
    public PettyCashSettlementLineMutationResponse createExpenseFromSettlementLine(
            FinanceContext context,
            long fundId,
            long settlementLineId) {
        var fund = requireFund(context, fundId);
        var line = requireSettlementLine(context, settlementLineId);
        if (!line.pettyCashFundId().equals(fund.id())) {
            throw FinanceApiException.badRequest("settlementLineId does not belong to this fund.");
        }
        if (line.status() == PettyCashSettlementLineStatus.EXPENSE_CREATED) {
            throw FinanceApiException.conflict("Petty cash settlement line already has an expense.");
        }
        if (!canCreateExpenseFromSettlementLine(line.status())) {
            throw FinanceApiException.badRequest("Petty cash settlement line cannot be authorized from its current status.");
        }
        line = clearStalePendingExpenseLink(context, line);
        var authorizingWithoutSupport = line.status() == PettyCashSettlementLineStatus.DRAFT;
        if (authorizingWithoutSupport && !isAdministrativeRole(context.role())) {
            throw FinanceApiException.forbidden("Only an administrator can authorize a petty cash expense without support.");
        }
        if (!authorizingWithoutSupport && line.attachmentCount() <= 0) {
            throw FinanceApiException.badRequest("Petty cash settlement line requires evidence before authorization.");
        }
        var statement = requireStatement(context, line.pettyCashStatementId());
        var expenseId = repository.insertExpenseFromSettlementLine(context, fund, statement, line);
        repository.linkSettlementLineExpense(context, line.id(), expenseId);
        repository.applySettlementLineExpenseToStatement(context, statement.id(), line.totalAmount());
        repository.applySettlementLineToBudgetLine(context, fund.budgetLineId(), line.totalAmount());
        return new PettyCashSettlementLineMutationResponse(
            mapper.toResponse(requireFund(context, fund.id())),
            mapper.toResponse(requireStatement(context, statement.id())),
            mapper.toResponse(repository.findSettlementLineById(context, line.id()).orElse(line))
        );
    }

    @Transactional
    public PettyCashSettlementLineMutationResponse rejectSettlementLine(
            FinanceContext context,
            long fundId,
            long settlementLineId) {
        var fund = requireFund(context, fundId);
        var line = requireSettlementLine(context, settlementLineId);
        if (!line.pettyCashFundId().equals(fund.id())) {
            throw FinanceApiException.badRequest("settlementLineId does not belong to this fund.");
        }
        if (line.status() == PettyCashSettlementLineStatus.EXPENSE_CREATED) {
            throw FinanceApiException.conflict("An expense that was already created cannot be rejected.");
        }
        if (line.status() == PettyCashSettlementLineStatus.REJECTED) {
            throw FinanceApiException.conflict("Petty cash settlement line is already rejected.");
        }
        if (!canCreateExpenseFromSettlementLine(line.status())) {
            throw FinanceApiException.conflict("Petty cash settlement line could not be rejected from its current status.");
        }
        line = clearStalePendingExpenseLink(context, line);
        if (!repository.rejectSettlementLine(context, line.id())) {
            throw FinanceApiException.conflict("Petty cash settlement line could not be rejected from its current status.");
        }
        var statement = requireStatement(context, line.pettyCashStatementId());
        return new PettyCashSettlementLineMutationResponse(
            mapper.toResponse(requireFund(context, fund.id())),
            mapper.toResponse(statement),
            mapper.toResponse(requireSettlementLine(context, line.id()))
        );
    }

    @Transactional
    public void deleteSettlementLine(FinanceContext context, long fundId, long settlementLineId) {
        var fund = requireFund(context, fundId);
        var line = requireSettlementLine(context, settlementLineId);
        if (!line.pettyCashFundId().equals(fund.id())) {
            throw FinanceApiException.badRequest("settlementLineId does not belong to this fund.");
        }
        var hasGeneratedExpense = line.status() == PettyCashSettlementLineStatus.EXPENSE_CREATED;
        if (hasGeneratedExpense && line.expenseId() == null) {
            throw FinanceApiException.conflict("Petty cash settlement line is marked as expense created but has no linked expense.");
        }
        if (hasGeneratedExpense && !repository.softDeleteGeneratedExpense(context, line.expenseId(), line.id())) {
            throw FinanceApiException.conflict("The linked petty cash expense could not be deleted.");
        }
        if (!repository.softDeleteSettlementLine(context, line)) {
            throw new NoSuchElementException("Petty cash settlement line not found.");
        }
        repository.adjustFundBalance(context, fund.id(), line.totalAmount());
        repository.adjustPaymentAccountBalance(context, fund.paymentAccountId(), line.totalAmount());
        if (hasGeneratedExpense) {
            repository.revertSettlementLineExpenseFromStatement(context, line.pettyCashStatementId(), line.totalAmount());
            repository.revertSettlementLineFromBudgetLine(context, fund.budgetLineId(), line.totalAmount());
        }
        repository.revertSettlementLineFromStatement(context, line);
    }

    @Transactional
    public PettyCashStatementCloseResponse closeStatement(
            FinanceContext context,
            long fundId,
            long statementId,
            ClosePettyCashStatementRequest request) {
        var fund = requireFund(context, fundId);
        var statement = requireStatement(context, statementId);
        if (!statement.pettyCashFundId().equals(fund.id())) {
            throw FinanceApiException.badRequest("statementId does not belong to this fund.");
        }
        if (statement.status() == PettyCashStatementStatus.CLOSED
                || statement.status() == PettyCashStatementStatus.TRANSFERRED_TO_NEXT_CUT
                || statement.status() == PettyCashStatementStatus.FORGIVEN_SHORTAGE
                || statement.status() == PettyCashStatementStatus.CHARGED_TO_EMPLOYEE) {
            throw FinanceApiException.conflict("Petty cash statement is already closed.");
        }
        var pendingLines = repository.countPendingSettlementLinesForStatement(context, statement.id());
        if (pendingLines > 0) {
            throw FinanceApiException.conflict("Petty cash statement has receipts pending expense creation.");
        }

        var closingBalance = statement.declaredClosingBalanceAmount() == null
            ? BigDecimal.ZERO
            : statement.declaredClosingBalanceAmount();
        var action = request.action();
        var closeDate = request.closeDate() == null ? LocalDate.now() : request.closeDate();
        PettyCashStatementRecord nextStatement = null;

        switch (action) {
            case CLOSE_CLEAN -> {
                if (closingBalance.signum() > 0) {
                    throw FinanceApiException.badRequest("Use RETURN_TO_SOURCE or CARRY_FORWARD when closing balance is greater than zero.");
                }
                repository.closeStatement(
                    context, statement.id(), PettyCashStatementStatus.CLOSED,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
                );
            }
            case RETURN_TO_SOURCE -> {
                if (closingBalance.signum() <= 0) {
                    throw FinanceApiException.badRequest("Closing balance must be greater than zero to return funds.");
                }
                var command = new PettyCashMovementCommand(
                    statement.id(), fund.paymentAccountId(), fund.fundingSourcePaymentAccountId(),
                    PettyCashMovementType.RETURN_TO_SOURCE, closingBalance, fund.currencyCode(), closeDate,
                    normalizeCloseReference(request.reference(), "Cierre de corte: devolucion a origen"),
                    context.userId(), null, null
                );
                requireResolvedMovementAccounts(fund, command);
                repository.insertMovement(context, fund.id(), command);
                repository.adjustFundBalance(context, fund.id(), closingBalance.negate());
                applyPaymentAccountImpact(context, fund, command);
                repository.applyMovementToBudgetLine(context, fund.budgetLineId(), command.type(), command.amount());
                repository.closeStatement(
                    context, statement.id(), PettyCashStatementStatus.CLOSED,
                    closingBalance, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
                );
            }
            case CARRY_FORWARD -> {
                if (closingBalance.signum() <= 0) {
                    throw FinanceApiException.badRequest("Closing balance must be greater than zero to carry forward.");
                }
                nextStatement = ensureNextStatement(context, fund, statement);
                repository.closeStatement(
                    context, statement.id(), PettyCashStatementStatus.TRANSFERRED_TO_NEXT_CUT,
                    BigDecimal.ZERO, closingBalance, BigDecimal.ZERO, BigDecimal.ZERO
                );
            }
            case FORGIVE_SHORTAGE, CHARGE_EMPLOYEE -> {
                var shortageAmount = requireShortageAmount(request.shortageAmount(), closingBalance);
                var movementType = action == PettyCashStatementCloseAction.FORGIVE_SHORTAGE
                    ? PettyCashMovementType.FORGIVEN_SHORTAGE
                    : PettyCashMovementType.EMPLOYEE_CHARGE;
                var statementStatus = action == PettyCashStatementCloseAction.FORGIVE_SHORTAGE
                    ? PettyCashStatementStatus.FORGIVEN_SHORTAGE
                    : PettyCashStatementStatus.CHARGED_TO_EMPLOYEE;
                var command = new PettyCashMovementCommand(
                    statement.id(), null, null, movementType, shortageAmount, fund.currencyCode(), closeDate,
                    normalizeCloseReference(request.reference(), "Cierre de corte: faltante"),
                    context.userId(), null, null
                );
                repository.insertMovement(context, fund.id(), command);
                repository.adjustFundBalance(context, fund.id(), shortageAmount.negate());
                repository.adjustPaymentAccountBalance(context, fund.paymentAccountId(), shortageAmount.negate());
                repository.closeStatement(
                    context, statement.id(), statementStatus,
                    BigDecimal.ZERO, BigDecimal.ZERO, shortageAmount,
                    closingBalance.subtract(shortageAmount).max(BigDecimal.ZERO)
                );
            }
        }

        return new PettyCashStatementCloseResponse(
            mapper.toResponse(requireFund(context, fund.id())),
            mapper.toResponse(requireStatement(context, statement.id())),
            nextStatement == null ? null : mapper.toResponse(nextStatement)
        );
    }

    private PettyCashStatementRecord ensureStatement(
            FinanceContext context,
            PettyCashFundRecord fund,
            Long requestedStatementId,
            LocalDate activityDate) {
        if (requestedStatementId != null) {
            var statement = requireStatement(context, requestedStatementId);
            if (!statement.pettyCashFundId().equals(fund.id())) {
                throw FinanceApiException.badRequest("pettyCashStatementId does not belong to this fund.");
            }
            return statement;
        }
        var date = activityDate == null ? LocalDate.now() : activityDate;
        var period = YearMonth.from(date);
        var periodKey = period.toString();
        return repository.findOpenStatementForFund(context, fund.id(), periodKey)
            .orElseGet(() -> {
                var periodStart = period.atDay(1);
                var periodEnd = period.atEndOfMonth();
                var folio = "PC-ST-" + periodKey + "-" + fund.id();
                return repository.insertStatement(context, fund, folio, periodKey, periodStart, periodEnd);
            });
    }

    private PettyCashStatementRecord ensureNextStatement(
            FinanceContext context,
            PettyCashFundRecord fund,
            PettyCashStatementRecord currentStatement) {
        var nextPeriod = YearMonth.parse(currentStatement.periodKey()).plusMonths(1);
        var periodKey = nextPeriod.toString();
        return repository.findOpenStatementForFund(context, fund.id(), periodKey)
            .orElseGet(() -> {
                var periodStart = nextPeriod.atDay(1);
                var periodEnd = nextPeriod.atEndOfMonth();
                var folio = "PC-ST-" + periodKey + "-" + fund.id();
                return repository.insertStatement(context, fund, folio, periodKey, periodStart, periodEnd);
            });
    }

    private BigDecimal balanceDelta(PettyCashMovementType type, BigDecimal amount) {
        return switch (type) {
            case INITIAL_FUNDING, ADDITIONAL_DEPOSIT, CARRY_FORWARD -> amount;
            case RETURN_TO_SOURCE -> amount.negate();
            case SHORTAGE_ADJUSTMENT, FORGIVEN_SHORTAGE, EMPLOYEE_CHARGE -> BigDecimal.ZERO;
        };
    }

    private boolean canCreateExpenseFromSettlementLine(PettyCashSettlementLineStatus status) {
        return status == PettyCashSettlementLineStatus.DRAFT
            || status == PettyCashSettlementLineStatus.RECEIPT_ATTACHED
            || status == PettyCashSettlementLineStatus.VALIDATED;
    }

    private PettyCashSettlementLineRecord clearStalePendingExpenseLink(
            FinanceContext context,
            PettyCashSettlementLineRecord line) {
        if (line.expenseId() == null) {
            return line;
        }
        if (!repository.clearPendingSettlementLineExpenseLink(context, line.id())) {
            throw FinanceApiException.conflict("Petty cash settlement line has an inconsistent expense link.");
        }
        return requireSettlementLine(context, line.id());
    }

    private boolean isAdministrativeRole(String role) {
        var normalizedRole = role == null ? "" : role.trim().toLowerCase(Locale.ROOT);
        if ("super admin".equals(normalizedRole)) {
            normalizedRole = "superadmin";
        }
        return ADMIN_ROLES.contains(normalizedRole);
    }

    private void applyPaymentAccountImpact(
            FinanceContext context,
            PettyCashFundRecord fund,
            PettyCashMovementCommand command) {
        switch (command.type()) {
            case INITIAL_FUNDING, ADDITIONAL_DEPOSIT -> {
                var fromAccountId = command.fromPaymentAccountId() == null
                    ? fund.fundingSourcePaymentAccountId()
                    : command.fromPaymentAccountId();
                var toAccountId = command.toPaymentAccountId() == null
                    ? fund.paymentAccountId()
                    : command.toPaymentAccountId();
                repository.adjustPaymentAccountBalance(context, fromAccountId, command.amount().negate());
                repository.adjustPaymentAccountBalance(context, toAccountId, command.amount());
            }
            case RETURN_TO_SOURCE -> {
                var fromAccountId = command.fromPaymentAccountId() == null
                    ? fund.paymentAccountId()
                    : command.fromPaymentAccountId();
                var toAccountId = command.toPaymentAccountId() == null
                    ? fund.fundingSourcePaymentAccountId()
                    : command.toPaymentAccountId();
                repository.adjustPaymentAccountBalance(context, fromAccountId, command.amount().negate());
                repository.adjustPaymentAccountBalance(context, toAccountId, command.amount());
            }
            case CARRY_FORWARD, SHORTAGE_ADJUSTMENT, FORGIVEN_SHORTAGE, EMPLOYEE_CHARGE -> {
            }
        }
    }

    private void requireResolvedMovementAccounts(PettyCashFundRecord fund, PettyCashMovementCommand command) {
        var accountPlan = resolveMovementAccountPlan(fund, command);
        if (accountPlan == null) {
            return;
        }
        if (accountPlan.fromPaymentAccountId() == null || accountPlan.toPaymentAccountId() == null) {
            throw FinanceApiException.badRequest("Petty cash movement requires both source and destination payment accounts.");
        }
        if (accountPlan.fromPaymentAccountId().equals(accountPlan.toPaymentAccountId())) {
            throw FinanceApiException.badRequest("Petty cash movement source and destination accounts must be different.");
        }
    }

    private MovementAccountPlan resolveMovementAccountPlan(PettyCashFundRecord fund, PettyCashMovementCommand command) {
        return switch (command.type()) {
            case INITIAL_FUNDING, ADDITIONAL_DEPOSIT -> new MovementAccountPlan(
                command.fromPaymentAccountId() == null ? fund.fundingSourcePaymentAccountId() : command.fromPaymentAccountId(),
                command.toPaymentAccountId() == null ? fund.paymentAccountId() : command.toPaymentAccountId()
            );
            case RETURN_TO_SOURCE -> new MovementAccountPlan(
                command.fromPaymentAccountId() == null ? fund.paymentAccountId() : command.fromPaymentAccountId(),
                command.toPaymentAccountId() == null ? fund.fundingSourcePaymentAccountId() : command.toPaymentAccountId()
            );
            case CARRY_FORWARD, SHORTAGE_ADJUSTMENT, FORGIVEN_SHORTAGE, EMPLOYEE_CHARGE -> null;
        };
    }

    private record MovementAccountPlan(Long fromPaymentAccountId, Long toPaymentAccountId) {
    }

    private void requireCurrencyMatch(PettyCashFundRecord fund, String currencyCode) {
        if (!fund.currencyCode().equalsIgnoreCase(currencyCode)) {
            throw FinanceApiException.badRequest("currencyCode must match the petty cash fund currency.");
        }
    }

    private String normalizeCloseReference(String requestedReference, String fallback) {
        if (requestedReference == null || requestedReference.isBlank()) {
            return fallback;
        }
        return requestedReference.trim();
    }

    private BigDecimal requireShortageAmount(BigDecimal requestedAmount, BigDecimal closingBalance) {
        var shortageAmount = requestedAmount == null ? BigDecimal.ZERO : requestedAmount;
        if (shortageAmount.signum() <= 0) {
            throw FinanceApiException.badRequest("shortageAmount must be greater than zero for shortage closure.");
        }
        if (closingBalance.signum() > 0 && shortageAmount.compareTo(closingBalance) > 0) {
            throw FinanceApiException.badRequest("shortageAmount cannot be greater than the closing balance.");
        }
        return shortageAmount;
    }

    private void requireUniqueName(FinanceContext context, String name, Long excludedFundId) {
        if (repository.existsByName(context, name, excludedFundId)) {
            throw FinanceApiException.conflict("Petty cash fund already exists with this name.");
        }
    }

    private String resolveKioskPublicToken(
            String requestedToken,
            String existingToken,
            boolean kioskEnabled,
            Long excludedFundId) {
        var normalizedRequestedToken = normalizeKioskPublicToken(requestedToken);
        if (normalizedRequestedToken != null) {
            requireUniqueKioskPublicToken(normalizedRequestedToken, excludedFundId);
            return normalizedRequestedToken;
        }
        var normalizedExistingToken = normalizeKioskPublicToken(existingToken);
        if (normalizedExistingToken != null) {
            return normalizedExistingToken;
        }
        return kioskEnabled ? generateUniqueKioskPublicToken() : null;
    }

    private void requireUniqueKioskPublicToken(String kioskPublicToken, Long excludedFundId) {
        if (repository.kioskPublicTokenExists(kioskPublicToken, excludedFundId)) {
            throw FinanceApiException.conflict("Petty cash kiosk token is already in use.");
        }
    }

    private String generateUniqueKioskPublicToken() {
        while (true) {
            var nextToken = UUID.randomUUID().toString().replace("-", "")
                + Long.toHexString(Math.abs(SECURE_RANDOM.nextLong()));
            if (!repository.kioskPublicTokenExists(nextToken, null)) {
                return nextToken;
            }
        }
    }

    private String normalizeKioskPublicToken(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var trimmed = value.trim();
        if (!trimmed.matches("[A-Za-z0-9_-]{8,96}")) {
            throw FinanceApiException.badRequest("kioskPublicToken must be URL-safe and between 8 and 96 characters.");
        }
        return trimmed;
    }

    private PettyCashFundRecord requireFund(FinanceContext context, long fundId) {
        return repository.findFundById(context, fundId)
            .orElseThrow(() -> new NoSuchElementException("Petty cash fund not found."));
    }

    private PettyCashStatementRecord requireStatement(FinanceContext context, long statementId) {
        return repository.findStatementById(context, statementId)
            .orElseThrow(() -> new NoSuchElementException("Petty cash statement not found."));
    }

    private PettyCashSettlementLineRecord requireSettlementLine(FinanceContext context, long settlementLineId) {
        return repository.findSettlementLineById(context, settlementLineId)
            .orElseThrow(() -> new NoSuchElementException("Petty cash settlement line not found."));
    }
}
