SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND COLUMN_NAME = 'project_id'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN project_id BIGINT NULL AFTER process_id'
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
          AND COLUMN_NAME = 'business_id'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN business_id BIGINT NULL AFTER due_date'
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
          AND COLUMN_NAME = 'unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN unit_id BIGINT NULL AFTER business_id'
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
          AND COLUMN_NAME = 'priority'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN priority VARCHAR(50) NULL AFTER status'
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
          AND COLUMN_NAME = 'started_at'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN started_at DATETIME NULL AFTER due_date'
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
          AND COLUMN_NAME = 'cancelled_at'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN cancelled_at DATETIME NULL AFTER completed_at'
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
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN completed_by_employee_id BIGINT NULL AFTER cancelled_at'
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
          AND COLUMN_NAME = 'completed_by_user_id'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN completed_by_user_id BIGINT NULL AFTER completed_by_employee_id'
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
          AND COLUMN_NAME = 'completion_notes'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN completion_notes TEXT NULL AFTER completed_by_user_id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE process_tasks
SET priority = COALESCE(NULLIF(priority, ''), 'medium')
WHERE priority IS NULL
   OR priority = '';

