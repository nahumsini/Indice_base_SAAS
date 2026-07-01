package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.BudgetLineRollupService;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.DeleteExpenseResponse;
import com.indice.erp.finance.expenses.dto.ExpenseListResponse;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.RecordExpensePaymentRequest;
import com.indice.erp.finance.expenses.dto.RejectExpenseRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {

    private final ExpenseRepository repository;
    private final ExpenseWorkflowRepository workflowRepository;
    private final BudgetLineRollupService budgetLineRollupService;
    private final ExpenseMapper mapper;
    private final ExpenseValidator validator;
    private final ExpenseReferenceValidator referenceValidator;

    public ExpenseService(
            ExpenseRepository repository,
            ExpenseWorkflowRepository workflowRepository,
            BudgetLineRollupService budgetLineRollupService,
            ExpenseMapper mapper,
            ExpenseValidator validator,
            ExpenseReferenceValidator referenceValidator) {
        this.repository = repository;
        this.workflowRepository = workflowRepository;
        this.budgetLineRollupService = budgetLineRollupService;
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

    @Transactional
    public ExpenseResponse submitForApproval(FinanceContext context, long expenseId) {
        var existing = requireExpense(context, expenseId);
        requireStatus(existing, List.of(ExpenseStatus.DRAFT), "submitted for approval");
        transition(context, expenseId, List.of(ExpenseStatus.DRAFT), ExpenseStatus.PENDING_APPROVAL,
            existing.paymentStatus(), null, null, null);
        return get(context, expenseId);
    }

    @Transactional
    public ExpenseResponse approve(FinanceContext context, long expenseId) {
        var existing = requireExpense(context, expenseId);
        requireStatus(existing, List.of(ExpenseStatus.PENDING_APPROVAL), "approved");
        transition(context, expenseId, List.of(ExpenseStatus.PENDING_APPROVAL), ExpenseStatus.APPROVED,
            PaymentStatus.UNPAID, context.userId(), null, null);
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    @Transactional
    public ExpenseResponse reject(FinanceContext context, long expenseId, RejectExpenseRequest request) {
        var existing = requireExpense(context, expenseId);
        requireStatus(existing, List.of(ExpenseStatus.PENDING_APPROVAL), "rejected");
        transition(context, expenseId, List.of(ExpenseStatus.PENDING_APPROVAL), ExpenseStatus.REJECTED,
            existing.paymentStatus(), null, "REJECTED", null);
        return get(context, expenseId);
    }

    @Transactional
    public ExpenseResponse cancel(FinanceContext context, long expenseId) {
        var existing = requireExpense(context, expenseId);
        requireStatus(existing, List.of(ExpenseStatus.DRAFT, ExpenseStatus.PENDING_APPROVAL, ExpenseStatus.APPROVED), "cancelled");
        transition(context, expenseId, List.of(ExpenseStatus.DRAFT, ExpenseStatus.PENDING_APPROVAL, ExpenseStatus.APPROVED),
            ExpenseStatus.CANCELLED, existing.paymentStatus(), null, "CANCELLED", null);
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    @Transactional
    public ExpenseResponse recordPayment(FinanceContext context, long expenseId, RecordExpensePaymentRequest request) {
        var existing = requireExpense(context, expenseId);
        requireStatus(existing, List.of(ExpenseStatus.APPROVED, ExpenseStatus.PARTIALLY_PAID, ExpenseStatus.PAID), "paid");
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw FinanceApiException.badRequest("Payment amount must be greater than zero.");
        }
        if (existing.balanceAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw FinanceApiException.conflict("Expense is already paid.");
        }
        if (request.amount().compareTo(existing.balanceAmount()) > 0) {
            throw FinanceApiException.badRequest("Payment amount cannot exceed balanceAmount.");
        }

        var paidAmount = existing.paidAmount().add(request.amount());
        var balanceAmount = existing.totalAmount().subtract(paidAmount).max(BigDecimal.ZERO);
        var fullyPaid = balanceAmount.compareTo(BigDecimal.ZERO) == 0;
        var nextStatus = fullyPaid ? ExpenseStatus.PAID : ExpenseStatus.PARTIALLY_PAID;
        var nextPaymentStatus = fullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;
        if (!workflowRepository.recordPayment(context, expenseId, paidAmount, balanceAmount, nextStatus,
                nextPaymentStatus, request.paymentDate())) {
            throw FinanceApiException.conflict("Expense payment could not be recorded.");
        }
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    @Transactional
    public ExpenseResponse close(FinanceContext context, long expenseId) {
        var existing = requireExpense(context, expenseId);
        requireStatus(existing, List.of(ExpenseStatus.PAID), "closed");
        transition(context, expenseId, List.of(ExpenseStatus.PAID), ExpenseStatus.CLOSED,
            PaymentStatus.PAID, existing.approvedByUserId(), "AUDITED", java.time.LocalDate.now());
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    private ExpenseRecord requireExpense(FinanceContext context, long expenseId) {
        return repository.findById(context, expenseId)
            .orElseThrow(() -> new NoSuchElementException("Expense not found."));
    }

    private void requireStatus(ExpenseRecord record, List<ExpenseStatus> allowedStatuses, String action) {
        if (!allowedStatuses.contains(record.status())) {
            throw FinanceApiException.conflict("Expense cannot be " + action + " from status " + record.status() + ".");
        }
    }

    private void transition(
            FinanceContext context,
            long expenseId,
            List<ExpenseStatus> allowedStatuses,
            ExpenseStatus nextStatus,
            PaymentStatus nextPaymentStatus,
            Long approvedByUserId,
            String auditStatus,
            java.time.LocalDate closeDate) {
        if (!workflowRepository.transitionStatus(context, expenseId, allowedStatuses, nextStatus,
                nextPaymentStatus, approvedByUserId, auditStatus, closeDate)) {
            throw FinanceApiException.conflict("Expense workflow transition could not be applied.");
        }
    }

    private void refreshBudgetLine(FinanceContext context, Long budgetLineId) {
        budgetLineRollupService.refreshExpenseImpact(context, budgetLineId);
    }
}
