package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.accountingaccounts.dto.AccountingAccountListResponse;
import com.indice.erp.finance.accountingaccounts.dto.AccountingAccountResponse;
import com.indice.erp.finance.accountingaccounts.dto.CreateAccountingAccountRequest;
import com.indice.erp.finance.accountingaccounts.dto.DeleteAccountingAccountResponse;
import com.indice.erp.finance.accountingaccounts.dto.UpdateAccountingAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountingAccountService {

    private final AccountingAccountRepository repository;
    private final AccountingAccountMapper mapper;
    private final AccountingAccountValidator validator;
    private final AccountingAccountReferenceValidator referenceValidator;

    public AccountingAccountService(
            AccountingAccountRepository repository,
            AccountingAccountMapper mapper,
            AccountingAccountValidator validator,
            AccountingAccountReferenceValidator referenceValidator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
        this.referenceValidator = referenceValidator;
    }

    @Transactional(readOnly = true)
    public AccountingAccountListResponse list(FinanceContext context) {
        var accounts = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new AccountingAccountListResponse(accounts, accounts.size());
    }

    @Transactional(readOnly = true)
    public AccountingAccountResponse get(FinanceContext context, long accountId) {
        return mapper.toResponse(requireAccount(context, accountId));
    }

    @Transactional
    public AccountingAccountResponse create(FinanceContext context, CreateAccountingAccountRequest request) {
        var assignment = validator.validateCreate(context, request);
        referenceValidator.validateAssignment(context, assignment);
        var command = mapper.toCreateCommand(context, request, assignment);
        requireUnique(context, command, null);
        return mapper.toResponse(repository.insert(context, command));
    }

    @Transactional
    public AccountingAccountResponse update(
            FinanceContext context,
            long accountId,
            UpdateAccountingAccountRequest request) {
        requireAccount(context, accountId);
        var assignment = validator.validateUpdate(context, request);
        referenceValidator.validateAssignment(context, assignment);
        var command = mapper.toUpdateCommand(context, request, assignment);
        requireUnique(context, command, accountId);
        if (!repository.update(context, accountId, command)) {
            throw new NoSuchElementException("Accounting account not found.");
        }
        return get(context, accountId);
    }

    @Transactional
    public DeleteAccountingAccountResponse delete(FinanceContext context, long accountId) {
        requireAccount(context, accountId);
        if (!repository.softDelete(context, accountId)) {
            throw new NoSuchElementException("Accounting account not found.");
        }
        return new DeleteAccountingAccountResponse(true);
    }

    private void requireUnique(FinanceContext context, AccountingAccountCommand command, Long excludedAccountId) {
        if (repository.existsByCode(context, command.code(), excludedAccountId)) {
            throw FinanceApiException.conflict("Accounting account code already exists for this company.");
        }
        if (repository.existsByName(context, command.name(), excludedAccountId)) {
            throw FinanceApiException.conflict("Accounting account name already exists for this company.");
        }
    }

    private AccountingAccountRecord requireAccount(FinanceContext context, long accountId) {
        return repository.findById(context, accountId)
            .orElseThrow(() -> new NoSuchElementException("Accounting account not found."));
    }
}
