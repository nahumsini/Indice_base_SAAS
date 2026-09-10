package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.BudgetLineRollupService;
import com.indice.erp.finance.reporting.ExpenseAccountingReversalService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.purchaseorder.PurchaseOrderExpensePolicy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Removal is an audited correction: preserve evidence, compensate actual movements, then hide. */
@Service
public class ExpenseDeletionService {
    private final JdbcTemplate jdbc;
    private final TreasuryService treasury;
    private final ExpenseAccountingReversalService accounting;
    private final PurchaseOrderExpensePolicy procurement;
    private final BudgetLineRollupService budgets;

    public ExpenseDeletionService(JdbcTemplate jdbc, TreasuryService treasury,
            ExpenseAccountingReversalService accounting, PurchaseOrderExpensePolicy procurement,
            BudgetLineRollupService budgets) {
        this.jdbc = jdbc; this.treasury = treasury; this.accounting = accounting;
        this.procurement = procurement; this.budgets = budgets;
    }

    void validate(FinanceContext context, ExpenseRecord expense) {
        if (expense.status() == ExpenseStatus.CLOSED || "AUDITED".equalsIgnoreCase(expense.auditStatus()))
            throw FinanceApiException.conflict("Audited expenses cannot be deleted.");
        if (expense.originFund() != null || "PETTY_CASH".equals(expense.auditStatus()))
            throw FinanceApiException.conflict("Fund expenses must be reversed from Petty Cash.");
        if (expense.purchaseOrderId() != null) procurement.requireUnreceived(context.companyId(), expense.purchaseOrderId());
    }

    @Transactional
    void delete(FinanceContext context, ExpenseRecord expense, String reason) {
        // The bulk owner holds company/scoped expense locks and validates expected versions first.
        validate(context, expense);
        treasury.reverseExpensePayments(context.companyId(), expense.id(), context.userId(), reason);
        accounting.reverseExpense(context.companyId(), expense.id(), context.userId(), reason);
        int changed = jdbc.update("""
            UPDATE finance_expenses SET deleted_at = UTC_TIMESTAMP(6), updated_by_user_id = ?, version = version + 1,
              metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()), '$.deletion',
                JSON_OBJECT('reason', ?, 'userId', ?, 'deletedAt', UTC_TIMESTAMP(6),
                  'previousStatus', status, 'previousPaymentStatus', payment_status,
                  'paidAmount', paid_amount, 'balanceAmount', balance_amount, 'currency', currency_code))
            WHERE company_id = ? AND id = ? AND version = ? AND deleted_at IS NULL
            """, context.userId(), reason, context.userId(), context.companyId(), expense.id(), expense.version());
        if (changed != 1) throw FinanceApiException.conflict("The expense changed. Reload before deleting.");
        budgets.refreshExpenseImpact(context, expense.budgetLineId());
    }
}
