package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.dto.BudgetLineListResponse;
import com.indice.erp.finance.budgetlines.dto.BudgetLineResponse;
import com.indice.erp.finance.budgetlines.dto.CreateBudgetLineRequest;
import com.indice.erp.finance.budgetlines.dto.DeleteBudgetLineResponse;
import com.indice.erp.finance.budgetlines.dto.UpdateBudgetLineRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BudgetLineService {

    private final BudgetLineRepository repository;
    private final BudgetLineMapper mapper;
    private final BudgetLineValidator validator;
    private final BudgetLineReferenceValidator referenceValidator;

    public BudgetLineService(BudgetLineRepository repository, BudgetLineMapper mapper,
            BudgetLineValidator validator, BudgetLineReferenceValidator referenceValidator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
        this.referenceValidator = referenceValidator;
    }

    @Transactional(readOnly = true)
    public BudgetLineListResponse list(FinanceContext context) {
        var budgetLines = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new BudgetLineListResponse(budgetLines, budgetLines.size());
    }

    @Transactional(readOnly = true)
    public BudgetLineResponse get(FinanceContext context, long budgetLineId) {
        return mapper.toResponse(requireBudgetLine(context, budgetLineId));
    }

    @Transactional
    public BudgetLineResponse create(FinanceContext context, CreateBudgetLineRequest request) {
        repository.lockCompany(context);
        var assignment = validator.validateCreate(context, request);
        referenceValidator.validateReferences(context, request.budgetId(), assignment);
        var command = mapper.toCreateCommand(context, request, assignment);
        requireUniqueName(context, command.name(), null);
        return mapper.toResponse(repository.insert(context, command));
    }

    @Transactional
    public BudgetLineResponse update(FinanceContext context, long budgetLineId, UpdateBudgetLineRequest request) {
        repository.lockCompany(context);
        var current = repository.findByIdForUpdate(context, budgetLineId)
            .orElseThrow(() -> new NoSuchElementException("Budget line not found."));
        var assignment = validator.validateUpdate(context, request);
        referenceValidator.validateReferences(context, request.budgetId(), assignment);
        var command = mapper.toUpdateCommand(context, request, assignment, current);
        requireUniqueName(context, command.name(), budgetLineId);
        if (!repository.update(context, budgetLineId, command)) {
            throw new NoSuchElementException("Budget line not found.");
        }
        return get(context, budgetLineId);
    }

    @Transactional
    public DeleteBudgetLineResponse delete(FinanceContext context, long budgetLineId) {
        repository.lockCompany(context);
        requireBudgetLine(context, budgetLineId);
        if (repository.hasLinkedExpenses(context, budgetLineId))
            throw FinanceApiException.conflict("Budget lines with linked expenses cannot be deleted. Manage the expense from Expenses.");
        if (!repository.softDelete(context, budgetLineId)) {
            throw new NoSuchElementException("Budget line not found.");
        }
        return new DeleteBudgetLineResponse(true);
    }

    private void requireUniqueName(FinanceContext context, String name, Long excludedBudgetLineId) {
        if (repository.existsByName(context, name, excludedBudgetLineId)) {
            throw FinanceApiException.conflict("Budget line name already exists for this company.");
        }
    }

    private BudgetLineRecord requireBudgetLine(FinanceContext context, long budgetLineId) {
        return repository.findById(context, budgetLineId)
            .orElseThrow(() -> new NoSuchElementException("Budget line not found."));
    }
}
