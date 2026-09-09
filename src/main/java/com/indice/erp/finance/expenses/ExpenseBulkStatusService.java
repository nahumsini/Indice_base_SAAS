package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.ExpenseBulkStatusRequest;
import com.indice.erp.finance.expenses.dto.ExpenseListResponse;
import com.indice.erp.finance.expenses.dto.RecordExpensePaymentRequest;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.status.ExpenseStatus;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit payment or due-date operation. Never manufactures or erases payment evidence. */
@Service
public class ExpenseBulkStatusService {
    private final ExpenseRepository repository;
    private final ExpenseService expenses;
    private final ExpenseReferenceValidator references;
    private final FinanceBusinessTimeZoneResolver timeZones;
    private final JdbcTemplate jdbc;

    public ExpenseBulkStatusService(ExpenseRepository repository, ExpenseService expenses,
            ExpenseReferenceValidator references, FinanceBusinessTimeZoneResolver timeZones, JdbcTemplate jdbc) {
        this.repository = repository;
        this.expenses = expenses;
        this.references = references;
        this.timeZones = timeZones;
        this.jdbc = jdbc;
    }

    @Transactional
    public ExpenseListResponse apply(FinanceContext context, ExpenseBulkStatusRequest request) {
        if (request.target() == null || request.effectiveDate() == null || request.rows() == null
                || request.rows().isEmpty() || request.rows().size() > 200 || request.requestKey() == null
                || request.requestKey().isBlank() || request.requestKey().length() > 80) {
            throw FinanceApiException.badRequest("Select between 1 and 200 expenses and provide a date and request key.");
        }
        var today = LocalDate.now(timeZones.resolve(context.companyId()));
        switch (request.target()) {
            case PAID -> {
                if (request.paymentAccountId() == null || request.effectiveDate().isAfter(today))
                    throw FinanceApiException.badRequest("Select a payment account and a payment date no later than today.");
            }
            case PENDING -> {
                if (request.effectiveDate().isBefore(today))
                    throw FinanceApiException.badRequest("Pending expenses require a due date today or later.");
            }
            case OVERDUE -> {
                if (!request.effectiveDate().isBefore(today))
                    throw FinanceApiException.badRequest("Overdue expenses require a due date before today.");
            }
        }
        repository.lockCompanyForCreation(context);
        var records = new ArrayList<ExpenseRecord>();
        var ids = new HashSet<Long>();
        for (var selection : request.rows()) {
            if (selection == null || !ids.add(selection.id())) throw FinanceApiException.badRequest("Duplicate expense selection.");
            var record = repository.findByIdForUpdate(context, selection.id())
                .orElseThrow(() -> FinanceApiException.notFound("Expense not found."));
            if (!Objects.equals(record.version(), selection.expectedVersion()))
                throw FinanceApiException.conflict("An expense changed. Reload the selection before retrying.");
            if (record.originFund() != null || "PETTY_CASH".equals(record.auditStatus()) || record.accountingPosted()
                    || record.purchaseOrderId() != null || record.budgetLineId() != null)
                throw FinanceApiException.conflict("Linked or posted expenses require their source workflow.");
            if (!java.util.Set.of(ExpenseStatus.DRAFT, ExpenseStatus.PENDING_APPROVAL, ExpenseStatus.APPROVED,
                    ExpenseStatus.PARTIALLY_PAID).contains(record.status()) || record.balanceAmount().signum() <= 0)
                throw FinanceApiException.conflict("Only open expenses with a remaining balance can change here. Paid expenses require a reversal.");
            if (request.target() == ExpenseBulkStatusRequest.Target.PAID) {
                if (request.effectiveDate().isBefore(record.expenseDate()))
                    throw FinanceApiException.badRequest("Payment date cannot precede the expense date.");
                references.validateImportPaymentAccount(context, request.paymentAccountId(), record.currencyCode());
                references.validatePaymentAccountForPayment(context, request.paymentAccountId(), record.currencyCode());
            }
            records.add(record);
        }
        for (var record : records) {
            jdbc.update("""
                UPDATE finance_expenses SET metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()),
                    '$.bulkStatusChanges', JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(metadata_json, '$.bulkStatusChanges'),
                    JSON_ARRAY()), '$', JSON_OBJECT('target', ?, 'effectiveDate', ?, 'previousDueDate', due_date,
                    'previousStatus', status, 'previousPaymentStatus', payment_status, 'requestKey', ?,
                    'actorId', ?, 'changedAt', UTC_TIMESTAMP(6)))) WHERE company_id = ? AND id = ?
                """, request.target().name(), request.effectiveDate().toString(), request.requestKey(),
                context.userId(), context.companyId(), record.id());
            if (record.status() == ExpenseStatus.DRAFT) expenses.submitForApproval(context, record.id());
            if (record.status() == ExpenseStatus.DRAFT || record.status() == ExpenseStatus.PENDING_APPROVAL)
                expenses.approve(context, record.id());
            if (request.target() == ExpenseBulkStatusRequest.Target.PAID) {
                expenses.recordPayment(context, record.id(), new RecordExpensePaymentRequest(record.balanceAmount(),
                    request.paymentAccountId(), request.effectiveDate(), "BULK:" + request.requestKey() + ":" + record.id()));
            } else {
                var paymentStatus = request.target() == ExpenseBulkStatusRequest.Target.OVERDUE ? "OVERDUE"
                    : record.paidAmount().signum() > 0 ? "PARTIALLY_PAID" : "UNPAID";
                jdbc.update("""
                    UPDATE finance_expenses SET due_date = ?, payment_status = ?, version = version + 1,
                        updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ? AND id = ?
                    """, request.effectiveDate(), paymentStatus, context.userId(), context.companyId(), record.id());
            }
        }
        return new ExpenseListResponse(records.stream().map(record -> expenses.get(context, record.id())).toList(), records.size());
    }
}
