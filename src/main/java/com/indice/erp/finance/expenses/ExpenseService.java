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
import com.indice.erp.finance.expenses.dto.UpdateExpenseStatusRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {

    private static final String AUTO_EXPENSE_FOLIO = "AUTO-EXP";
    private static final String AUTO_PAYABLE_FOLIO = "AUTO-CXP";
    private static final int AUTO_FOLIO_ATTEMPTS = 10;

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

    @Transactional
    public ExpenseListResponse list(FinanceContext context) {
        workflowRepository.markOverduePayments(context, LocalDate.now());
        var expenses = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new ExpenseListResponse(expenses, expenses.size());
    }

    @Transactional
    public ExpenseResponse get(FinanceContext context, long expenseId) {
        workflowRepository.markOverduePayments(context, LocalDate.now());
        return mapper.toResponse(requireExpense(context, expenseId));
    }

    @Transactional
    public ExpenseResponse createDraft(FinanceContext context, CreateExpenseRequest request) {
        var assignment = validator.validateCreate(context, request);
        referenceValidator.validateCreate(context, assignment, request);
        var autoPrefix = automaticFolioPrefix(request.folio());
        if (autoPrefix == null) {
            try {
                var created = repository.insert(context, mapper.toCreateCommand(context, request, assignment));
                return finalizeCreatedExpense(context, request, created);
            } catch (DuplicateKeyException exception) {
                throw FinanceApiException.conflict("An expense with this folio already exists.");
            }
        }

        for (var attempt = 0; attempt < AUTO_FOLIO_ATTEMPTS; attempt++) {
            var folio = repository.nextFolio(context.companyId(), autoPrefix, LocalDate.now().getYear(), attempt);
            try {
                var command = mapper.toCreateCommand(context, request, assignment, folio);
                var created = repository.insert(context, command);
                return finalizeCreatedExpense(context, request, created);
            } catch (DuplicateKeyException exception) {
                // Another request may have reserved the same sequence. Re-read and retry.
            }
        }
        throw FinanceApiException.conflict("The expense number could not be assigned. Try again.");
    }

    private ExpenseResponse finalizeCreatedExpense(
            FinanceContext context,
            CreateExpenseRequest request,
            ExpenseRecord created) {
        if (!Boolean.TRUE.equals(request.settleOnCreate())) {
            return mapper.toResponse(created);
        }
        if (!workflowRepository.applyManualStatus(
                context,
                created.id(),
                created.totalAmount(),
                BigDecimal.ZERO,
                ExpenseStatus.PAID,
                PaymentStatus.PAID,
                LocalDate.now(),
                null,
                null)) {
            throw FinanceApiException.conflict("Expense could not be marked as paid.");
        }
        refreshBudgetLine(context, created.budgetLineId());
        return get(context, created.id());
    }

    @Transactional
    public ExpenseResponse updateDraft(FinanceContext context, long expenseId, UpdateExpenseRequest request) {
        var existing = requireExpense(context, expenseId);
        if (List.of(ExpenseStatus.CANCELLED, ExpenseStatus.REJECTED).contains(existing.status())) {
            throw FinanceApiException.conflict("Cancelled or rejected expenses cannot be updated.");
        }
        var assignment = validator.validateUpdate(context, request);
        referenceValidator.validateUpdate(context, assignment, request);
        var command = mapper.toUpdateCommand(context, request, assignment, existing);
        if (!repository.update(context, expenseId, command)) {
            throw FinanceApiException.conflict("Expense could not be updated.");
        }
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    @Transactional
    public DeleteExpenseResponse deleteDraft(FinanceContext context, long expenseId) {
        var existing = requireExpense(context, expenseId);
        if (existing.status() != ExpenseStatus.DRAFT && !isUnpaidPayableKioskSubmission(existing)) {
            validator.requireDraft(existing, "deleted");
        }
        if (!repository.softDelete(context, expenseId, existing.status())) {
            throw FinanceApiException.conflict("Expense could not be deleted because its status changed.");
        }
        refreshBudgetLine(context, existing.budgetLineId());
        return new DeleteExpenseResponse(true);
    }

    private boolean isUnpaidPayableKioskSubmission(ExpenseRecord record) {
        return record.metadataJson() != null
            && record.metadataJson().contains("\"source\":\"payable-kiosk\"")
            && record.paidAmount().compareTo(BigDecimal.ZERO) == 0
            && record.paymentStatus() != PaymentStatus.PAID;
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
        referenceValidator.validatePaymentAccountForPayment(context, request.paymentAccountId(), existing.currencyCode());

        var paidAmount = existing.paidAmount().add(request.amount());
        var balanceAmount = existing.totalAmount().subtract(paidAmount).max(BigDecimal.ZERO);
        var fullyPaid = balanceAmount.compareTo(BigDecimal.ZERO) == 0;
        var nextStatus = fullyPaid ? ExpenseStatus.PAID : ExpenseStatus.PARTIALLY_PAID;
        var nextPaymentStatus = fullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;
        if (!workflowRepository.recordPayment(context, expenseId, paidAmount, balanceAmount, nextStatus,
                nextPaymentStatus, request.paymentAccountId(), request.paymentDate())) {
            throw FinanceApiException.conflict("Expense payment could not be recorded.");
        }
        if (!workflowRepository.adjustPaymentAccountBalance(context, request.paymentAccountId(), request.amount().negate())) {
            throw FinanceApiException.conflict("Payment account balance could not be updated.");
        }
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    @Transactional
    public ExpenseResponse updateStatus(FinanceContext context, long expenseId, UpdateExpenseStatusRequest request) {
        var existing = requireExpense(context, expenseId);
        if (List.of(ExpenseStatus.CANCELLED, ExpenseStatus.REJECTED).contains(existing.status())) {
            throw FinanceApiException.conflict("Cancelled or rejected expenses cannot change status.");
        }

        var targetStatus = normalizeLegacyStatus(request.status());
        var total = existing.totalAmount().max(BigDecimal.ZERO);
        var paymentDate = request.paymentDate() == null ? LocalDate.now() : request.paymentDate();

        BigDecimal paidAmount;
        BigDecimal balanceAmount;
        ExpenseStatus nextStatus;
        PaymentStatus nextPaymentStatus;
        LocalDate nextPaymentDate = null;
        LocalDate closeDate = null;
        String auditStatus = null;

        switch (targetStatus) {
            case "pending" -> {
                paidAmount = BigDecimal.ZERO;
                balanceAmount = total;
                nextStatus = ExpenseStatus.APPROVED;
                nextPaymentStatus = PaymentStatus.UNPAID;
            }
            case "overdue" -> {
                paidAmount = existing.paidAmount().min(total).max(BigDecimal.ZERO);
                balanceAmount = total.subtract(paidAmount).max(BigDecimal.ZERO);
                nextStatus = paidAmount.compareTo(BigDecimal.ZERO) > 0
                    ? ExpenseStatus.PARTIALLY_PAID
                    : ExpenseStatus.APPROVED;
                nextPaymentStatus = PaymentStatus.OVERDUE;
                nextPaymentDate = existing.paymentDate();
            }
            case "partial" -> {
                paidAmount = resolvePartialPaidAmount(total, request.paidAmount(), existing.paidAmount());
                balanceAmount = total.subtract(paidAmount).max(BigDecimal.ZERO);
                nextStatus = ExpenseStatus.PARTIALLY_PAID;
                nextPaymentStatus = PaymentStatus.PARTIALLY_PAID;
                nextPaymentDate = paymentDate;
            }
            case "paid" -> {
                paidAmount = total;
                balanceAmount = BigDecimal.ZERO;
                nextStatus = ExpenseStatus.PAID;
                nextPaymentStatus = PaymentStatus.PAID;
                nextPaymentDate = paymentDate;
            }
            case "audited" -> {
                paidAmount = total;
                balanceAmount = BigDecimal.ZERO;
                nextStatus = ExpenseStatus.CLOSED;
                nextPaymentStatus = PaymentStatus.PAID;
                nextPaymentDate = existing.paymentDate() == null ? paymentDate : existing.paymentDate();
                closeDate = LocalDate.now();
                auditStatus = "AUDITED";
            }
            default -> throw FinanceApiException.badRequest("Unsupported expense status.");
        }

        if (!workflowRepository.applyManualStatus(context, expenseId, paidAmount, balanceAmount,
                nextStatus, nextPaymentStatus, nextPaymentDate, auditStatus, closeDate)) {
            throw FinanceApiException.conflict("Expense status could not be updated.");
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

    private String normalizeLegacyStatus(String status) {
        var normalized = status == null ? "" : status.trim().toLowerCase(java.util.Locale.ROOT);
        if (List.of("pending", "overdue", "partial", "paid", "audited").contains(normalized)) {
            return normalized;
        }
        throw FinanceApiException.badRequest("Unsupported expense status.");
    }

    private BigDecimal resolvePartialPaidAmount(BigDecimal total, BigDecimal requestedAmount, BigDecimal currentAmount) {
        if (isPositiveBelowTotal(requestedAmount, total)) {
            return requestedAmount;
        }
        if (isPositiveBelowTotal(currentAmount, total)) {
            return currentAmount;
        }
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return total.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
    }

    private boolean isPositiveBelowTotal(BigDecimal amount, BigDecimal total) {
        return amount != null && amount.compareTo(BigDecimal.ZERO) > 0 && amount.compareTo(total) < 0;
    }

    private String automaticFolioPrefix(String folio) {
        if (folio == null) {
            return null;
        }
        return switch (folio.trim().toUpperCase(java.util.Locale.ROOT)) {
            case AUTO_EXPENSE_FOLIO -> "EXP";
            case AUTO_PAYABLE_FOLIO -> "CXP";
            default -> null;
        };
    }
}
