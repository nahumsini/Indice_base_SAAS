package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.paymentaccounts.dto.DeletePaymentAccountResponse;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountListResponse;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountResponse;
import com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentAccountService {

    private final PaymentAccountRepository repository;
    private final PaymentAccountMapper mapper;
    private final PaymentAccountValidator validator;
    private final PaymentAccountReferenceValidator referenceValidator;
    private final TreasuryService treasuryService;

    public PaymentAccountService(
            PaymentAccountRepository repository,
            PaymentAccountMapper mapper,
            PaymentAccountValidator validator,
            PaymentAccountReferenceValidator referenceValidator,
            TreasuryService treasuryService) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
        this.referenceValidator = referenceValidator;
        this.treasuryService = treasuryService;
    }

    @Transactional(readOnly = true)
    public PaymentAccountListResponse list(FinanceContext context) {
        var accounts = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new PaymentAccountListResponse(accounts, accounts.size());
    }

    @Transactional(readOnly = true)
    public PaymentAccountResponse get(FinanceContext context, long accountId) {
        return mapper.toResponse(requireAccount(context, accountId));
    }

    @Transactional
    public PaymentAccountResponse create(FinanceContext context, CreatePaymentAccountRequest request) {
        var assignment = validator.validateCreate(context, request);
        referenceValidator.validateAssignment(context, assignment);
        var command = mapper.toCreateCommand(context, request, assignment);
        requireUniqueName(context, command.name(), null);
        var created = repository.insert(context, command);
        if (created.openingBalance() != null && created.openingBalance().signum() != 0) {
            treasuryService.post(new TreasuryMovementCommand(
                context.companyId(), created.id(), created.unitId(), created.businessId(), created.currencyCode(),
                "FINANCE", "PAYMENT_ACCOUNT_OPENING", String.valueOf(created.id()),
                "PAYMENT_ACCOUNT_OPENING:" + created.id(), created.openingBalance(), BigDecimal.ZERO,
                "Saldo inicial de la cuenta", Instant.now(), context.userId(), null,
                "{\"owner\":\"PAYMENT_ACCOUNTS\"}"
            ));
            created = requireAccount(context, created.id());
        }
        return mapper.toResponse(created);
    }

    @Transactional
    public PaymentAccountResponse update(FinanceContext context, long accountId, UpdatePaymentAccountRequest request) {
        var existing = requireAccount(context, accountId);
        requireUserManaged(existing);
        var assignment = validator.validateUpdate(context, request);
        referenceValidator.validateAssignment(context, assignment);
        var command = mapper.toUpdateCommand(context, request, assignment);
        requireUniqueName(context, command.name(), accountId);
        if (!repository.update(context, accountId, command)) {
            throw new NoSuchElementException("Payment account not found.");
        }
        return get(context, accountId);
    }

    @Transactional
    public DeletePaymentAccountResponse delete(FinanceContext context, long accountId) {
        var existing = requireAccount(context, accountId);
        requireUserManaged(existing);
        if (!repository.softDelete(context, accountId)) {
            throw new NoSuchElementException("Payment account not found.");
        }
        return new DeletePaymentAccountResponse(true);
    }

    private void requireUniqueName(FinanceContext context, String name, Long excludedAccountId) {
        if (repository.existsByName(context, name, excludedAccountId)) {
            throw FinanceApiException.conflict("Payment account name already exists for this company.");
        }
    }

    private PaymentAccountRecord requireAccount(FinanceContext context, long accountId) {
        return repository.findById(context, accountId)
            .orElseThrow(() -> new NoSuchElementException("Payment account not found."));
    }

    private void requireUserManaged(PaymentAccountRecord account) {
        if (account.systemManaged()) {
            throw FinanceApiException.conflict("System-managed payment accounts cannot be modified or deleted.");
        }
    }
}
