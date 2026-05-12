SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND COLUMN_NAME = 'start_date'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN start_date DATE NULL AFTER due_date'
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
          AND COLUMN_NAME = 'notes'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN notes TEXT NULL AFTER completion_notes'
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
          AND COLUMN_NAME = 'completion_percent'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN completion_percent TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER notes'
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
          AND COLUMN_NAME = 'weighting'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN weighting INT NULL AFTER completion_percent'
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
          AND COLUMN_NAME = 'audited'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN audited TINYINT(1) NOT NULL DEFAULT 0 AFTER weighting'
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
          AND COLUMN_NAME = 'audit_notes'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN audit_notes TEXT NULL AFTER audited'
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
          AND COLUMN_NAME = 'audited_at'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN audited_at DATETIME NULL AFTER audit_notes'
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
          AND COLUMN_NAME = 'audited_by_user_company_id'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN audited_by_user_company_id BIGINT NULL AFTER audited_at'
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
          AND INDEX_NAME = 'idx_process_tasks_company_start_date'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_company_start_date (company_id, start_date)'
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
          AND INDEX_NAME = 'idx_process_tasks_company_audited'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_company_audited (company_id, audited)'
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
          AND INDEX_NAME = 'idx_process_tasks_audited_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_audited_user_company (audited_by_user_company_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND CONSTRAINT_NAME = 'fk_process_tasks_audited_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD CONSTRAINT fk_process_tasks_audited_user_company FOREIGN KEY (audited_by_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE process_tasks
SET completion_percent = CASE WHEN status = 'completed' THEN 100 ELSE 0 END
WHERE completion_percent IS NULL;
