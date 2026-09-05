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
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.hr.incentives.HrPayrollExternalDeductionService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.Instant;
import java.time.YearMonth;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PettyCashService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final PettyCashRepository repository;
    private final PettyCashMapper mapper;
    private final PettyCashValidator validator;
    private final KioskRegistryService kioskRegistry;
    private final TreasuryService treasuryService;
    private final FinanceBusinessTimeZoneResolver timeZoneResolver;
    private final HrPayrollExternalDeductionService payrollExternalDeductionService;

    public PettyCashService(
            PettyCashRepository repository,
            PettyCashMapper mapper,
            PettyCashValidator validator,
            KioskRegistryService kioskRegistry,
            TreasuryService treasuryService,
            FinanceBusinessTimeZoneResolver timeZoneResolver,
            HrPayrollExternalDeductionService payrollExternalDeductionService) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
        this.kioskRegistry = kioskRegistry;
        this.treasuryService = treasuryService;
        this.timeZoneResolver = timeZoneResolver;
        this.payrollExternalDeductionService = payrollExternalDeductionService;
    }

    @Transactional
    public PettyCashWorkspaceResponse workspace(FinanceContext context) {
        var fundRecords = repository.findFunds(context);
        var currentPeriod = YearMonth.now(timeZoneResolver.resolve(context.companyId()));
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
        postOpeningFundBalance(context, fund);
        ensureStatement(context, fund, null, LocalDate.now(timeZoneResolver.resolve(context.companyId())));
        synchronizeKioskDefinition(fund, context.userId());
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
        var saved = requireFund(context, fundId);
        synchronizeKioskDefinition(saved, context.userId());
        return mapper.toResponse(saved);
    }

    @Transactional
    public DeletePettyCashFundResponse deleteFund(FinanceContext context, long fundId) {
        var fund = requireFund(context, fundId);
        if (fund.kioskPublicToken() != null && !fund.kioskPublicToken().isBlank()) {
            kioskRegistry.deleteDefinition(
                context.companyId(), PettyCashKioskCapabilities.OWNER_MODULE, fundId,
                context.userId(), "Deleted with petty cash fund");
        }
        if (!repository.softDeleteFund(context, fundId)) {
            throw new NoSuchElementException("Petty cash fund not found.");
        }
        return new DeletePettyCashFundResponse(true);
    }

    @Transactional
    public PettyCashFundResponse rotateKioskPublicToken(FinanceContext context, long fundId) {
        var fund = requireFund(context, fundId);
        synchronizeKioskDefinition(fund, context.userId());
        var kioskPublicToken = generateUniqueKioskPublicToken();
        var kioskAccessUrl = "/petty-cash/kiosk/" + kioskPublicToken;
        if (!repository.rotateKioskPublicToken(context, fundId, kioskPublicToken, kioskAccessUrl)) {
            throw new NoSuchElementException("Petty cash fund not found.");
        }
        kioskRegistry.replacePublicToken(
            context.companyId(), PettyCashKioskCapabilities.OWNER_MODULE,
            fundId, kioskPublicToken, context.userId());
        return getFund(context, fundId);
    }

    @Transactional
    public PettyCashFundResponse transitionKiosk(
            FinanceContext context,
            long fundId,
            KioskDefinitionStatus target,
            String reason) {
        var fund = requireFund(context, fundId);
        if (fund.kioskPublicToken() == null || fund.kioskPublicToken().isBlank()) {
            throw FinanceApiException.badRequest("The petty cash fund does not have a kiosk link.");
        }
        synchronizeKioskDefinition(fund, context.userId());
        kioskRegistry.transition(
            context.companyId(), PettyCashKioskCapabilities.OWNER_MODULE, fundId,
            target, context.userId(), reason);
        if (!repository.updateKioskEnabled(
                context, fundId, target == KioskDefinitionStatus.ACTIVE)) {
            throw new NoSuchElementException("Petty cash fund not found.");
        }
        return getFund(context, fundId);
    }

    @Transactional
    public PettyCashFundResponse deleteKioskAccess(FinanceContext context, long fundId) {
        var fund = requireFund(context, fundId);
        if (fund.kioskPublicToken() != null && !fund.kioskPublicToken().isBlank()) {
            kioskRegistry.deleteDefinition(
                context.companyId(), PettyCashKioskCapabilities.OWNER_MODULE, fundId,
                context.userId(), "Petty cash kiosk access deleted");
        }
        if (!repository.clearKioskAccess(context, fundId)) {
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
            command.amount(), command.currencyCode(), command.movementDate(), command.externalSourceName(), command.reference(),
            command.createdByUserId(), command.customFieldsJson(), command.metadataJson()
        );
        requireResolvedMovementAccounts(fund, command);
        var movement = repository.insertMovement(context, fund.id(), command);
        var balanceDelta = balanceDelta(command.type(), command.amount());
        if (balanceDelta.signum() != 0) {
            repository.adjustFundBalance(context, fund.id(), balanceDelta);
        }
        applyPaymentAccountImpact(context, fund, command, movement.id());
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
        postFundAccountMovement(
            context, fund, fund.paymentAccountId(), command.totalAmount().negate(),
            "FUND_EXPENSE", String.valueOf(line.id()), "FUND_EXPENSE:" + line.id(),
            "Salida del fondo por comprobante"
        );
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
        if (line.status() == PettyCashSettlementLineStatus.DRAFT || line.attachmentCount() <= 0) {
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
    public void deleteSettlementLine(
            FinanceContext context,
            long fundId,
            long settlementLineId,
            String cancellationReason) {
        var reason = normalizeCancellationReason(cancellationReason);
        var fund = requireFund(context, fundId);
        var line = requireSettlementLine(context, settlementLineId);
        if (!line.pettyCashFundId().equals(fund.id())) {
            throw FinanceApiException.badRequest("settlementLineId does not belong to this fund.");
        }
        if (line.status() == PettyCashSettlementLineStatus.REVERSED) {
            throw FinanceApiException.conflict("Petty cash settlement line is already reversed.");
        }
        var hasGeneratedExpense = line.status() == PettyCashSettlementLineStatus.EXPENSE_CREATED;
        if (hasGeneratedExpense && line.expenseId() == null) {
            throw FinanceApiException.conflict("Petty cash settlement line is marked as expense created but has no linked expense.");
        }
        if (hasGeneratedExpense && !repository.reverseGeneratedExpense(context, line.expenseId(), line.id(), reason)) {
            throw FinanceApiException.conflict("The linked petty cash expense could not be reversed.");
        }
        if (!repository.reverseSettlementLine(context, line, reason)) {
            throw new NoSuchElementException("Petty cash settlement line not found.");
        }
        repository.adjustFundBalance(context, fund.id(), line.totalAmount());
        postFundAccountMovement(
            context, fund, fund.paymentAccountId(), line.totalAmount(),
            "FUND_EXPENSE_REVERSAL", String.valueOf(line.id()), "FUND_EXPENSE_REVERSAL:" + line.id(),
            "Reversión de salida del fondo · " + reason
        );
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
        var statement = repository.findStatementByIdForUpdate(context, statementId)
            .orElseThrow(() -> new NoSuchElementException("Petty cash statement not found."));
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
        var closeDate = request.closeDate() == null
            ? LocalDate.now(timeZoneResolver.resolve(context.companyId()))
            : request.closeDate();
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
                    fund.fundingSourcePaymentAccountId() == null ? fund.fundingSourceName() : null,
                    normalizeCloseReference(request.reference(), "Cierre de corte: devolucion a origen"),
                    context.userId(), null, null
                );
                requireResolvedMovementAccounts(fund, command);
                var movement = repository.insertMovement(context, fund.id(), command);
                repository.adjustFundBalance(context, fund.id(), closingBalance.negate());
                applyPaymentAccountImpact(context, fund, command, movement.id());
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
                    null,
                    normalizeCloseReference(request.reference(), "Cierre de corte: faltante"),
                    context.userId(), null, null
                );
                var movement = repository.insertMovement(context, fund.id(), command);
                if (action == PettyCashStatementCloseAction.CHARGE_EMPLOYEE) {
                    if (fund.responsibleUserId() == null) {
                        throw FinanceApiException.badRequest(
                            "The fund must have a responsible collaborator before charging a shortage to payroll."
                        );
                    }
                    payrollExternalDeductionService.queueFundShortageDeduction(
                        context.companyId(),
                        fund.responsibleUserId(),
                        fund.id(),
                        fund.name(),
                        statement.id(),
                        statement.folio(),
                        shortageAmount,
                        fund.currencyCode(),
                        closeDate,
                        context.userId()
                    );
                }
                repository.adjustFundBalance(context, fund.id(), shortageAmount.negate());
                postFundAccountMovement(
                    context, fund, fund.paymentAccountId(), shortageAmount.negate(),
                    "FUND_SHORTAGE", String.valueOf(movement.id()), "FUND_SHORTAGE:" + movement.id(),
                    "Ajuste de faltante del fondo"
                );
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
            return requireMutableStatement(statement);
        }
        var date = activityDate == null
            ? LocalDate.now(timeZoneResolver.resolve(context.companyId()))
            : activityDate;
        var period = YearMonth.from(date);
        var periodKey = period.toString();
        return repository.findOpenStatementForFund(context, fund.id(), periodKey)
            .map(this::requireMutableStatement)
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

    private PettyCashStatementRecord requireMutableStatement(PettyCashStatementRecord statement) {
        if (statement.status() != PettyCashStatementStatus.OPEN
                && statement.status() != PettyCashStatementStatus.CUT_PENDING) {
            throw FinanceApiException.conflict("Petty cash statement is closed and cannot receive new activity.");
        }
        return statement;
    }

    private void postOpeningFundBalance(FinanceContext context, PettyCashFundRecord fund) {
        var openingBalance = fund.currentBalanceAmount();
        if (openingBalance == null || openingBalance.signum() == 0) {
            return;
        }
        if (fund.paymentAccountId() == null) {
            throw FinanceApiException.badRequest("A fund with an opening balance requires a payment account.");
        }
        if (fund.fundingSourcePaymentAccountId() != null) {
            treasuryService.transferAvailable(
                context.companyId(), fund.fundingSourcePaymentAccountId(), fund.paymentAccountId(),
                fund.unitId(), fund.businessId(), fund.currencyCode(), openingBalance,
                "FUNDS", "INITIAL_FUNDING", String.valueOf(fund.id()), "FUND_OPENING:" + fund.id(),
                "Apertura del fondo", Instant.now(), context.userId(),
                "{\"fundId\":" + fund.id() + "}"
            );
            return;
        }
        if (fund.fundingSourceName() == null || fund.fundingSourceName().isBlank()) {
            throw FinanceApiException.badRequest("An externally funded opening balance requires a funding source name.");
        }
        postFundAccountMovement(
            context, fund, fund.paymentAccountId(), openingBalance,
            "EXTERNAL_INITIAL_FUNDING", String.valueOf(fund.id()), "FUND_OPENING:" + fund.id(),
            "Apertura externa del fondo · " + fund.fundingSourceName().trim()
        );
    }

    private void applyPaymentAccountImpact(
            FinanceContext context,
            PettyCashFundRecord fund,
            PettyCashMovementCommand command,
            Long movementId) {
        switch (command.type()) {
            case INITIAL_FUNDING, ADDITIONAL_DEPOSIT -> {
                var toAccountId = command.toPaymentAccountId() == null
                    ? fund.paymentAccountId()
                    : command.toPaymentAccountId();
                if (hasExternalSource(command)) {
                    postFundAccountMovement(
                        context, fund, toAccountId, command.amount(),
                        "EXTERNAL_" + command.type().name(), String.valueOf(movementId),
                        "FUND_EXTERNAL_IN:" + movementId,
                        movementDescription(command, "Entrada externa desde " + command.externalSourceName().trim())
                    );
                    return;
                }
                var fromAccountId = command.fromPaymentAccountId() == null
                    ? fund.fundingSourcePaymentAccountId()
                    : command.fromPaymentAccountId();
                transferFundAccounts(context, fund, command, movementId, fromAccountId, toAccountId);
            }
            case RETURN_TO_SOURCE -> {
                var fromAccountId = command.fromPaymentAccountId() == null
                    ? fund.paymentAccountId()
                    : command.fromPaymentAccountId();
                if (hasExternalSource(command)) {
                    postFundAccountMovement(
                        context, fund, fromAccountId, command.amount().negate(),
                        "EXTERNAL_RETURN_TO_SOURCE", String.valueOf(movementId),
                        "FUND_EXTERNAL_OUT:" + movementId,
                        movementDescription(command, "Devolucion externa a " + command.externalSourceName().trim())
                    );
                    return;
                }
                var toAccountId = command.toPaymentAccountId() == null
                    ? fund.fundingSourcePaymentAccountId()
                    : command.toPaymentAccountId();
                transferFundAccounts(context, fund, command, movementId, fromAccountId, toAccountId);
            }
            case CARRY_FORWARD, SHORTAGE_ADJUSTMENT, FORGIVEN_SHORTAGE, EMPLOYEE_CHARGE -> {
            }
        }
    }

    private void transferFundAccounts(
            FinanceContext context,
            PettyCashFundRecord fund,
            PettyCashMovementCommand command,
            Long movementId,
            Long fromAccountId,
            Long toAccountId) {
        if (fromAccountId == null || toAccountId == null) {
            throw FinanceApiException.badRequest("Petty cash movement requires resolved payment accounts.");
        }
        treasuryService.transferAvailable(
            context.companyId(), fromAccountId, toAccountId, fund.unitId(), fund.businessId(),
            fund.currencyCode(), command.amount(), "FUNDS", command.type().name(),
            String.valueOf(movementId), "FUND_TRANSFER:" + movementId,
            command.reference() == null ? "Movimiento entre cuentas del fondo" : command.reference(),
            Instant.now(), context.userId(),
            "{\"fundId\":" + fund.id() + "}"
        );
    }

    private void postFundAccountMovement(
            FinanceContext context,
            PettyCashFundRecord fund,
            Long paymentAccountId,
            BigDecimal delta,
            String sourceType,
            String sourceId,
            String eventKey,
            String description) {
        if (delta == null || delta.signum() == 0) {
            return;
        }
        if (paymentAccountId == null) {
            throw FinanceApiException.badRequest("Fund activity that changes money requires a payment account.");
        }
        treasuryService.post(new TreasuryMovementCommand(
            context.companyId(), paymentAccountId, fund.unitId(), fund.businessId(), fund.currencyCode(),
            "FUNDS", sourceType, sourceId, eventKey, delta, BigDecimal.ZERO, description,
            Instant.now(), context.userId(), null,
            "{\"fundId\":" + fund.id() + "}"
        ));
    }

    private void requireResolvedMovementAccounts(PettyCashFundRecord fund, PettyCashMovementCommand command) {
        var accountPlan = resolveMovementAccountPlan(fund, command);
        if (accountPlan == null) {
            if (hasExternalSource(command)) {
                throw FinanceApiException.badRequest(
                    "externalSourceName is only valid for funding deposits and returns to an external source."
                );
            }
            return;
        }
        if (hasExternalSource(command)) {
            if (command.fromPaymentAccountId() != null && command.type() != PettyCashMovementType.RETURN_TO_SOURCE) {
                throw FinanceApiException.badRequest("Choose either an internal source account or an external source, not both.");
            }
            if (command.toPaymentAccountId() != null && command.type() == PettyCashMovementType.RETURN_TO_SOURCE) {
                throw FinanceApiException.badRequest("Choose either an internal destination account or an external destination, not both.");
            }
            var ownedAccountId = command.type() == PettyCashMovementType.RETURN_TO_SOURCE
                ? accountPlan.fromPaymentAccountId()
                : accountPlan.toPaymentAccountId();
            if (ownedAccountId == null) {
                throw FinanceApiException.badRequest("Externally funded activity requires the fund payment account.");
            }
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
                hasExternalSource(command) ? null : (command.fromPaymentAccountId() == null ? fund.fundingSourcePaymentAccountId() : command.fromPaymentAccountId()),
                command.toPaymentAccountId() == null ? fund.paymentAccountId() : command.toPaymentAccountId()
            );
            case RETURN_TO_SOURCE -> new MovementAccountPlan(
                command.fromPaymentAccountId() == null ? fund.paymentAccountId() : command.fromPaymentAccountId(),
                hasExternalSource(command) ? null : (command.toPaymentAccountId() == null ? fund.fundingSourcePaymentAccountId() : command.toPaymentAccountId())
            );
            case CARRY_FORWARD, SHORTAGE_ADJUSTMENT, FORGIVEN_SHORTAGE, EMPLOYEE_CHARGE -> null;
        };
    }

    private record MovementAccountPlan(Long fromPaymentAccountId, Long toPaymentAccountId) {
    }

    private boolean hasExternalSource(PettyCashMovementCommand command) {
        return command.externalSourceName() != null && !command.externalSourceName().isBlank();
    }

    private String movementDescription(PettyCashMovementCommand command, String fallback) {
        return command.reference() == null || command.reference().isBlank()
            ? fallback
            : fallback + " · " + command.reference().trim();
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

    private String normalizeCancellationReason(String value) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.length() < 8) {
            throw FinanceApiException.badRequest("cancellationReason must contain at least 8 characters.");
        }
        if (normalized.length() > 500) {
            throw FinanceApiException.badRequest("cancellationReason must contain at most 500 characters.");
        }
        return normalized;
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

    private void synchronizeKioskDefinition(PettyCashFundRecord fund, long actorId) {
        if (fund.kioskPublicToken() == null || fund.kioskPublicToken().isBlank()) {
            return;
        }
        var legacyStatus = Boolean.TRUE.equals(fund.kioskEnabled())
            && fund.deletedAt() == null && fund.status() != PettyCashFundStatus.CLOSED
            ? "ACTIVE" : "INACTIVE";
        var definition = kioskRegistry.registerLegacyDefinition(
            fund.companyId(), PettyCashKioskCapabilities.OWNER_MODULE,
            PettyCashKioskCapabilities.KIOSK_TYPE,
            fund.id(), "petty-cash-fund-" + fund.id(), fund.name(), legacyStatus,
            fund.unitId(), fund.businessId(), null, fund.kioskPublicToken(), true,
            KioskAccessLevel.CONTROLLED, "petty-cash", "es-MX", actorId);
        kioskRegistry.synchronizeCapabilities(definition, PettyCashKioskCapabilities.descriptors());
        kioskRegistry.synchronizeEmployeeCenter(definition, true, "SCOPE");
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
