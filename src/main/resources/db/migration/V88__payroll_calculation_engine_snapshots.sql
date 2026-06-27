SET @add_payroll_runs_currency_code = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_runs` ADD COLUMN `currency_code` varchar(8) NULL AFTER `pay_period`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_runs'
    AND column_name = 'currency_code'
);
PREPARE stmt FROM @add_payroll_runs_currency_code;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_runs_fx_rate = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_runs` ADD COLUMN `fx_rate` decimal(20,8) NOT NULL DEFAULT 1.00000000 AFTER `currency_code`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_runs'
    AND column_name = 'fx_rate'
);
PREPARE stmt FROM @add_payroll_runs_fx_rate;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_runs_calculation_source = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_runs` ADD COLUMN `calculation_source` varchar(80) NULL AFTER `fx_rate`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_runs'
    AND column_name = 'calculation_source'
);
PREPARE stmt FROM @add_payroll_runs_calculation_source;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_runs_calculation_timestamp = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_runs` ADD COLUMN `calculation_timestamp` datetime NULL AFTER `calculation_source`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_runs'
    AND column_name = 'calculation_timestamp'
);
PREPARE stmt FROM @add_payroll_runs_calculation_timestamp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_runs_calculation_snapshot = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_runs` ADD COLUMN `calculation_snapshot_json` json NULL AFTER `calculation_timestamp`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_runs'
    AND column_name = 'calculation_snapshot_json'
);
PREPARE stmt FROM @add_payroll_runs_calculation_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_country = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `country_code_snapshot` varchar(8) NULL AFTER `business_name_snapshot`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'country_code_snapshot'
);
PREPARE stmt FROM @add_payroll_run_lines_country;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_jurisdiction = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `jurisdiction_code_snapshot` varchar(32) NULL AFTER `country_code_snapshot`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'jurisdiction_code_snapshot'
);
PREPARE stmt FROM @add_payroll_run_lines_jurisdiction;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_currency = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `currency_code_snapshot` varchar(8) NULL AFTER `jurisdiction_code_snapshot`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'currency_code_snapshot'
);
PREPARE stmt FROM @add_payroll_run_lines_currency;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_fx_rate = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `fx_rate` decimal(20,8) NOT NULL DEFAULT 1.00000000 AFTER `currency_code_snapshot`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'fx_rate'
);
PREPARE stmt FROM @add_payroll_run_lines_fx_rate;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_missing_attendance = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `missing_attendance_days` decimal(8,2) NOT NULL DEFAULT 0.00 AFTER `rest_days`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'missing_attendance_days'
);
PREPARE stmt FROM @add_payroll_run_lines_missing_attendance;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_paid_leave = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `paid_leave_days` decimal(8,2) NOT NULL DEFAULT 0.00 AFTER `missing_attendance_days`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'paid_leave_days'
);
PREPARE stmt FROM @add_payroll_run_lines_paid_leave;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_unpaid_absence = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `unpaid_absence_days` decimal(8,2) NOT NULL DEFAULT 0.00 AFTER `paid_leave_days`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'unpaid_absence_days'
);
PREPARE stmt FROM @add_payroll_run_lines_unpaid_absence;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_calculation_source = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `calculation_source` varchar(80) NULL AFTER `notes`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'calculation_source'
);
PREPARE stmt FROM @add_payroll_run_lines_calculation_source;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_calculation_timestamp = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `calculation_timestamp` datetime NULL AFTER `calculation_source`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'calculation_timestamp'
);
PREPARE stmt FROM @add_payroll_run_lines_calculation_timestamp;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_employee_salary_snapshot = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `employee_salary_snapshot_json` json NULL AFTER `calculation_timestamp`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'employee_salary_snapshot_json'
);
PREPARE stmt FROM @add_payroll_run_lines_employee_salary_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_attendance_snapshot = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `attendance_snapshot_json` json NULL AFTER `employee_salary_snapshot_json`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'attendance_snapshot_json'
);
PREPARE stmt FROM @add_payroll_run_lines_attendance_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_manual_adjustments_snapshot = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `manual_adjustments_snapshot_json` json NULL AFTER `attendance_snapshot_json`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'manual_adjustments_snapshot_json'
);
PREPARE stmt FROM @add_payroll_run_lines_manual_adjustments_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_calculation_inputs = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `calculation_inputs_json` json NULL AFTER `manual_adjustments_snapshot_json`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'calculation_inputs_json'
);
PREPARE stmt FROM @add_payroll_run_lines_calculation_inputs;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_calculation_results = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `calculation_results_json` json NULL AFTER `calculation_inputs_json`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'calculation_results_json'
);
PREPARE stmt FROM @add_payroll_run_lines_calculation_results;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_rule_snapshot = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `rule_snapshot_json` json NULL AFTER `calculation_results_json`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'rule_snapshot_json'
);
PREPARE stmt FROM @add_payroll_run_lines_rule_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_lines_attendance_warnings = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `attendance_warnings_json` json NULL AFTER `rule_snapshot_json`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'attendance_warnings_json'
);
PREPARE stmt FROM @add_payroll_run_lines_attendance_warnings;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_country = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `country_code` varchar(8) NULL AFTER `source_type`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'country_code'
);
PREPARE stmt FROM @add_payroll_run_line_items_country;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_jurisdiction = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `jurisdiction_code` varchar(32) NULL AFTER `country_code`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'jurisdiction_code'
);
PREPARE stmt FROM @add_payroll_run_line_items_jurisdiction;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_tax_treatment = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `tax_treatment` varchar(80) NULL AFTER `jurisdiction_code`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'tax_treatment'
);
PREPARE stmt FROM @add_payroll_run_line_items_tax_treatment;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_taxable = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `taxable` tinyint(1) NOT NULL DEFAULT 0 AFTER `tax_treatment`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'taxable'
);
PREPARE stmt FROM @add_payroll_run_line_items_taxable;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_exempt = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `exempt` tinyint(1) NOT NULL DEFAULT 0 AFTER `taxable`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'exempt'
);
PREPARE stmt FROM @add_payroll_run_line_items_exempt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_affects_social_security = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `affects_social_security` tinyint(1) NOT NULL DEFAULT 0 AFTER `exempt`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'affects_social_security'
);
PREPARE stmt FROM @add_payroll_run_line_items_affects_social_security;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_affects_employer_cost = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `affects_employer_cost` tinyint(1) NOT NULL DEFAULT 0 AFTER `affects_social_security`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'affects_employer_cost'
);
PREPARE stmt FROM @add_payroll_run_line_items_affects_employer_cost;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_legal_classification = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `legal_classification` varchar(120) NULL AFTER `affects_employer_cost`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'legal_classification'
);
PREPARE stmt FROM @add_payroll_run_line_items_legal_classification;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_rule_code = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `rule_code` varchar(80) NULL AFTER `legal_classification`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'rule_code'
);
PREPARE stmt FROM @add_payroll_run_line_items_rule_code;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_rule_set_id = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `rule_set_id` bigint NULL AFTER `rule_code`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'rule_set_id'
);
PREPARE stmt FROM @add_payroll_run_line_items_rule_set_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_formula = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `calculation_formula` varchar(255) NULL AFTER `rule_set_id`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'calculation_formula'
);
PREPARE stmt FROM @add_payroll_run_line_items_formula;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_base = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `calculation_base` decimal(20,8) NULL AFTER `calculation_formula`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'calculation_base'
);
PREPARE stmt FROM @add_payroll_run_line_items_base;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_rate = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `rate_applied` decimal(20,8) NULL AFTER `calculation_base`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'rate_applied'
);
PREPARE stmt FROM @add_payroll_run_line_items_rate;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_currency = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD COLUMN `currency_code` varchar(8) NULL AFTER `rate_applied`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND column_name = 'currency_code'
);
PREPARE stmt FROM @add_payroll_run_line_items_currency;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_run_line_items_rule_fk = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_line_items` ADD CONSTRAINT `fk_payroll_run_line_items_rule_set` FOREIGN KEY (`rule_set_id`) REFERENCES `payroll_rule_sets` (`id`) ON DELETE SET NULL',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_line_items'
    AND constraint_name = 'fk_payroll_run_line_items_rule_set'
);
PREPARE stmt FROM @add_payroll_run_line_items_rule_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
