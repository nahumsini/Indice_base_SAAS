SET @schema_name = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'hr_announcement_deliveries' AND column_name = 'dismissed_at') = 0,
  'ALTER TABLE hr_announcement_deliveries ADD COLUMN dismissed_at timestamp NULL DEFAULT NULL AFTER read_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'hr_announcement_deliveries' AND column_name = 'dismissed_by') = 0,
  'ALTER TABLE hr_announcement_deliveries ADD COLUMN dismissed_by bigint NULL AFTER dismissed_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @schema_name AND table_name = 'hr_announcement_deliveries'
     AND index_name = 'idx_hr_announcement_deliveries_inbox') = 0,
  'ALTER TABLE hr_announcement_deliveries ADD INDEX idx_hr_announcement_deliveries_inbox (company_id, user_company_id, dismissed_at, status, delivered_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
