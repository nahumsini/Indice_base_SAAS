package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.UpdateExpenseAccountingAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.status.ExpenseStatus;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseAccountingClassificationService {
    private final ExpenseRepository repository;
    private final ExpenseMapper mapper;
    private final ExpenseReferenceValidator references;

    public ExpenseAccountingClassificationService(ExpenseRepository repository, ExpenseMapper mapper, ExpenseReferenceValidator references) {
        this.repository = repository;
        this.mapper = mapper;
        this.references = references;
    }

    @Transactional
    public ExpenseResponse update(FinanceContext context, long expenseId, UpdateExpenseAccountingAccountRequest request) {
        repository.lockCompanyForCreation(context);
        var existing = repository.findByIdForUpdate(context, expenseId)
            .orElseThrow(() -> FinanceApiException.notFound("Expense not found."));
        if (existing.originFund() != null || "PETTY_CASH".equals(existing.auditStatus())) {
            throw FinanceApiException.conflict("The accounting account belongs to the source fund and cannot be changed here.");
        }
        if (!Objects.equals(request.expectedVersion(), existing.version())) {
            throw FinanceApiException.conflict("The expense changed. Reload it before changing its accounting account.");
        }
        if (Objects.equals(existing.accountingAccountId(), request.accountingAccountId())) return mapper.toResponse(existing);
        if (existing.accountingPosted()) {
            throw FinanceApiException.conflict("This expense has a posted journal entry. Use an accounting adjustment to preserve the ledger.");
        }
        if (existing.status() == ExpenseStatus.CANCELLED || existing.status() == ExpenseStatus.REJECTED) {
            throw FinanceApiException.conflict("Cancelled or rejected expenses cannot be reclassified.");
        }
        references.validateImportAccountingAccount(context, request.accountingAccountId());
        var changed = repository.updateAccountingAccount(context, existing, request.accountingAccountId());
        if (changed != 1) throw FinanceApiException.conflict("The expense changed. Reload it before editing.");
        return mapper.toResponse(repository.findById(context, expenseId).orElseThrow());
    }
}
