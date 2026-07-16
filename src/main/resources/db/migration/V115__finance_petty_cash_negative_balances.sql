-- A petty cash budget is a spending ceiling, not a bank balance. The operational
-- fund may therefore be zero or negative while it is waiting to be funded.
SET @drop_petty_cash_balance_check = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'finance_petty_cash_funds'
        AND CONSTRAINT_NAME = 'chk_finance_petty_cash_funds_balance'
    ),
    'ALTER TABLE finance_petty_cash_funds DROP CHECK chk_finance_petty_cash_funds_balance',
    'SELECT 1'
  )
);
PREPARE drop_petty_cash_balance_check_stmt FROM @drop_petty_cash_balance_check;
EXECUTE drop_petty_cash_balance_check_stmt;
DEALLOCATE PREPARE drop_petty_cash_balance_check_stmt;
