SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND COLUMN_NAME = 'agenda_date'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN agenda_date DATE NULL AFTER due_date'
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
          AND COLUMN_NAME = 'agenda_start_time'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN agenda_start_time TIME NULL AFTER agenda_date'
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
          AND COLUMN_NAME = 'agenda_end_time'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN agenda_end_time TIME NULL AFTER agenda_start_time'
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
          AND COLUMN_NAME = 'agenda_time_zone'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN agenda_time_zone VARCHAR(80) NULL AFTER agenda_end_time'
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
          AND INDEX_NAME = 'idx_process_tasks_company_agenda_date'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_company_agenda_date (company_id, agenda_date)'
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
          AND INDEX_NAME = 'idx_process_tasks_company_agenda_start'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_company_agenda_start (company_id, agenda_date, agenda_start_time)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
