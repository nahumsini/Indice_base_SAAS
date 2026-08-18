-- Some long-lived local databases were baselined after V30 without receiving
-- the avatar object-key columns. Reassert the current schema forward-only so
-- those databases can migrate and accept the idempotent local demo seed.
SET @has_avatar_object_key = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_object_key'
);
SET @sql = IF(
  @has_avatar_object_key = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_object_key` varchar(512) DEFAULT NULL AFTER `avatar_url`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_avatar_content_type = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_content_type'
);
SET @sql = IF(
  @has_avatar_content_type = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_content_type` varchar(100) DEFAULT NULL AFTER `avatar_object_key`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_avatar_updated_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_updated_at'
);
SET @sql = IF(
  @has_avatar_updated_at = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_updated_at` datetime DEFAULT NULL AFTER `avatar_content_type`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
