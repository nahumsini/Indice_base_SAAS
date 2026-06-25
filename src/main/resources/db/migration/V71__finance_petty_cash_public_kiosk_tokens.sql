SET @add_petty_cash_kiosk_token_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_petty_cash_funds ADD COLUMN kiosk_public_token VARCHAR(96) NULL AFTER kiosk_access_url',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_petty_cash_funds'
    AND column_name = 'kiosk_public_token'
);
PREPARE add_petty_cash_kiosk_token_stmt FROM @add_petty_cash_kiosk_token_sql;
EXECUTE add_petty_cash_kiosk_token_stmt;
DEALLOCATE PREPARE add_petty_cash_kiosk_token_stmt;

UPDATE finance_petty_cash_funds
SET kiosk_public_token = CONCAT(REPLACE(UUID(), '-', ''), LOWER(HEX(id)))
WHERE kiosk_enabled = TRUE
  AND kiosk_public_token IS NULL
  AND deleted_at IS NULL;

UPDATE finance_petty_cash_funds
SET kiosk_access_url = CONCAT('/petty-cash/kiosk/', kiosk_public_token)
WHERE kiosk_enabled = TRUE
  AND kiosk_public_token IS NOT NULL
  AND deleted_at IS NULL
  AND (
    kiosk_access_url IS NULL
    OR kiosk_access_url = ''
    OR kiosk_access_url REGEXP '^/petty-cash/kiosk/[0-9]+$'
  );

SET @add_petty_cash_kiosk_token_index_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE finance_petty_cash_funds ADD UNIQUE KEY uq_finance_petty_cash_funds_kiosk_public_token (kiosk_public_token)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'finance_petty_cash_funds'
    AND index_name = 'uq_finance_petty_cash_funds_kiosk_public_token'
);
PREPARE add_petty_cash_kiosk_token_index_stmt FROM @add_petty_cash_kiosk_token_index_sql;
EXECUTE add_petty_cash_kiosk_token_index_stmt;
DEALLOCATE PREPARE add_petty_cash_kiosk_token_index_stmt;
