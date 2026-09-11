package com.indice.erp.finance.expenses;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.BudgetLineRollupService;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.expenses.dto.ReverseExpensePaymentRequest;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.treasury.TreasuryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Undo the last effective payment, preserving the expense, earlier installments and evidence. */
@Service
public class ExpensePaymentReversalService {
    private final ExpenseRepository repository;
    private final ExpenseMapper mapper;
    private final JdbcTemplate jdbc;
    private final TreasuryService treasury;
    private final BudgetLineRollupService budgets;
    private final FinanceBusinessTimeZoneResolver timeZones;
    private final ObjectMapper json;

    public ExpensePaymentReversalService(ExpenseRepository repository, ExpenseMapper mapper, JdbcTemplate jdbc,
            TreasuryService treasury, BudgetLineRollupService budgets, FinanceBusinessTimeZoneResolver timeZones,
            ObjectMapper json) {
        this.repository = repository; this.mapper = mapper; this.jdbc = jdbc; this.treasury = treasury;
        this.budgets = budgets; this.timeZones = timeZones; this.json = json;
    }

    @Transactional
    public ExpenseResponse reverse(FinanceContext context, long expenseId, long paymentId, ReverseExpensePaymentRequest request) {
        repository.lockCompanyForCreation(context);
        var expense = repository.findByIdForUpdate(context, expenseId)
            .orElseThrow(() -> FinanceApiException.notFound("Expense not found."));
        if (request == null || request.reason() == null || request.reason().isBlank() || request.reason().trim().length() > 500)
            throw FinanceApiException.badRequest("A reversal reason is required (maximum 500 characters).");
        var history = jdbc.query("""
            SELECT id, payment_account_id, amount, currency_code, payment_date, source, idempotency_key, reversed_at
            FROM finance_expense_payments WHERE company_id = ? AND expense_id = ? ORDER BY id DESC FOR UPDATE
            """, (rs, row) -> new Payment(rs.getLong("id"), rs.getObject("payment_account_id", Long.class),
                rs.getBigDecimal("amount"), rs.getString("currency_code"), rs.getObject("payment_date", LocalDate.class),
                rs.getString("source"), rs.getString("idempotency_key"), rs.getTimestamp("reversed_at") != null),
            context.companyId(), expenseId);
        var payment = history.stream().filter(row -> row.id() == paymentId).findFirst()
            .orElseThrow(() -> FinanceApiException.notFound("Expense payment not found."));
        // Payment identity is the retry key. A retry can never undo a subsequent installment.
        if (payment.reversed()) return mapper.toResponse(expense);
        if (!Objects.equals(expense.version(), request.expectedVersion()))
            throw FinanceApiException.conflict("The expense changed. Reload it before reversing a payment.");
        if (expense.originFund() != null || "PETTY_CASH".equals(expense.auditStatus()) || expense.purchaseOrderId() != null
                || "AUDITED".equals(expense.auditStatus())
                || !List.of(ExpenseStatus.PAID, ExpenseStatus.PARTIALLY_PAID).contains(expense.status()))
            throw FinanceApiException.conflict("This expense requires its source correction workflow.");
        if (expense.accountingPosted() || Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM finance_journal_entries journal JOIN finance_expense_payments payment
              ON payment.company_id = journal.company_id
                AND CAST(payment.id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci = journal.source_id
              WHERE journal.company_id = ? AND payment.expense_id = ? AND journal.source_type = 'EXPENSE_PAYMENT'
                AND journal.status = 'POSTED')
            """, Boolean.class, context.companyId(), expenseId)))
            throw FinanceApiException.conflict("This expense has posted accounting entries. Use an accounting adjustment.");
        var active = history.stream().filter(row -> !row.reversed()).toList();
        if (active.isEmpty() || active.getFirst().id() != paymentId)
            throw FinanceApiException.conflict("Only the last recorded active payment can be reversed.");
        var paid = active.stream().map(Payment::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (paid.compareTo(expense.paidAmount()) != 0 || active.stream().anyMatch(row -> !expense.currencyCode().equals(row.currency())))
            throw FinanceApiException.conflict("Payment history must be reconciled before this expense can be reopened.");
        var reason = request.reason().trim();
        String eventKey = switch (payment.source()) {
            case "SETTLED_ON_CREATE" -> "EXPENSE_PAYMENT:SETTLED_ON_CREATE:" + expenseId;
            case "RECORDED" -> payment.key() == null
                ? "EXPENSE_PAYMENT:RECORDED:" + expenseId + ":" + paid.toPlainString()
                : "EXPENSE_PAYMENT:RECORDED:IDEMPOTENT:" + payment.key();
            case "LEGACY_AGGREGATE" -> null;
            default -> throw FinanceApiException.conflict("This payment must be corrected by its source module.");
        };
        treasury.reverseExpensePayment(context.companyId(), expenseId, payment.id(), eventKey,
            payment.accountId(), payment.amount(), payment.currency(), context.userId(), reason);
        jdbc.update("""
            UPDATE finance_expense_payments SET reversed_at = CURRENT_TIMESTAMP(6), reversed_by_user_id = ?, reversal_reason = ?
            WHERE company_id = ? AND expense_id = ? AND id = ? AND reversed_at IS NULL
            """, context.userId(), reason, context.companyId(), expenseId, paymentId);
        var remainingPaid = paid.subtract(payment.amount());
        var balance = expense.totalAmount().subtract(remainingPaid);
        var prior = active.size() > 1 ? active.get(1) : null;
        var status = remainingPaid.signum() == 0 ? "APPROVED" : "PARTIALLY_PAID";
        boolean overdue = expense.dueDate() != null && expense.dueDate().isBefore(LocalDate.now(timeZones.resolve(context.companyId())));
        var paymentStatus = overdue ? "OVERDUE" : remainingPaid.signum() == 0 ? "UNPAID" : "PARTIALLY_PAID";
        var rawFields = FinanceJsonSupport.toJsonNode(expense.customFieldsJson());
        ObjectNode fields = rawFields != null && rawFields.isObject() ? ((ObjectNode) rawFields).deepCopy() : json.createObjectNode();
        fields.put("amountPaid", remainingPaid);
        fields.put("paymentDate", prior == null ? null : prior.date().toString());
        fields.put("legacyStatus", remainingPaid.signum() > 0 ? "partial" : overdue ? "overdue" : "pending");
        jdbc.update("""
            UPDATE finance_expenses SET paid_amount = ?, balance_amount = ?, status = ?, payment_status = ?,
              payment_date = ?, payment_account_id = ?, custom_fields_json = ?, updated_by_user_id = ?,
              updated_at = CURRENT_TIMESTAMP(6), version = version + 1 WHERE company_id = ? AND id = ?
            """, remainingPaid, balance, status, paymentStatus, prior == null ? null : prior.date(),
            prior == null ? null : prior.accountId(), fields.toString(), context.userId(), context.companyId(), expenseId);
        budgets.refreshExpenseImpact(context, expense.budgetLineId());
        return mapper.toResponse(repository.findById(context, expenseId).orElseThrow());
    }

    private record Payment(long id, Long accountId, BigDecimal amount, String currency, LocalDate date,
                           String source, String key, boolean reversed) {}
}
