SET @add_payment_account_description_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_payment_accounts ADD COLUMN description TEXT NULL AFTER status',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_payment_accounts'
    AND column_name = 'description'
);
PREPARE add_payment_account_description_stmt FROM @add_payment_account_description_sql;
EXECUTE add_payment_account_description_stmt;
DEALLOCATE PREPARE add_payment_account_description_stmt;

SET @drop_payment_account_status_check_sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE finance_payment_accounts DROP CHECK chk_finance_payment_accounts_status',
    'SELECT 1'
  )
  FROM information_schema.check_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'chk_finance_payment_accounts_status'
);
PREPARE drop_payment_account_status_check_stmt FROM @drop_payment_account_status_check_sql;
EXECUTE drop_payment_account_status_check_stmt;
DEALLOCATE PREPARE drop_payment_account_status_check_stmt;

ALTER TABLE finance_payment_accounts
  ADD CONSTRAINT chk_finance_payment_accounts_status
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'));
