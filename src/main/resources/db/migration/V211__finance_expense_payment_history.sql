CREATE TABLE IF NOT EXISTS finance_expense_payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  expense_id BIGINT NOT NULL,
  payment_account_id BIGINT NULL,
  amount DECIMAL(19,4) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  payment_date DATE NOT NULL,
  source VARCHAR(40) NOT NULL,
  registered_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_finance_expense_payments_company_expense (company_id, expense_id),
  KEY idx_finance_expense_payments_company_date (company_id, payment_date),
  KEY idx_finance_expense_payments_account (payment_account_id),
  KEY idx_finance_expense_payments_registered_by (registered_by_user_id),
  CONSTRAINT fk_finance_expense_payments_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_expense_payments_expense
    FOREIGN KEY (expense_id) REFERENCES finance_expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_expense_payments_account
    FOREIGN KEY (payment_account_id) REFERENCES finance_payment_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_expense_payments_registered_by
    FOREIGN KEY (registered_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_finance_expense_payments_amount CHECK (amount > 0),
  CONSTRAINT chk_finance_expense_payments_source CHECK (
    source IN ('RECORDED', 'SETTLED_ON_CREATE', 'LEGACY_AGGREGATE')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO finance_expense_payments
  (company_id, expense_id, payment_account_id, amount, currency_code, payment_date,
   source, registered_by_user_id, created_at)
SELECT
  expense.company_id,
  expense.id,
  expense.payment_account_id,
  expense.paid_amount,
  expense.currency_code,
  COALESCE(expense.payment_date, expense.expense_date),
  'LEGACY_AGGREGATE',
  COALESCE(expense.performed_by_user_id, expense.updated_by_user_id, expense.created_by_user_id),
  COALESCE(expense.updated_at, expense.created_at)
FROM finance_expenses expense
WHERE expense.deleted_at IS NULL
  AND expense.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1
    FROM finance_expense_payments payment
    WHERE payment.company_id = expense.company_id
      AND payment.expense_id = expense.id
  );
