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
