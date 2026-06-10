SET @add_description_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_accounting_accounts ADD COLUMN description TEXT NULL AFTER group_key',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_accounting_accounts'
    AND column_name = 'description'
);
PREPARE add_description_stmt FROM @add_description_sql;
EXECUTE add_description_stmt;
DEALLOCATE PREPARE add_description_stmt;

SET @drop_status_check_sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE finance_accounting_accounts DROP CHECK chk_finance_accounting_accounts_status',
    'SELECT 1'
  )
  FROM information_schema.check_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'chk_finance_accounting_accounts_status'
);
PREPARE drop_status_check_stmt FROM @drop_status_check_sql;
EXECUTE drop_status_check_stmt;
DEALLOCATE PREPARE drop_status_check_stmt;

ALTER TABLE finance_accounting_accounts
  ADD CONSTRAINT chk_finance_accounting_accounts_status
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'));
