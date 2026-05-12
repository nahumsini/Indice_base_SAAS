SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'task_title_template'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN task_title_template VARCHAR(220) NULL AFTER description'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'task_description_template'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN task_description_template TEXT NULL AFTER task_title_template'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'task_notes_template'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN task_notes_template TEXT NULL AFTER task_description_template'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'start_date'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN start_date DATE NULL AFTER recurrence_json'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'end_date'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN end_date DATE NULL AFTER start_date'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'grace_days'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN grace_days INT NOT NULL DEFAULT 0 AFTER end_date'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'generation_window_days'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN generation_window_days INT NOT NULL DEFAULT 45 AFTER grace_days'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'evidence_required'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN evidence_required TINYINT(1) NOT NULL DEFAULT 0 AFTER generation_window_days'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'last_generated_for_date'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN last_generated_for_date DATE NULL AFTER evidence_required'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'next_occurrence_date'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN next_occurrence_date DATE NULL AFTER last_generated_for_date'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'generated_until_date'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN generated_until_date DATE NULL AFTER next_occurrence_date'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'last_materialized_at'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN last_materialized_at DATETIME NULL AFTER generated_until_date'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE processes
SET task_title_template = title
WHERE task_title_template IS NULL;

UPDATE processes
SET task_description_template = description
WHERE task_description_template IS NULL;

UPDATE processes
SET start_date = DATE(created_at)
WHERE start_date IS NULL
  AND created_at IS NOT NULL;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND INDEX_NAME = 'idx_processes_company_next_occurrence'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD INDEX idx_processes_company_next_occurrence (company_id, is_active, next_occurrence_date)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND INDEX_NAME = 'idx_processes_company_generated_until'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD INDEX idx_processes_company_generated_until (company_id, generated_until_date)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
