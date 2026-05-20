SET @has_user_invitations_unit_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_invitations'
    AND column_name = 'unit_id'
);
SET @sql = IF(
  @has_user_invitations_unit_id = 0,
  'ALTER TABLE user_invitations ADD COLUMN unit_id bigint DEFAULT NULL AFTER module_slugs_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_user_invitations_business_id = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_invitations'
    AND column_name = 'business_id'
);
SET @sql = IF(
  @has_user_invitations_business_id = 0,
  'ALTER TABLE user_invitations ADD COLUMN business_id bigint DEFAULT NULL AFTER unit_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_user_invitations_unit_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_invitations'
    AND index_name = 'idx_user_invitations_unit'
);
SET @sql = IF(
  @has_user_invitations_unit_idx = 0,
  'ALTER TABLE user_invitations ADD KEY idx_user_invitations_unit (unit_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_user_invitations_business_idx = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'user_invitations'
    AND index_name = 'idx_user_invitations_business'
);
SET @sql = IF(
  @has_user_invitations_business_idx = 0,
  'ALTER TABLE user_invitations ADD KEY idx_user_invitations_business (business_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_user_invitations_unit_fk = (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'user_invitations'
    AND constraint_name = 'fk_user_invitations_unit'
);
SET @sql = IF(
  @has_user_invitations_unit_fk = 0,
  'ALTER TABLE user_invitations ADD CONSTRAINT fk_user_invitations_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_user_invitations_business_fk = (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'user_invitations'
    AND constraint_name = 'fk_user_invitations_business'
);
SET @sql = IF(
  @has_user_invitations_business_fk = 0,
  'ALTER TABLE user_invitations ADD CONSTRAINT fk_user_invitations_business FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
