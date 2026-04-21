CREATE TABLE IF NOT EXISTS `user_profiles` (
  `user_id` bigint NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  `preferred_language` varchar(20) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @has_country = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'country'
);
SET @has_country_code = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'country_code'
);
SET @sql = IF(
  @has_country = 0 AND @has_country_code = 1,
  'ALTER TABLE `user_profiles` CHANGE COLUMN `country_code` `country` varchar(2) DEFAULT NULL AFTER `phone`',
  IF(
    @has_country = 0 AND @has_country_code = 0,
    'ALTER TABLE `user_profiles` ADD COLUMN `country` varchar(2) DEFAULT NULL AFTER `phone`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_country = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'country'
);
SET @has_country_code = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'country_code'
);
SET @sql = IF(
  @has_country = 1 AND @has_country_code = 1,
  'ALTER TABLE `user_profiles` DROP COLUMN `country_code`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `user_profiles`
SET `country` = CASE
  WHEN `phone` LIKE '+52%' THEN 'MX'
  WHEN `phone` LIKE '+57%' THEN 'CO'
  WHEN `phone` LIKE '+34%' THEN 'ES'
  WHEN `phone` LIKE '+54%' THEN 'AR'
  WHEN `phone` LIKE '+55%' THEN 'BR'
  WHEN `phone` LIKE '+56%' THEN 'CL'
  WHEN `phone` LIKE '+1%' THEN 'US'
  ELSE `country`
END
WHERE (`country` IS NULL OR `country` = '')
  AND `phone` IS NOT NULL
  AND `phone` <> '';

SET @has_preferred_language = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'preferred_language'
);
SET @sql = IF(
  @has_preferred_language = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `preferred_language` varchar(20) DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_avatar_url = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_url'
);
SET @sql = IF(
  @has_avatar_url = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_url` varchar(255) DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `user_invitations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `email` varchar(120) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'user',
  `module_slugs_json` json DEFAULT NULL,
  `token` varchar(64) NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `invited_by` bigint DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_invitations_token` (`token`),
  KEY `idx_user_invitations_company_status` (`company_id`,`status`),
  KEY `idx_user_invitations_email` (`email`),
  CONSTRAINT `fk_user_invitations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_invitations_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
