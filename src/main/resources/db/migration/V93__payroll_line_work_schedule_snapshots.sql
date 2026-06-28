SET @add_payroll_run_lines_workday_hours_snapshot = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `workday_hours_snapshot` decimal(8,2) NULL AFTER `hourly_rate_amount`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'workday_hours_snapshot'
);
PREPARE stmt FROM @add_payroll_run_lines_workday_hours_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_workdays_per_week_snapshot = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `workdays_per_week_snapshot` decimal(8,2) NULL AFTER `workday_hours_snapshot`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'workdays_per_week_snapshot'
);
PREPARE stmt FROM @add_payroll_run_lines_workdays_per_week_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
