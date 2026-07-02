SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_events'
    AND column_name = 'photo_retained_until'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE user_attendance_events ADD COLUMN photo_retained_until DATETIME NULL AFTER photo_url',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_events'
    AND column_name = 'photo_deleted_at'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE user_attendance_events ADD COLUMN photo_deleted_at DATETIME NULL AFTER photo_retained_until',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_events'
    AND column_name = 'photo_retention_reason'
);
SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE user_attendance_events ADD COLUMN photo_retention_reason VARCHAR(40) NULL AFTER photo_deleted_at',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE user_attendance_events
SET photo_retained_until = DATE_ADD(event_timestamp, INTERVAL 30 DAY)
WHERE COALESCE(TRIM(photo_url), '') <> ''
  AND photo_retained_until IS NULL;

SET @index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_attendance_events'
    AND index_name = 'idx_user_attendance_events_photo_retention'
);
SET @ddl := IF(
  @index_exists = 0,
  'CREATE INDEX idx_user_attendance_events_photo_retention ON user_attendance_events (company_id, photo_deleted_at, photo_retained_until)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
