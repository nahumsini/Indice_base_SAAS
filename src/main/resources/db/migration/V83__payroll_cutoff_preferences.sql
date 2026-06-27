SET @add_payroll_weekly_start_day := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_preferences` ADD COLUMN `weekly_start_day` tinyint unsigned NOT NULL DEFAULT 1 AFTER `pay_leave_days`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_preferences'
    AND column_name = 'weekly_start_day'
);

PREPARE stmt FROM @add_payroll_weekly_start_day;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_biweekly_first_day := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_preferences` ADD COLUMN `biweekly_first_day` tinyint unsigned NOT NULL DEFAULT 1 AFTER `weekly_start_day`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_preferences'
    AND column_name = 'biweekly_first_day'
);

PREPARE stmt FROM @add_payroll_biweekly_first_day;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_biweekly_second_day := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_preferences` ADD COLUMN `biweekly_second_day` tinyint unsigned NOT NULL DEFAULT 16 AFTER `biweekly_first_day`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_preferences'
    AND column_name = 'biweekly_second_day'
);

PREPARE stmt FROM @add_payroll_biweekly_second_day;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_monthly_start_day := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_preferences` ADD COLUMN `monthly_start_day` tinyint unsigned NOT NULL DEFAULT 1 AFTER `biweekly_second_day`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_preferences'
    AND column_name = 'monthly_start_day'
);

PREPARE stmt FROM @add_payroll_monthly_start_day;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
