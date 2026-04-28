SET @has_required_start_time = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'hr_attendance_locations'
    AND column_name = 'required_start_time'
);

SET @add_required_start_time = IF(
  @has_required_start_time = 0,
  'ALTER TABLE `hr_attendance_locations` ADD COLUMN `required_start_time` time NOT NULL DEFAULT ''08:00:00'' AFTER `required_hours_per_day`',
  'SELECT 1'
);
PREPARE add_required_start_time_stmt FROM @add_required_start_time;
EXECUTE add_required_start_time_stmt;
DEALLOCATE PREPARE add_required_start_time_stmt;

SET @has_required_end_time = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'hr_attendance_locations'
    AND column_name = 'required_end_time'
);

SET @add_required_end_time = IF(
  @has_required_end_time = 0,
  'ALTER TABLE `hr_attendance_locations` ADD COLUMN `required_end_time` time NOT NULL DEFAULT ''16:00:00'' AFTER `required_start_time`',
  'SELECT 1'
);
PREPARE add_required_end_time_stmt FROM @add_required_end_time;
EXECUTE add_required_end_time_stmt;
DEALLOCATE PREPARE add_required_end_time_stmt;
