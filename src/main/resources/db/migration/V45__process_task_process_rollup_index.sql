SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND INDEX_NAME = 'idx_process_tasks_company_process'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_company_process (company_id, process_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
