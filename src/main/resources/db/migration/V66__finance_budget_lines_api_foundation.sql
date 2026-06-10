SET @add_budget_line_status_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_budget_lines ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT ''ACTIVE'' AFTER currency_code',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_budget_lines'
    AND column_name = 'status'
);
PREPARE add_budget_line_status_stmt FROM @add_budget_line_status_sql;
EXECUTE add_budget_line_status_stmt;
DEALLOCATE PREPARE add_budget_line_status_stmt;

SET @add_budget_line_description_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_budget_lines ADD COLUMN description TEXT NULL AFTER status',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_budget_lines'
    AND column_name = 'description'
);
PREPARE add_budget_line_description_stmt FROM @add_budget_line_description_sql;
EXECUTE add_budget_line_description_stmt;
DEALLOCATE PREPARE add_budget_line_description_stmt;

SET @drop_budget_line_status_check_sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE finance_budget_lines DROP CHECK chk_finance_budget_lines_status',
    'SELECT 1'
  )
  FROM information_schema.check_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'chk_finance_budget_lines_status'
);
PREPARE drop_budget_line_status_check_stmt FROM @drop_budget_line_status_check_sql;
EXECUTE drop_budget_line_status_check_stmt;
DEALLOCATE PREPARE drop_budget_line_status_check_stmt;

ALTER TABLE finance_budget_lines
  ADD CONSTRAINT chk_finance_budget_lines_status
  CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'));
