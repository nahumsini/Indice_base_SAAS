-- Reassert avatar object-storage columns for databases that retained a legacy
-- user_profiles table while Flyway history advanced past the original change.
SET @v192_has_avatar_object_key = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_object_key'
);
SET @v192_sql = IF(
  @v192_has_avatar_object_key = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_object_key` varchar(512) DEFAULT NULL',
  'SELECT 1'
);
PREPARE v192_stmt FROM @v192_sql;
EXECUTE v192_stmt;
DEALLOCATE PREPARE v192_stmt;

SET @v192_has_avatar_content_type = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_content_type'
);
SET @v192_sql = IF(
  @v192_has_avatar_content_type = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_content_type` varchar(100) DEFAULT NULL',
  'SELECT 1'
);
PREPARE v192_stmt FROM @v192_sql;
EXECUTE v192_stmt;
DEALLOCATE PREPARE v192_stmt;

SET @v192_has_avatar_updated_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_updated_at'
);
SET @v192_sql = IF(
  @v192_has_avatar_updated_at = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_updated_at` datetime DEFAULT NULL',
  'SELECT 1'
);
PREPARE v192_stmt FROM @v192_sql;
EXECUTE v192_stmt;
DEALLOCATE PREPARE v192_stmt;
