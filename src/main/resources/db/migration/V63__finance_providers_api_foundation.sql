SET @add_contact_name_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_providers ADD COLUMN contact_name VARCHAR(180) NULL AFTER phone',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_providers'
    AND column_name = 'contact_name'
);
PREPARE add_contact_name_stmt FROM @add_contact_name_sql;
EXECUTE add_contact_name_stmt;
DEALLOCATE PREPARE add_contact_name_stmt;

SET @add_notes_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_providers ADD COLUMN notes TEXT NULL AFTER payment_terms_days',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_providers'
    AND column_name = 'notes'
);
PREPARE add_notes_stmt FROM @add_notes_sql;
EXECUTE add_notes_stmt;
DEALLOCATE PREPARE add_notes_stmt;

SET @drop_status_check_sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE finance_providers DROP CHECK chk_finance_providers_status',
    'SELECT 1'
  )
  FROM information_schema.check_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'chk_finance_providers_status'
);
PREPARE drop_status_check_stmt FROM @drop_status_check_sql;
EXECUTE drop_status_check_stmt;
DEALLOCATE PREPARE drop_status_check_stmt;

ALTER TABLE finance_providers
  ADD CONSTRAINT chk_finance_providers_status
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED'));
