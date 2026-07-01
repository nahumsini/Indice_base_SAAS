SET @add_user_permission_requests_payroll_treatment := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_permission_requests` ADD COLUMN `payroll_treatment` varchar(16) NOT NULL DEFAULT ''paid'' AFTER `permission_type`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_permission_requests'
    AND column_name = 'payroll_treatment'
);

PREPARE stmt FROM @add_user_permission_requests_payroll_treatment;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `user_permission_requests`
SET `payroll_treatment` = CASE
  WHEN LOWER(COALESCE(`permission_type`, '')) IN ('unpaid', 'unpaid_leave') THEN 'unpaid'
  WHEN LOWER(COALESCE(`payroll_treatment`, '')) IN ('paid', 'unpaid') THEN LOWER(`payroll_treatment`)
  ELSE 'paid'
END;

SET @add_user_permission_requests_payroll_treatment_check := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_permission_requests` ADD CONSTRAINT `chk_user_permission_requests_payroll_treatment` CHECK (`payroll_treatment` IN (''paid'', ''unpaid''))',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'user_permission_requests'
    AND constraint_name = 'chk_user_permission_requests_payroll_treatment'
);

PREPARE stmt FROM @add_user_permission_requests_payroll_treatment_check;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_user_permission_requests_payroll_treatment_idx := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `idx_user_permission_requests_company_payroll_treatment` ON `user_permission_requests` (`company_id`, `payroll_treatment`)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_permission_requests'
    AND index_name = 'idx_user_permission_requests_company_payroll_treatment'
);

PREPARE stmt FROM @add_user_permission_requests_payroll_treatment_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_attendance_leave_payroll_treatment := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_attendance_daily_records` ADD COLUMN `leave_payroll_treatment` varchar(16) DEFAULT NULL AFTER `corrected_status`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_daily_records'
    AND column_name = 'leave_payroll_treatment'
);

PREPARE stmt FROM @add_attendance_leave_payroll_treatment;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_attendance_permission_request_id := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_attendance_daily_records` ADD COLUMN `permission_request_id` bigint DEFAULT NULL AFTER `leave_payroll_treatment`',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_daily_records'
    AND column_name = 'permission_request_id'
);

PREPARE stmt FROM @add_attendance_permission_request_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_attendance_leave_payroll_treatment_check := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_attendance_daily_records` ADD CONSTRAINT `chk_user_attendance_leave_payroll_treatment` CHECK (`leave_payroll_treatment` IS NULL OR `leave_payroll_treatment` IN (''paid'', ''unpaid''))',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_daily_records'
    AND constraint_name = 'chk_user_attendance_leave_payroll_treatment'
);

PREPARE stmt FROM @add_attendance_leave_payroll_treatment_check;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_attendance_permission_request_idx := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX `idx_user_attendance_daily_records_permission_request` ON `user_attendance_daily_records` (`permission_request_id`)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_daily_records'
    AND index_name = 'idx_user_attendance_daily_records_permission_request'
);

PREPARE stmt FROM @add_attendance_permission_request_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_attendance_permission_request_fk := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `user_attendance_daily_records` ADD CONSTRAINT `fk_user_attendance_daily_records_permission_request` FOREIGN KEY (`permission_request_id`) REFERENCES `user_permission_requests` (`id`) ON DELETE SET NULL',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_daily_records'
    AND constraint_name = 'fk_user_attendance_daily_records_permission_request'
);

PREPARE stmt FROM @add_attendance_permission_request_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
