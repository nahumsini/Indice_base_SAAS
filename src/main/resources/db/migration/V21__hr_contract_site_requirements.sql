SET @has_required_hours_per_day = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'hr_attendance_locations'
    AND column_name = 'required_hours_per_day'
);

SET @sql = IF(
  @has_required_hours_per_day = 0,
  'ALTER TABLE `hr_attendance_locations` ADD COLUMN `required_hours_per_day` decimal(5,2) NOT NULL DEFAULT ''8.00'' AFTER `radius_meters`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_required_days_per_week = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'hr_attendance_locations'
    AND column_name = 'required_days_per_week'
);

SET @sql = IF(
  @has_required_days_per_week = 0,
  'ALTER TABLE `hr_attendance_locations` ADD COLUMN `required_days_per_week` int NOT NULL DEFAULT ''5'' AFTER `required_hours_per_day`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
