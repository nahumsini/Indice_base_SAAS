SET @add_user_work_profile_payroll_treatment := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_work_profiles` ADD COLUMN `payroll_treatment` varchar(32) NOT NULL DEFAULT ''fiscal_payroll'' AFTER `workdays_per_week`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_work_profiles'
    AND column_name = 'payroll_treatment'
);

PREPARE stmt FROM @add_user_work_profile_payroll_treatment;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_line_treatment_snapshot := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `payroll_treatment_snapshot` varchar(32) NOT NULL DEFAULT ''fiscal_payroll'' AFTER `include_in_fiscal`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'payroll_treatment_snapshot'
);

PREPARE stmt FROM @add_payroll_line_treatment_snapshot;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_line_payment_route := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `payment_route` varchar(32) NOT NULL DEFAULT ''payroll'' AFTER `payroll_treatment_snapshot`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'payment_route'
);

PREPARE stmt FROM @add_payroll_line_payment_route;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_line_payable_expense := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `payable_expense_id` bigint NULL AFTER `payment_route`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'payable_expense_id'
);

PREPARE stmt FROM @add_payroll_line_payable_expense;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_line_payable_created_at := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `payable_created_at` timestamp NULL AFTER `payable_expense_id`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'payable_created_at'
);

PREPARE stmt FROM @add_payroll_line_payable_created_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_line_payable_metadata := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD COLUMN `payable_metadata_json` json NULL AFTER `payable_created_at`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND column_name = 'payable_metadata_json'
);

PREPARE stmt FROM @add_payroll_line_payable_metadata;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_payroll_line_payable_index := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `payroll_run_lines` ADD INDEX `idx_payroll_run_lines_payable_expense` (`company_id`, `payable_expense_id`)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'payroll_run_lines'
    AND index_name = 'idx_payroll_run_lines_payable_expense'
);

PREPARE stmt FROM @add_payroll_line_payable_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE user_work_profiles
SET payroll_treatment = 'fiscal_payroll'
WHERE payroll_treatment IS NULL
   OR TRIM(payroll_treatment) = '';

UPDATE payroll_run_lines
SET payroll_treatment_snapshot = CASE
  WHEN include_in_fiscal = 1 THEN 'fiscal_payroll'
  ELSE 'operational_payroll'
END
WHERE payroll_treatment_snapshot IS NULL
   OR TRIM(payroll_treatment_snapshot) = '';

UPDATE payroll_run_lines
SET payment_route = CASE
  WHEN payroll_treatment_snapshot = 'accounts_payable' THEN 'expenses'
  WHEN payroll_treatment_snapshot = 'no_payroll' THEN 'none'
  ELSE 'payroll'
END
WHERE payment_route IS NULL
   OR TRIM(payment_route) = '';

CREATE OR REPLACE VIEW hr_users AS
SELECT uc.id AS id,
       uc.company_id AS company_id,
       uc.id AS user_company_id,
       u.id AS user_id,
       wp.id AS work_profile_id,
       COALESCE(wp.user_code, '') AS user_code,
       COALESCE(wp.user_code, '') AS employee_number,
       TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)) AS full_name,
       SUBSTRING_INDEX(TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)), ' ', 1) AS first_name,
       TRIM(
         SUBSTRING(
           TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)),
           CHAR_LENGTH(SUBSTRING_INDEX(TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)), ' ', 1)) + 1
         )
       ) AS last_name,
       u.email AS email,
       COALESCE(up.phone, '') AS phone,
       COALESCE(wp.position, '') AS position,
       COALESCE(wp.department, '') AS department,
       wp.unit_id AS unit_id,
       wp.business_id AS business_id,
       wp.hire_date AS hire_date,
       wp.salary AS salary,
       COALESCE(wp.pay_period, 'weekly') AS pay_period,
       COALESCE(wp.salary_type, 'daily') AS salary_type,
       wp.hourly_rate AS hourly_rate,
       COALESCE(wp.contract_type, 'permanent') AS contract_type,
       wp.contract_start_date AS contract_start_date,
       wp.contract_end_date AS contract_end_date,
       wp.termination_date AS termination_date,
       wp.last_working_day AS last_working_day,
       wp.termination_reason_type AS termination_reason_type,
       wp.termination_reason_code AS termination_reason_code,
       wp.termination_summary AS termination_summary,
       COALESCE(wp.date_of_birth, NULL) AS date_of_birth,
       COALESCE(wp.address, '') AS address,
       COALESCE(wp.national_id, '') AS national_id,
       COALESCE(wp.tax_id, '') AS tax_id,
       COALESCE(wp.social_security_number, '') AS social_security_number,
       COALESCE(wp.registration_country, '') AS registration_country,
       COALESCE(wp.state_province, '') AS state_province,
       COALESCE(wp.city, '') AS city,
       COALESCE(wp.postal_code, '') AS postal_code,
       COALESCE(wp.alternate_phone, '') AS alternate_phone,
       COALESCE(wp.emergency_contact_name, '') AS emergency_contact_name,
       COALESCE(wp.emergency_contact_relationship, '') AS emergency_contact_relationship,
       COALESCE(wp.emergency_contact_phone, '') AS emergency_contact_phone,
       COALESCE(wp.workday_hours, 8.00) AS workday_hours,
       COALESCE(wp.workdays_per_week, 5.00) AS workdays_per_week,
       COALESCE(wp.payroll_treatment, 'fiscal_payroll') AS payroll_treatment,
       COALESCE(wp.status, uc.status, 'active') AS status,
       wp.created_by AS created_by,
       COALESCE(wp.created_at, uc.created_at) AS created_at,
       wp.updated_at AS updated_at
FROM user_companies uc
JOIN users u
  ON u.id = uc.user_id
LEFT JOIN user_profiles up
  ON up.user_id = u.id
LEFT JOIN user_work_profiles wp
  ON wp.company_id = uc.company_id
 AND wp.user_company_id = uc.id;
