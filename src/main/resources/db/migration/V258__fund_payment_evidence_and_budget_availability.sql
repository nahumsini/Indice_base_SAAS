-- Adopted closeout decision: transfers of custody do not consume budget.
-- Only derived availability/health is recalculated; native source amounts stay unchanged.
UPDATE finance_budget_lines
SET available_amount = planned_amount - committed_amount - actual_expense_amount,
    health_status = CASE
      WHEN planned_amount - committed_amount - actual_expense_amount < 0 THEN 'EXCEEDED'
      WHEN planned_amount - committed_amount - actual_expense_amount <= planned_amount * 0.20 THEN 'WARNING'
      ELSE 'ON_TRACK'
    END,
    version = version + 1
WHERE deleted_at IS NULL
  AND (available_amount <> planned_amount - committed_amount - actual_expense_amount
    OR health_status <> CASE
      WHEN planned_amount - committed_amount - actual_expense_amount < 0 THEN 'EXCEEDED'
      WHEN planned_amount - committed_amount - actual_expense_amount <= planned_amount * 0.20 THEN 'WARNING'
      ELSE 'ON_TRACK' END);

-- Restore missing evidence only where one authorized internal receipt proves the exact payment.
-- No account balance or Treasury movement is changed; money left custody at receipt capture.
INSERT INTO finance_expense_payments
  (company_id, expense_id, payment_account_id, amount, currency_code, payment_date,
   source, idempotency_key, registered_by_user_id, created_at)
SELECT expense.company_id, expense.id, expense.payment_account_id, expense.total_amount,
       expense.currency_code, expense.payment_date, 'SETTLED_ON_CREATE',
       CONCAT('FUND_EXPENSE_PAYMENT:', receipt.id),
       COALESCE(expense.approved_by_user_id, expense.created_by_user_id), expense.created_at
FROM finance_expenses expense
JOIN finance_petty_cash_settlement_lines receipt
  ON receipt.company_id = expense.company_id AND receipt.expense_id = expense.id
JOIN finance_petty_cash_funds fund
  ON fund.company_id = receipt.company_id AND fund.id = receipt.petty_cash_fund_id
WHERE expense.deleted_at IS NULL AND receipt.deleted_at IS NULL
  AND expense.status IN ('PAID', 'CLOSED') AND expense.audit_status = 'PETTY_CASH'
  AND expense.payment_status = 'PAID' AND expense.total_amount > 0
  AND expense.paid_amount = expense.total_amount AND expense.balance_amount = 0
  AND receipt.status = 'EXPENSE_CREATED' AND fund.fund_type = 'INTERNAL_COMPANY'
  AND receipt.total_amount = expense.total_amount
  AND receipt.currency_code = expense.currency_code AND fund.currency_code = expense.currency_code
  AND receipt.expense_date = expense.payment_date
  AND NOT EXISTS (SELECT 1 FROM finance_expense_payments payment
                  WHERE payment.company_id = expense.company_id AND payment.expense_id = expense.id)
  AND NOT EXISTS (SELECT 1 FROM finance_petty_cash_settlement_lines other_receipt
                  WHERE other_receipt.company_id = expense.company_id
                    AND other_receipt.expense_id = expense.id AND other_receipt.id <> receipt.id);
