SET @schema_name = DATABASE();

SET @sql = IF(
    (SELECT COUNT(*)
     FROM information_schema.statistics
     WHERE table_schema = @schema_name
       AND table_name = 'hr_announcement_targets'
       AND index_name = 'idx_hr_announcement_targets_lookup') = 0,
    'ALTER TABLE hr_announcement_targets ADD INDEX idx_hr_announcement_targets_lookup (target_type, target_value, announcement_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*)
     FROM information_schema.statistics
     WHERE table_schema = @schema_name
       AND table_name = 'hr_announcements'
       AND index_name = 'idx_hr_announcements_company_status_schedule') = 0,
    'ALTER TABLE hr_announcements ADD INDEX idx_hr_announcements_company_status_schedule (company_id, status, scheduled_for)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
