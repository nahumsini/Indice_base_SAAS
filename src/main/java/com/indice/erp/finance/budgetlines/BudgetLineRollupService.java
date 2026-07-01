package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.status.ExpenseStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class BudgetLineRollupService {

    private final JdbcTemplate jdbcTemplate;

    public BudgetLineRollupService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void refreshExpenseImpact(FinanceContext context, Long budgetLineId) {
        if (budgetLineId == null) {
            return;
        }

        jdbcTemplate.update(
            """
            UPDATE finance_budget_lines line
            LEFT JOIN (
                SELECT
                    budget_line_id,
                    COALESCE(SUM(total_amount), 0) AS actual_total
                FROM finance_expenses
                WHERE company_id = ?
                  AND budget_line_id = ?
                  AND deleted_at IS NULL
                  AND status IN (?, ?, ?, ?)
                GROUP BY budget_line_id
            ) expense_rollup ON expense_rollup.budget_line_id = line.id
            SET line.actual_expense_amount = COALESCE(expense_rollup.actual_total, 0),
                line.available_amount =
                    line.planned_amount
                    - line.committed_amount
                    - COALESCE(expense_rollup.actual_total, 0)
                    - (line.petty_cash_issued_amount - line.petty_cash_settled_amount),
                line.health_status = CASE
                    WHEN (
                        line.planned_amount
                        - line.committed_amount
                        - COALESCE(expense_rollup.actual_total, 0)
                        - (line.petty_cash_issued_amount - line.petty_cash_settled_amount)
                    ) < 0 THEN 'EXCEEDED'
                    WHEN (
                        line.planned_amount
                        - line.committed_amount
                        - COALESCE(expense_rollup.actual_total, 0)
                        - (line.petty_cash_issued_amount - line.petty_cash_settled_amount)
                    ) <= (line.planned_amount * 0.20) THEN 'WARNING'
                    ELSE 'ON_TRACK'
                END,
                line.updated_by_user_id = ?,
                line.updated_at = CURRENT_TIMESTAMP,
                line.version = line.version + 1
            WHERE line.company_id = ?
              AND line.id = ?
              AND line.deleted_at IS NULL
            """,
            context.companyId(),
            budgetLineId,
            ExpenseStatus.APPROVED.name(),
            ExpenseStatus.PARTIALLY_PAID.name(),
            ExpenseStatus.PAID.name(),
            ExpenseStatus.CLOSED.name(),
            context.userId(),
            context.companyId(),
            budgetLineId
        );
    }
}
