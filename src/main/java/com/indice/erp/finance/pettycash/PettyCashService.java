package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.DeletePettyCashFundResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashFundResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashMovementMutationResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashSettlementLineMutationResponse;
import com.indice.erp.finance.pettycash.dto.PettyCashWorkspaceResponse;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
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

    public PettyCashService(PettyCashRepository repository, PettyCashMapper mapper, PettyCashValidator validator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public PettyCashWorkspaceResponse workspace(FinanceContext context) {
        var funds = repository.findFunds(context).stream().map(mapper::toResponse).toList();
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
        return mapper.toResponse(repository.insertFund(context, command));
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
        var movement = repository.insertMovement(context, fund.id(), command);
        var balanceDelta = balanceDelta(command.type(), command.amount());
        if (balanceDelta.signum() != 0) {
            repository.adjustFundBalance(context, fund.id(), balanceDelta);
        }
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
        command = new PettyCashSettlementLineCommand(
            statement.id(), command.expenseId(), command.providerId(), command.accountingAccountId(),
            command.description(), command.receiptReference(), command.subtotalAmount(), command.taxAmount(),
            command.totalAmount(), command.currencyCode(), command.expenseDate(), command.attachmentCount(),
            command.status(), command.createdByUserId(), command.customFieldsJson(), command.metadataJson()
        );
        var line = repository.insertSettlementLine(context, fund.id(), command);
        var expenseId = repository.insertExpenseFromSettlementLine(context, fund, statement, line);
        repository.linkSettlementLineExpense(context, line.id(), expenseId);
        repository.adjustFundBalance(context, fund.id(), command.totalAmount().negate());
        repository.applySettlementLineToStatement(context, statement.id(), command.totalAmount(), command.attachmentCount());
        repository.applySettlementLineToBudgetLine(context, fund.budgetLineId(), command.totalAmount());
        return new PettyCashSettlementLineMutationResponse(
            mapper.toResponse(requireFund(context, fund.id())),
            mapper.toResponse(requireStatement(context, statement.id())),
            mapper.toResponse(repository.findSettlementLineById(context, line.id()).orElse(line))
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
                var periodEnd = period.atDay(Math.min(fund.cutOffDay(), period.lengthOfMonth()));
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

    private void requireCurrencyMatch(PettyCashFundRecord fund, String currencyCode) {
        if (!fund.currencyCode().equalsIgnoreCase(currencyCode)) {
            throw FinanceApiException.badRequest("currencyCode must match the petty cash fund currency.");
        }
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
}
