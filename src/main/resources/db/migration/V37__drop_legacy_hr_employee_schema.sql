SET @schema_name = DATABASE();
SET @legacy_fk_name = NULL;

SELECT CONSTRAINT_NAME
INTO @legacy_fk_name
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'process_tasks'
  AND COLUMN_NAME = 'assigned_employee_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
LIMIT 1;

SET @ddl = IF(
    @legacy_fk_name IS NOT NULL,
    CONCAT('ALTER TABLE process_tasks DROP FOREIGN KEY `', REPLACE(@legacy_fk_name, '`', '``'), '`'),
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @legacy_fk_name = NULL;

SELECT CONSTRAINT_NAME
INTO @legacy_fk_name
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'process_tasks'
  AND COLUMN_NAME = 'completed_by_employee_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
LIMIT 1;

SET @ddl = IF(
    @legacy_fk_name IS NOT NULL,
    CONCAT('ALTER TABLE process_tasks DROP FOREIGN KEY `', REPLACE(@legacy_fk_name, '`', '``'), '`'),
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @legacy_fk_name = NULL;

SELECT CONSTRAINT_NAME
INTO @legacy_fk_name
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = @schema_name
  AND TABLE_NAME = 'projects'
  AND COLUMN_NAME = 'owner_employee_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
LIMIT 1;

SET @ddl = IF(
    @legacy_fk_name IS NOT NULL,
    CONCAT('ALTER TABLE projects DROP FOREIGN KEY `', REPLACE(@legacy_fk_name, '`', '``'), '`'),
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND INDEX_NAME = 'idx_process_tasks_employee'
    ),
    'ALTER TABLE process_tasks DROP INDEX idx_process_tasks_employee',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'projects'
          AND INDEX_NAME = 'idx_projects_owner_employee'
    ),
    'ALTER TABLE projects DROP INDEX idx_projects_owner_employee',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND COLUMN_NAME = 'assigned_employee_id'
    ),
    'ALTER TABLE process_tasks DROP COLUMN assigned_employee_id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND COLUMN_NAME = 'completed_by_employee_id'
    ),
    'ALTER TABLE process_tasks DROP COLUMN completed_by_employee_id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'projects'
          AND COLUMN_NAME = 'owner_employee_id'
    ),
    'ALTER TABLE projects DROP COLUMN owner_employee_id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS
  hr_payroll_run_line_items,
  hr_payroll_run_lines,
  hr_payroll_runs,
  hr_payroll_preferences,
  hr_asset_assignments,
  hr_asset_status_history,
  hr_assets,
  hr_employee_record_activity,
  hr_employee_record_attachments,
  hr_employee_record_witnesses,
  hr_employee_records,
  hr_face_verification_events,
  hr_face_verification_sessions,
  hr_face_enrollment_captures,
  hr_face_enrollments,
  hr_employee_access_methods,
  hr_employee_access_profiles,
  hr_employee_allowed_locations,
  hr_employee_work_site_assignments,
  hr_employee_schedule_assignments,
  hr_attendance_daily_records,
  hr_attendance_events,
  hr_kiosk_devices,
  hr_schedule_template_days,
  hr_schedule_templates,
  hr_attendance_locations,
  hr_employee_documents,
  hr_employee_profiles,
  hr_employee_portal_access,
  hr_employee_number_sequences,
  hr_user_attendance_daily_records,
  hr_user_attendance_events,
  hr_employees;

SET FOREIGN_KEY_CHECKS = 1;
