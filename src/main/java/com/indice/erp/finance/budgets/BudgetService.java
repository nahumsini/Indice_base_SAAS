package com.indice.erp.finance.budgets;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgets.dto.BudgetListResponse;
import com.indice.erp.finance.budgets.dto.BudgetResponse;
import com.indice.erp.finance.budgets.dto.CreateBudgetRequest;
import com.indice.erp.finance.budgets.dto.DeleteBudgetResponse;
import com.indice.erp.finance.budgets.dto.UpdateBudgetRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.time.LocalDate;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BudgetService {

    private final BudgetRepository repository;
    private final BudgetMapper mapper;
    private final BudgetValidator validator;

    public BudgetService(BudgetRepository repository, BudgetMapper mapper, BudgetValidator validator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public BudgetListResponse list(FinanceContext context) {
        var budgets = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new BudgetListResponse(budgets, budgets.size());
    }

    @Transactional(readOnly = true)
    public BudgetResponse get(FinanceContext context, long budgetId) {
        return mapper.toResponse(requireBudget(context, budgetId));
    }

    @Transactional
    public BudgetResponse create(FinanceContext context, CreateBudgetRequest request) {
        var assignment = validator.validateCreate(context, request);
        var command = mapper.toCreateCommand(context, request, assignment);
        requireUniqueNameAndPeriod(context, command.name(), command.periodStart(), command.periodEnd(), null);
        return mapper.toResponse(repository.insert(context, command));
    }

    @Transactional
    public BudgetResponse update(FinanceContext context, long budgetId, UpdateBudgetRequest request) {
        requireBudget(context, budgetId);
        var assignment = validator.validateUpdate(context, request);
        var command = mapper.toUpdateCommand(context, request, assignment);
        requireUniqueNameAndPeriod(context, command.name(), command.periodStart(), command.periodEnd(), budgetId);
        if (!repository.update(context, budgetId, command)) {
            throw new NoSuchElementException("Budget not found.");
        }
        return get(context, budgetId);
    }

    @Transactional
    public DeleteBudgetResponse delete(FinanceContext context, long budgetId) {
        requireBudget(context, budgetId);
        if (!repository.softDelete(context, budgetId)) {
            throw new NoSuchElementException("Budget not found.");
        }
        return new DeleteBudgetResponse(true);
    }

    private void requireUniqueNameAndPeriod(
            FinanceContext context,
            String name,
            LocalDate periodStart,
            LocalDate periodEnd,
            Long excludedBudgetId) {
        if (repository.existsByNameAndPeriod(context, name, periodStart, periodEnd, excludedBudgetId)) {
            throw FinanceApiException.conflict("Budget already exists for this name and period.");
        }
    }

    private BudgetRecord requireBudget(FinanceContext context, long budgetId) {
        return repository.findById(context, budgetId)
            .orElseThrow(() -> new NoSuchElementException("Budget not found."));
    }
}
