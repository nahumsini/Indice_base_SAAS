package com.indice.erp.finance.expenses;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.BudgetLineRollupService;
import com.indice.erp.finance.expenses.dto.CorrectExpenseRequest;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Corrects consumption while preserving the original payments and their bank movements. */
@Service
public class ExpenseCorrectionService {
    private final ExpenseRepository repository;
    private final ExpenseMapper mapper;
    private final ExpenseValidator validator;
    private final ExpenseReferenceValidator references;
    private final BudgetLineRollupService budgets;
    private final FinanceBusinessTimeZoneResolver timeZones;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public ExpenseCorrectionService(ExpenseRepository repository, ExpenseMapper mapper, ExpenseValidator validator,
            ExpenseReferenceValidator references, BudgetLineRollupService budgets,
            FinanceBusinessTimeZoneResolver timeZones, JdbcTemplate jdbc, ObjectMapper json) {
        this.repository = repository; this.mapper = mapper; this.validator = validator;
        this.references = references; this.budgets = budgets; this.timeZones = timeZones;
        this.jdbc = jdbc; this.json = json;
    }

    @Transactional
    public ExpenseResponse correct(FinanceContext context, long id, CorrectExpenseRequest correction) {
        repository.lockCompanyForCreation(context);
        var existing = repository.findByIdForUpdate(context, id)
            .orElseThrow(() -> FinanceApiException.notFound("Expense not found."));
        if (correction == null || correction.expense() == null || correction.expectedVersion() == null
                || !Objects.equals(existing.version(), correction.expectedVersion()))
            throw FinanceApiException.conflict("The expense changed. Reload it before editing.");
        if (existing.originFund() != null || "PETTY_CASH".equals(existing.auditStatus()))
            throw FinanceApiException.conflict("Fund expenses must be managed from their source fund.");
        if (existing.accountingPosted())
            throw FinanceApiException.conflict("This expense has a posted journal entry. Use an accounting adjustment to preserve the ledger.");
        if (existing.purchaseOrderId() != null || List.of(ExpenseStatus.CLOSED, ExpenseStatus.CANCELLED, ExpenseStatus.REJECTED).contains(existing.status()))
            throw FinanceApiException.conflict("Closed, cancelled, rejected or purchase-order expenses require their source correction workflow.");
        var request = correction.expense();
        var assignment = validator.validateUpdate(context, request);
        references.validateUpdate(context, assignment, request);
        if (request.totalAmount().signum() <= 0)
            throw FinanceApiException.badRequest("The corrected expense total must be greater than zero.");
        if (!Objects.equals(request.budgetLineId(), existing.budgetLineId())
                || !Objects.equals(request.purchaseOrderId(), existing.purchaseOrderId()))
            throw FinanceApiException.conflict("A correction cannot replace the source budget or purchase order.");
        if ((existing.paidAmount().signum() > 0 || existing.budgetLineId() != null)
                && !existing.currencyCode().equalsIgnoreCase(request.currencyCode()))
            throw FinanceApiException.conflict("An expense with payments or a budget must retain its original currency.");
        if (existing.paidAmount().compareTo(request.totalAmount()) > 0)
            throw FinanceApiException.conflict("The corrected total is below payments already recorded. Correct or reverse the excess payment first.");
        if (existing.paidAmount().signum() > 0 && !Objects.equals(existing.paymentAccountId(), request.paymentAccountId()))
            throw FinanceApiException.conflict("Changing the expense cannot move an existing payment to another account.");
        if (!Objects.equals(request.paymentAccountId(), existing.paymentAccountId()))
            references.validateImportPaymentAccount(context, request.paymentAccountId(), request.currencyCode());
        if (existing.paidAmount().signum() > 0 && request.expenseDate().isAfter(LocalDate.now(timeZones.resolve(context.companyId()))))
            throw FinanceApiException.badRequest("A paid expense cannot have a future expense date.");

        var balance = request.totalAmount().subtract(existing.paidAmount());
        var status = existing.paidAmount().signum() > 0
            ? (balance.signum() == 0 ? ExpenseStatus.PAID : ExpenseStatus.PARTIALLY_PAID) : existing.status();
        var paymentStatus = balance.signum() == 0 ? PaymentStatus.PAID
            : request.dueDate() != null && request.dueDate().isBefore(LocalDate.now(timeZones.resolve(context.companyId()))) ? PaymentStatus.OVERDUE
            : existing.paidAmount().signum() > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID;
        var fields = object(FinanceJsonSupport.toJsonNode(existing.customFieldsJson()));
        if (request.customFields() != null && request.customFields().isObject()) fields.setAll((ObjectNode) request.customFields());
        fields.put("amountPaid", existing.paidAmount());
        fields.put("paymentDate", existing.paymentDate() == null ? null : existing.paymentDate().toString());
        fields.put("legacyStatus", status == ExpenseStatus.PAID ? "paid" : status == ExpenseStatus.PARTIALLY_PAID ? "partial"
            : paymentStatus == PaymentStatus.OVERDUE ? "overdue" : "pending");
        var metadata = object(FinanceJsonSupport.toJsonNode(existing.metadataJson()));
        var changes = metadata.path("corrections").isArray() ? metadata.withArray("corrections") : json.createArrayNode();
        var event = json.createObjectNode().put("userId", context.userId()).put("changedAt", Instant.now().toString())
            .put("previousVersion", existing.version()).put("paymentPolicy", "PRESERVE_PAYMENTS");
        var before = object(json.valueToTree(mapper.toResponse(existing)));
        before.remove("metadata");
        var requested = object(json.valueToTree(request));
        requested.remove("metadata");
        event.set("before", before);
        event.set("requested", requested);
        changes.add(event); metadata.set("corrections", changes);
        int changed = jdbc.update("""
            UPDATE finance_expenses SET unit_id=?, business_id=?, provider_id=?, accounting_account_id=?, payment_account_id=?,
                folio=?, concept=?, description=?, expense_type=?, subtotal_amount=?, tax_amount=?, total_amount=?,
                balance_amount=?, currency_code=?, expense_date=?, due_date=?, status=?, payment_status=?,
                custom_fields_json=?, metadata_json=?, updated_by_user_id=?, updated_at=CURRENT_TIMESTAMP(6), version=version+1
            WHERE company_id=? AND id=? AND version=? AND deleted_at IS NULL
            """, assignment.unitId(), assignment.businessId(), request.providerId(), request.accountingAccountId(), request.paymentAccountId(),
            request.folio().trim(), request.concept().trim(), request.description(), request.expenseType().name(), request.subtotalAmount(),
            request.taxAmount(), request.totalAmount(), balance, request.currencyCode().toUpperCase(java.util.Locale.ROOT), request.expenseDate(),
            request.dueDate(), status.name(), paymentStatus.name(), fields.toString(), metadata.toString(), context.userId(),
            context.companyId(), id, existing.version());
        if (changed != 1) throw FinanceApiException.conflict("The expense changed. Reload it before editing.");
        budgets.refreshExpenseImpact(context, existing.budgetLineId());
        return mapper.toResponse(repository.findById(context, id).orElseThrow());
    }

    private ObjectNode object(JsonNode node) { return node != null && node.isObject() ? ((ObjectNode) node).deepCopy() : json.createObjectNode(); }
}
