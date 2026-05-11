SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'schedule_mode'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN schedule_mode varchar(20) NOT NULL DEFAULT ''strict'' AFTER status'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'block_after_grace_period'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN block_after_grace_period tinyint(1) NOT NULL DEFAULT 0 AFTER schedule_mode'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'enforce_location'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN enforce_location tinyint(1) NOT NULL DEFAULT 0 AFTER block_after_grace_period'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'location_id'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN location_id bigint DEFAULT NULL AFTER enforce_location'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND INDEX_NAME = 'idx_attendance_schedule_templates_location'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD INDEX idx_attendance_schedule_templates_location (location_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_template_days'
          AND COLUMN_NAME = 'meal_minutes'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_template_days ADD COLUMN meal_minutes int NOT NULL DEFAULT 0 AFTER end_time'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_template_days'
          AND COLUMN_NAME = 'rest_minutes'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_template_days ADD COLUMN rest_minutes int NOT NULL DEFAULT 0 AFTER meal_minutes'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'user_attendance_daily_records'
          AND COLUMN_NAME = 'source_schedule_template_id'
    ),
    'SELECT 1',
    'ALTER TABLE user_attendance_daily_records ADD COLUMN source_schedule_template_id bigint DEFAULT NULL AFTER minutes_late'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'user_face_enrollments'
          AND COLUMN_NAME = 'expires_at'
    ),
    'SELECT 1',
    'ALTER TABLE user_face_enrollments ADD COLUMN expires_at datetime DEFAULT NULL AFTER created_by'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
