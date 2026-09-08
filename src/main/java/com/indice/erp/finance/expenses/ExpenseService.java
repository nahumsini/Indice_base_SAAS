package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.BudgetLineRollupService;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.DeleteExpenseResponse;
import com.indice.erp.finance.expenses.dto.ExpenseListResponse;
import com.indice.erp.finance.expenses.dto.ExpensePaymentListResponse;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.RecordExpensePaymentRequest;
import com.indice.erp.finance.expenses.dto.RejectExpenseRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseStatusRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
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
    private final ExpensePaymentRepository paymentRepository;
    private final BudgetLineRollupService budgetLineRollupService;
    private final ExpenseMapper mapper;
    private final ExpenseValidator validator;
    private final ExpenseReferenceValidator referenceValidator;
    private final TreasuryService treasuryService;
    private final FinanceBusinessTimeZoneResolver timeZoneResolver;

    public ExpenseService(
            ExpenseRepository repository,
            ExpenseWorkflowRepository workflowRepository,
            ExpensePaymentRepository paymentRepository,
            BudgetLineRollupService budgetLineRollupService,
            ExpenseMapper mapper,
            ExpenseValidator validator,
            ExpenseReferenceValidator referenceValidator,
            TreasuryService treasuryService,
            FinanceBusinessTimeZoneResolver timeZoneResolver) {
        this.repository = repository;
        this.workflowRepository = workflowRepository;
        this.paymentRepository = paymentRepository;
        this.budgetLineRollupService = budgetLineRollupService;
        this.mapper = mapper;
        this.validator = validator;
        this.referenceValidator = referenceValidator;
        this.treasuryService = treasuryService;
        this.timeZoneResolver = timeZoneResolver;
    }

    @Transactional
    public ExpenseListResponse list(FinanceContext context) {
        workflowRepository.markOverduePayments(context, businessDate(context));
        var expenses = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new ExpenseListResponse(expenses, expenses.size());
    }

    @Transactional
    public ExpenseResponse get(FinanceContext context, long expenseId) {
        workflowRepository.markOverduePayments(context, businessDate(context));
        return mapper.toResponse(requireExpense(context, expenseId));
    }

    /** Funds has already withdrawn this money; this records the expense's payment evidence only. */
    @Transactional
    public void recordCustodySettlement(FinanceContext context, long expenseId, long settlementLineId) {
        var expense = requireExpenseForUpdate(context, expenseId);
        if (expense.status() != ExpenseStatus.PAID || !"PETTY_CASH".equals(expense.auditStatus())
                || expense.paymentDate() == null || expense.paidAmount().compareTo(expense.totalAmount()) != 0
                || !paymentRepository.hasInternalSettlementEvidence(context, expenseId, settlementLineId)) {
            throw FinanceApiException.conflict("Expense does not have matching internal fund settlement evidence.");
        }
        var key = "FUND_EXPENSE_PAYMENT:" + settlementLineId;
        if (paymentRepository.findByIdempotencyKey(context, key).isPresent()) {
            return;
        }
        if (!paymentRepository.findAll(context, expenseId).isEmpty()) {
            throw FinanceApiException.conflict("Fund expense already has payment evidence.");
        }
        if (!paymentRepository.insert(context, expenseId, expense.paymentAccountId(), expense.totalAmount(),
                expense.currencyCode(), expense.paymentDate(), ExpensePaymentRepository.SOURCE_SETTLED_ON_CREATE, key)) {
            throw FinanceApiException.conflict("Fund expense payment evidence could not be recorded.");
        }
    }

    @Transactional
    public ExpenseResponse createDraft(FinanceContext context, CreateExpenseRequest request) {
        // Serialize automatic numbers before any consistent read establishes a stale snapshot.
        repository.lockCompanyForCreation(context);
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
            var folio = repository.nextFolio(context.companyId(), autoPrefix, businessDate(context).getYear(), attempt);
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
        referenceValidator.validatePaymentAccountForPayment(
            context, created.paymentAccountId(), created.currencyCode());
        if (!workflowRepository.applyManualStatus(
                context,
                created.id(),
                created.totalAmount(),
                BigDecimal.ZERO,
                ExpenseStatus.PAID,
                PaymentStatus.PAID,
                request.expenseDate(),
                null,
                null)) {
            throw FinanceApiException.conflict("Expense could not be marked as paid.");
        }
        if (!paymentRepository.insert(
                context,
                created.id(),
                created.paymentAccountId(),
                created.totalAmount(),
                created.currencyCode(),
                request.expenseDate(),
                ExpensePaymentRepository.SOURCE_SETTLED_ON_CREATE,
                "expense-settle-on-create-" + created.id())) {
            throw FinanceApiException.conflict("Initial expense payment history could not be recorded.");
        }
        postExpensePayment(
            context,
            created,
            created.paymentAccountId(),
            created.totalAmount(),
            "SETTLED_ON_CREATE:" + created.id(),
            "Pago al crear el gasto"
        );
        refreshBudgetLine(context, created.budgetLineId());
        return get(context, created.id());
    }

    @Transactional
    public ExpenseResponse updateDraft(FinanceContext context, long expenseId, UpdateExpenseRequest request) {
        repository.lockCompanyForCreation(context);
        var existing = requireExpense(context, expenseId);
        validator.requireDraft(existing, "updated");
        if (existing.originFund() != null || "PETTY_CASH".equals(existing.auditStatus())) {
            throw FinanceApiException.conflict("Fund expenses must be managed from their source fund.");
        }
        if (existing.accountingPosted()) {
            throw FinanceApiException.conflict("This expense has a posted journal entry. Use an accounting adjustment to preserve the ledger.");
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
        if (existing.status() != ExpenseStatus.DRAFT
                && !isUnpaidPayableKioskSubmission(existing)) {
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
        var existing = requireExpenseForUpdate(context, expenseId);
        var idempotencyKey = normalizeIdempotencyKey(request.idempotencyKey());
        var previousAttempt = paymentRepository.findByIdempotencyKey(context, idempotencyKey);
        if (previousAttempt.isPresent()) {
            requireMatchingPaymentAttempt(existing, request, previousAttempt.get());
            return mapper.toResponse(existing);
        }
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
        if (!paymentRepository.insert(
                context,
                expenseId,
                request.paymentAccountId(),
                request.amount(),
                existing.currencyCode(),
                request.paymentDate(),
                ExpensePaymentRepository.SOURCE_RECORDED,
                idempotencyKey)) {
            throw FinanceApiException.conflict("Expense payment history could not be recorded.");
        }
        postExpensePayment(
            context,
            existing,
            request.paymentAccountId(),
            request.amount(),
            idempotencyKey == null
                ? "RECORDED:" + expenseId + ":" + paidAmount.toPlainString()
                : "RECORDED:IDEMPOTENT:" + idempotencyKey,
            "Abono a gasto " + existing.folio()
        );
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    @Transactional(readOnly = true)
    public ExpensePaymentListResponse listPayments(FinanceContext context, long expenseId) {
        requireExpense(context, expenseId);
        var payments = paymentRepository.findAll(context, expenseId);
        return new ExpensePaymentListResponse(payments, payments.size());
    }

    @Transactional
    public ExpenseResponse updateStatus(FinanceContext context, long expenseId, UpdateExpenseStatusRequest request) {
        var existing = requireExpense(context, expenseId);
        if (List.of(ExpenseStatus.CANCELLED, ExpenseStatus.REJECTED).contains(existing.status())) {
            throw FinanceApiException.conflict("Cancelled or rejected expenses cannot change status.");
        }

        var targetStatus = normalizeLegacyStatus(request.status());
        if (!matchesLegacyStatus(existing, targetStatus)) {
            throw FinanceApiException.badRequest(
                "Expense status is controlled by submit, approval, record-payment, close and reversal workflows."
            );
        }
        return mapper.toResponse(existing);
    }

    @Transactional
    public ExpenseResponse close(FinanceContext context, long expenseId) {
        var existing = requireExpense(context, expenseId);
        requireStatus(existing, List.of(ExpenseStatus.PAID), "closed");
        transition(context, expenseId, List.of(ExpenseStatus.PAID), ExpenseStatus.CLOSED,
            PaymentStatus.PAID, existing.approvedByUserId(), "AUDITED", businessDate(context));
        refreshBudgetLine(context, existing.budgetLineId());
        return get(context, expenseId);
    }

    private ExpenseRecord requireExpense(FinanceContext context, long expenseId) {
        return repository.findById(context, expenseId)
            .orElseThrow(() -> new NoSuchElementException("Expense not found."));
    }

    private ExpenseRecord requireExpenseForUpdate(FinanceContext context, long expenseId) {
        return repository.findByIdForUpdate(context, expenseId)
            .orElseThrow(() -> new NoSuchElementException("Expense not found."));
    }

    private String normalizeIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return null;
        }
        var normalized = idempotencyKey.trim();
        if (normalized.length() > 120) {
            throw FinanceApiException.badRequest("idempotencyKey must contain at most 120 characters.");
        }
        return normalized;
    }

    private void requireMatchingPaymentAttempt(
            ExpenseRecord expense,
            RecordExpensePaymentRequest request,
            ExpensePaymentRepository.ExpensePaymentIdempotencyRecord attempt) {
        if (attempt.expenseId() != expense.id()
                || !Objects.equals(attempt.paymentAccountId(), request.paymentAccountId())
                || attempt.amount().compareTo(request.amount()) != 0
                || !attempt.currencyCode().equalsIgnoreCase(expense.currencyCode())
                || !attempt.paymentDate().equals(request.paymentDate())) {
            throw FinanceApiException.conflict("idempotencyKey was already used for a different payment.");
        }
    }

    private void postExpensePayment(
            FinanceContext context,
            ExpenseRecord expense,
            Long paymentAccountId,
            BigDecimal amount,
            String eventSuffix,
            String description) {
        if (paymentAccountId == null) {
            throw FinanceApiException.badRequest("A payment account is required to register a paid expense.");
        }
        treasuryService.post(new TreasuryMovementCommand(
            context.companyId(), paymentAccountId, expense.unitId(), expense.businessId(), expense.currencyCode(),
            "EXPENSES", "EXPENSE_PAYMENT", String.valueOf(expense.id()),
            "EXPENSE_PAYMENT:" + eventSuffix, amount.negate(), BigDecimal.ZERO, description,
            Instant.now(), context.userId(), null,
            "{\"expenseId\":" + expense.id() + "}"
        ));
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

    private boolean matchesLegacyStatus(ExpenseRecord expense, String targetStatus) {
        return switch (targetStatus) {
            case "pending" -> List.of(ExpenseStatus.DRAFT, ExpenseStatus.PENDING_APPROVAL, ExpenseStatus.APPROVED)
                .contains(expense.status())
                && expense.paymentStatus() == PaymentStatus.UNPAID;
            case "overdue" -> expense.paymentStatus() == PaymentStatus.OVERDUE;
            case "partial" -> expense.status() == ExpenseStatus.PARTIALLY_PAID
                && expense.paymentStatus() == PaymentStatus.PARTIALLY_PAID;
            case "paid" -> expense.status() == ExpenseStatus.PAID
                && expense.paymentStatus() == PaymentStatus.PAID;
            case "audited" -> expense.status() == ExpenseStatus.CLOSED
                && expense.paymentStatus() == PaymentStatus.PAID;
            default -> false;
        };
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

    private LocalDate businessDate(FinanceContext context) {
        return LocalDate.now(timeZoneResolver.resolve(context.companyId()));
    }
}
