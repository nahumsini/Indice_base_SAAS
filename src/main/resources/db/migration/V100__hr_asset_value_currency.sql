SET @add_user_assets_value_currency := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_assets` ADD COLUMN `value_currency` char(3) NOT NULL DEFAULT ''USD'' AFTER `value_amount`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_assets'
    AND column_name = 'value_currency'
);

PREPARE stmt FROM @add_user_assets_value_currency;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `user_assets`
SET `value_currency` = 'USD'
WHERE `value_currency` IS NULL
   OR TRIM(`value_currency`) = '';

UPDATE `user_assets`
SET `value_currency` = UPPER(TRIM(`value_currency`));

UPDATE `user_assets`
SET `value_currency` = 'USD'
WHERE `value_currency` NOT REGEXP '^[A-Z]{3}$';

SET @add_user_assets_value_currency_check := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_assets` ADD CONSTRAINT `chk_user_assets_value_currency` CHECK (`value_currency` REGEXP ''^[A-Z]{3}$'')',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'user_assets'
    AND constraint_name = 'chk_user_assets_value_currency'
);

PREPARE stmt FROM @add_user_assets_value_currency_check;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
