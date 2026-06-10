package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.paymentaccounts.dto.DeletePaymentAccountResponse;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountListResponse;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountResponse;
import com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentAccountService {

    private final PaymentAccountRepository repository;
    private final PaymentAccountMapper mapper;
    private final PaymentAccountValidator validator;
    private final PaymentAccountReferenceValidator referenceValidator;

    public PaymentAccountService(
            PaymentAccountRepository repository,
            PaymentAccountMapper mapper,
            PaymentAccountValidator validator,
            PaymentAccountReferenceValidator referenceValidator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
        this.referenceValidator = referenceValidator;
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
        return mapper.toResponse(repository.insert(context, command));
    }

    @Transactional
    public PaymentAccountResponse update(FinanceContext context, long accountId, UpdatePaymentAccountRequest request) {
        requireAccount(context, accountId);
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
        requireAccount(context, accountId);
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
}
