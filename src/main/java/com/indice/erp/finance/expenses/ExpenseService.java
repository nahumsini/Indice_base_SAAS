package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.DeleteExpenseResponse;
import com.indice.erp.finance.expenses.dto.ExpenseListResponse;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {

    private final ExpenseRepository repository;
    private final ExpenseMapper mapper;
    private final ExpenseValidator validator;
    private final ExpenseReferenceValidator referenceValidator;

    public ExpenseService(
            ExpenseRepository repository,
            ExpenseMapper mapper,
            ExpenseValidator validator,
            ExpenseReferenceValidator referenceValidator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
        this.referenceValidator = referenceValidator;
    }

    @Transactional(readOnly = true)
    public ExpenseListResponse list(FinanceContext context) {
        var expenses = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new ExpenseListResponse(expenses, expenses.size());
    }

    @Transactional(readOnly = true)
    public ExpenseResponse get(FinanceContext context, long expenseId) {
        return mapper.toResponse(requireExpense(context, expenseId));
    }

    @Transactional
    public ExpenseResponse createDraft(FinanceContext context, CreateExpenseRequest request) {
        var assignment = validator.validateCreate(context, request);
        referenceValidator.validateCreate(context, assignment, request);
        var command = mapper.toCreateCommand(context, request, assignment);
        return mapper.toResponse(repository.insert(context, command));
    }

    @Transactional
    public ExpenseResponse updateDraft(FinanceContext context, long expenseId, UpdateExpenseRequest request) {
        var existing = requireExpense(context, expenseId);
        validator.requireDraft(existing, "updated");
        var assignment = validator.validateUpdate(context, request);
        referenceValidator.validateUpdate(context, assignment, request);
        var command = mapper.toUpdateCommand(context, request, assignment, existing);
        if (!repository.update(context, expenseId, command)) {
            throw FinanceApiException.conflict("Only draft expenses can be updated.");
        }
        return get(context, expenseId);
    }

    @Transactional
    public DeleteExpenseResponse deleteDraft(FinanceContext context, long expenseId) {
        var existing = requireExpense(context, expenseId);
        validator.requireDraft(existing, "deleted");
        if (!repository.softDelete(context, expenseId)) {
            throw FinanceApiException.conflict("Only draft expenses can be deleted.");
        }
        return new DeleteExpenseResponse(true);
    }

    private ExpenseRecord requireExpense(FinanceContext context, long expenseId) {
        return repository.findById(context, expenseId)
            .orElseThrow(() -> new NoSuchElementException("Expense not found."));
    }
}
