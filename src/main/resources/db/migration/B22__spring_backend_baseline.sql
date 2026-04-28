-- Baseline migration for a fresh database used by the Spring-owned backend slice.
-- This cumulative baseline includes B1 plus V2 through V22.
-- Keep the individual V* migrations for existing databases that have already adopted Flyway.


-- =====================================================================
-- Source: B1__spring_backend_baseline.sql
-- =====================================================================

-- Baseline migration for a fresh database used by the current Spring-owned slice.
-- This intentionally covers the tables currently read or written by Spring:
-- companies, users, user_companies, modules, units, businesses, hr_employees,
-- user_module_favorites, and user_company_module_roles.
--
-- Existing non-empty legacy databases that were already adopted by Flyway with
-- baseline version 0 will ignore this baseline migration.

CREATE TABLE `companies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `modules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `icon` varchar(50) DEFAULT NULL,
  `badge_text` varchar(50) DEFAULT NULL,
  `tier` varchar(20) DEFAULT 'free',
  `sort_order` int DEFAULT '0',
  `is_core` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_companies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `role` varchar(20) DEFAULT 'user',
  `status` varchar(20) DEFAULT 'active',
  `visibility` varchar(20) DEFAULT 'all',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `user_companies_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_companies_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `units` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint DEFAULT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `timezone` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_units_company` (`company_id`),
  KEY `idx_units_status` (`status`),
  CONSTRAINT `fk_units_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `businesses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `timezone` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_businesses_company` (`company_id`),
  KEY `idx_businesses_unit` (`unit_id`),
  KEY `idx_businesses_status` (`status`),
  CONSTRAINT `fk_businesses_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_businesses_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_employees` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_number` varchar(50) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(120) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `employee_number` (`employee_number`),
  CONSTRAINT `hr_employees_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_module_favorites` (
  `user_id` bigint NOT NULL,
  `module_slug` varchar(50) NOT NULL,
  PRIMARY KEY (`user_id`,`module_slug`),
  CONSTRAINT `user_module_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_company_module_roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_company_id` bigint NOT NULL,
  `module_slug` varchar(50) NOT NULL,
  `role` varchar(20) DEFAULT 'user',
  `skill_level` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_company_id` (`user_company_id`),
  CONSTRAINT `user_company_module_roles_ibfk_1` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `companies` (`id`, `name`, `logo_url`, `created_at`, `updated_at`) VALUES
  (1, 'Empresa Demo Spring', NULL, '2026-03-17 19:37:29', '2026-03-30 23:16:15');

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `created_at`, `updated_at`) VALUES
  (1, 'demo@example.com', '$2y$12$4s7mj2iDLKOSDtJY9Zz5qukpJvNLtWAF87NhuEEF7kxuEH6G1r3ge', 'Usuario Demo', '2026-03-17 19:37:29', '2026-03-17 19:37:29');

INSERT INTO `user_companies` (`id`, `user_id`, `company_id`, `role`, `status`, `visibility`, `created_at`) VALUES
  (1, 1, 1, 'admin', 'active', 'all', '2026-03-17 19:37:29');

INSERT INTO `modules` (`id`, `slug`, `name`, `description`, `icon`, `badge_text`, `tier`, `sort_order`, `is_core`, `is_active`) VALUES
  (1, 'human_resources', 'Recursos Humanos', 'Gestión de empleados, asistencia y nómina', 'bi-people-fill', NULL, 'pro', 1, 0, 1),
  (2, 'expenses', 'Gastos', 'Control de gastos y caja chica', 'bi-receipt', NULL, 'pro', 2, 0, 1),
  (3, 'crm', 'CRM', 'Gestión de clientes y oportunidades', 'bi-person-badge', NULL, 'pro', 3, 0, 1),
  (4, 'pos', 'Punto de Venta', 'Sistema de ventas y productos', 'bi-shop', NULL, 'enterprise', 4, 0, 1),
  (5, 'processes', 'Procesos y Tareas', 'Gestión de workflows y tareas', 'bi-list-check', NULL, 'enterprise', 5, 0, 1),
  (6, 'maintenance', 'Mantenimiento', 'Reportes y gestión de mantenimiento', 'bi-tools', NULL, 'enterprise', 6, 0, 1),
  (7, 'inventory', 'Inventarios', 'Control de stock e inventarios', 'bi-boxes', NULL, 'enterprise', 7, 0, 1),
  (8, 'config_center', 'Panel Inicial', 'Configuracion inicial de la empresa', 'bi-gear-fill', 'Basic', 'basic', 1, 1, 1);

INSERT INTO `units` (`id`, `company_id`, `name`, `description`, `timezone`, `status`, `created_at`, `updated_at`) VALUES
  (5, 1, 'Spring Unit', NULL, NULL, 'active', '2026-03-30 22:24:49', '2026-03-30 22:24:49');

INSERT INTO `businesses` (`id`, `company_id`, `unit_id`, `name`, `address`, `description`, `timezone`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
  (5, 1, 5, 'Spring Biz A', NULL, NULL, NULL, 'active', NULL, NULL, '2026-03-30 22:24:49', '2026-03-30 22:24:49'),
  (6, 1, 5, 'Spring Biz B', NULL, NULL, NULL, 'active', NULL, NULL, '2026-03-30 22:24:49', '2026-03-30 22:24:49');

INSERT INTO `hr_employees` (`id`, `company_id`, `employee_number`, `first_name`, `last_name`, `email`, `phone`, `position`, `department`, `hire_date`, `salary`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
  (2, 1, NULL, 'Second', 'Empleado', 'second.employee.spring@example.com', NULL, 'Senior Analyst', 'Finance', NULL, 6500.00, 'active', 1, '2026-03-30 23:16:05', '2026-03-30 23:16:05');

-- =====================================================================
-- Source: V2__config_center_company_settings.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `company_settings` (
  `company_id` bigint NOT NULL,
  `settings_json` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  CONSTRAINT `fk_company_settings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Source: V3__config_center_user_profiles_and_invitations.sql
-- =====================================================================

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

-- =====================================================================
-- Source: V4__company_business_profiles.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `company_business_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `updated_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_company_business_profiles_company_version` (`company_id`,`version`),
  KEY `idx_company_business_profiles_company_status` (`company_id`,`status`),
  KEY `idx_company_business_profiles_created_by` (`created_by`),
  KEY `idx_company_business_profiles_updated_by` (`updated_by`),
  CONSTRAINT `fk_company_business_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_company_business_profiles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_company_business_profiles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `company_business_profile_answers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `business_profile_id` bigint NOT NULL,
  `section_key` varchar(40) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `completed_at` datetime DEFAULT NULL,
  `data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_company_business_profile_answers_profile_section` (`business_profile_id`,`section_key`),
  KEY `idx_company_business_profile_answers_profile_status` (`business_profile_id`,`status`),
  CONSTRAINT `fk_company_business_profile_answers_profile` FOREIGN KEY (`business_profile_id`) REFERENCES `company_business_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Source: V5__hr_first_run_foundations.sql
-- =====================================================================

ALTER TABLE `hr_employees`
  ADD COLUMN `unit_id` bigint DEFAULT NULL AFTER `department`,
  ADD COLUMN `business_id` bigint DEFAULT NULL AFTER `unit_id`,
  ADD COLUMN `pay_period` varchar(20) DEFAULT 'weekly' AFTER `salary`,
  ADD COLUMN `salary_type` varchar(20) DEFAULT 'daily' AFTER `pay_period`,
  ADD COLUMN `hourly_rate` decimal(10,2) DEFAULT NULL AFTER `salary_type`,
  ADD COLUMN `contract_type` varchar(20) DEFAULT 'permanent' AFTER `hourly_rate`,
  ADD COLUMN `contract_start_date` date DEFAULT NULL AFTER `contract_type`,
  ADD COLUMN `contract_end_date` date DEFAULT NULL AFTER `contract_start_date`,
  ADD COLUMN `termination_date` date DEFAULT NULL AFTER `contract_end_date`,
  ADD COLUMN `last_working_day` date DEFAULT NULL AFTER `termination_date`,
  ADD COLUMN `termination_reason_type` varchar(40) DEFAULT NULL AFTER `last_working_day`,
  ADD COLUMN `termination_reason_code` varchar(80) DEFAULT NULL AFTER `termination_reason_type`,
  ADD COLUMN `termination_summary` text DEFAULT NULL AFTER `termination_reason_code`;

CREATE INDEX `idx_hr_employees_unit_id` ON `hr_employees` (`unit_id`);
CREATE INDEX `idx_hr_employees_business_id` ON `hr_employees` (`business_id`);
CREATE INDEX `idx_hr_employees_status_company` ON `hr_employees` (`company_id`, `status`);

UPDATE `hr_employees`
SET `pay_period` = COALESCE(NULLIF(`pay_period`, ''), 'weekly'),
    `salary_type` = COALESCE(NULLIF(`salary_type`, ''), 'daily'),
    `contract_type` = COALESCE(NULLIF(`contract_type`, ''), 'permanent'),
    `contract_start_date` = COALESCE(`contract_start_date`, `hire_date`)
WHERE 1 = 1;

CREATE TABLE IF NOT EXISTS `hr_attendance_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `name` varchar(160) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `radius_meters` int NOT NULL DEFAULT '80',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_attendance_locations_company` (`company_id`),
  CONSTRAINT `fk_hr_attendance_locations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_schedule_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_schedule_templates_company` (`company_id`),
  CONSTRAINT `fk_hr_schedule_templates_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_schedule_template_days` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_id` bigint NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `late_after_minutes` int NOT NULL DEFAULT '10',
  `is_rest_day` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_schedule_template_days_template_day` (`template_id`, `day_of_week`),
  CONSTRAINT `fk_hr_schedule_template_days_template` FOREIGN KEY (`template_id`) REFERENCES `hr_schedule_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_schedule_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `template_id` bigint NOT NULL,
  `effective_start_date` date NOT NULL,
  `effective_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_employee_schedule_assignments_company_employee` (`company_id`, `employee_id`),
  CONSTRAINT `fk_hr_employee_schedule_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_schedule_assignments_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_schedule_assignments_template` FOREIGN KEY (`template_id`) REFERENCES `hr_schedule_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_attendance_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `event_type` varchar(20) NOT NULL,
  `event_timestamp` datetime NOT NULL,
  `attendance_date` date NOT NULL,
  `location_id` bigint DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'kiosk',
  `notes` varchar(255) DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_attendance_events_company_date` (`company_id`, `attendance_date`),
  KEY `idx_hr_attendance_events_employee_date` (`employee_id`, `attendance_date`),
  CONSTRAINT `fk_hr_attendance_events_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_events_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_events_location` FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_attendance_daily_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `attendance_date` date NOT NULL,
  `system_status` varchar(20) NOT NULL,
  `corrected_status` varchar(20) DEFAULT NULL,
  `corrected_by` bigint DEFAULT NULL,
  `corrected_at` datetime DEFAULT NULL,
  `first_check_in_at` datetime DEFAULT NULL,
  `last_check_out_at` datetime DEFAULT NULL,
  `first_location_id` bigint DEFAULT NULL,
  `last_location_id` bigint DEFAULT NULL,
  `minutes_late` int NOT NULL DEFAULT '0',
  `source_schedule_template_id` bigint DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_attendance_daily_records_employee_day` (`company_id`, `employee_id`, `attendance_date`),
  KEY `idx_hr_attendance_daily_records_company_date` (`company_id`, `attendance_date`),
  CONSTRAINT `fk_hr_attendance_daily_records_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_daily_records_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_daily_records_schedule_template` FOREIGN KEY (`source_schedule_template_id`) REFERENCES `hr_schedule_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_attendance_daily_records_first_location` FOREIGN KEY (`first_location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_attendance_daily_records_last_location` FOREIGN KEY (`last_location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_announcements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `title` varchar(200) NOT NULL,
  `announcement_type` varchar(40) NOT NULL,
  `content` text NOT NULL,
  `audience_type` varchar(30) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `scheduled_for` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_announcements_company_status` (`company_id`, `status`),
  CONSTRAINT `fk_hr_announcements_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_announcement_targets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `announcement_id` bigint NOT NULL,
  `target_type` varchar(20) NOT NULL,
  `target_value` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_announcement_targets_announcement` (`announcement_id`),
  CONSTRAINT `fk_hr_announcement_targets_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `hr_announcements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hr_attendance_locations` (`company_id`, `name`, `latitude`, `longitude`, `radius_meters`, `status`, `created_by`)
SELECT 1, 'Spring HQ', 25.6866140, -100.3161130, 120, 'active', 1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_attendance_locations`
  WHERE `company_id` = 1
    AND `name` = 'Spring HQ'
);

INSERT INTO `hr_schedule_templates` (`company_id`, `name`, `status`, `created_by`)
SELECT 1, 'Spring Default Schedule', 'active', 1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_schedule_templates`
  WHERE `company_id` = 1
    AND `name` = 'Spring Default Schedule'
);

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       1,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 1
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       2,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 2
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       3,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 3
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       4,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 4
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       5,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 5
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       6,
       NULL,
       NULL,
       0,
       1
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 6
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       7,
       NULL,
       NULL,
       0,
       1
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 7
  );

INSERT INTO `hr_employee_schedule_assignments` (`company_id`, `employee_id`, `template_id`, `effective_start_date`, `status`, `created_by`)
SELECT e.`company_id`,
       e.`id`,
       t.`id`,
       COALESCE(e.`hire_date`, '2026-04-01'),
       'active',
       1
FROM `hr_employees` e
JOIN `hr_schedule_templates` t
  ON t.`company_id` = e.`company_id`
 AND t.`name` = 'Spring Default Schedule'
WHERE e.`company_id` = 1
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_employee_schedule_assignments` a
    WHERE a.`company_id` = e.`company_id`
      AND a.`employee_id` = e.`id`
      AND a.`status` = 'active'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_in',
       '2026-04-01 08:28:00',
       '2026-04-01',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_in'
      AND `attendance_date` = '2026-04-01'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_out',
       '2026-04-01 17:31:00',
       '2026-04-01',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_out'
      AND `attendance_date` = '2026-04-01'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_in',
       '2026-04-02 08:49:00',
       '2026-04-02',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_in'
      AND `attendance_date` = '2026-04-02'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_out',
       '2026-04-02 17:14:00',
       '2026-04-02',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_out'
      AND `attendance_date` = '2026-04-02'
  );

INSERT INTO `hr_attendance_daily_records` (`company_id`, `employee_id`, `attendance_date`, `system_status`, `first_check_in_at`, `last_check_out_at`, `first_location_id`, `last_location_id`, `minutes_late`, `source_schedule_template_id`, `notes`)
SELECT 1,
       2,
       '2026-04-01',
       'on_time',
       '2026-04-01 08:28:00',
       '2026-04-01 17:31:00',
       l.`id`,
       l.`id`,
       0,
       t.`id`,
       'Seeded demo attendance'
FROM `hr_attendance_locations` l
JOIN `hr_schedule_templates` t
  ON t.`company_id` = 1
 AND t.`name` = 'Spring Default Schedule'
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_daily_records`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `attendance_date` = '2026-04-01'
  );

INSERT INTO `hr_attendance_daily_records` (`company_id`, `employee_id`, `attendance_date`, `system_status`, `first_check_in_at`, `last_check_out_at`, `first_location_id`, `last_location_id`, `minutes_late`, `source_schedule_template_id`, `notes`)
SELECT 1,
       2,
       '2026-04-02',
       'late',
       '2026-04-02 08:49:00',
       '2026-04-02 17:14:00',
       l.`id`,
       l.`id`,
       19,
       t.`id`,
       'Seeded demo attendance'
FROM `hr_attendance_locations` l
JOIN `hr_schedule_templates` t
  ON t.`company_id` = 1
 AND t.`name` = 'Spring Default Schedule'
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_daily_records`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `attendance_date` = '2026-04-02'
  );

INSERT INTO `hr_announcements` (`company_id`, `title`, `announcement_type`, `content`, `audience_type`, `status`, `scheduled_for`, `published_at`, `created_by`)
SELECT 1,
       'Cambio de horario operativo',
       'urgent',
       'A partir del lunes, la reunión de arranque cambia a las 8:15 AM para Operaciones.',
       'units',
       'published',
       NULL,
       '2026-04-01 08:00:00',
       1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_announcements`
  WHERE `company_id` = 1
    AND `title` = 'Cambio de horario operativo'
);

INSERT INTO `hr_announcements` (`company_id`, `title`, `announcement_type`, `content`, `audience_type`, `status`, `scheduled_for`, `published_at`, `created_by`)
SELECT 1,
       'Recordatorio de evaluaciones mensuales',
       'reminder',
       'Los líderes deben completar las evaluaciones mensuales antes del viernes a las 5:00 PM.',
       'all',
       'scheduled',
       '2026-04-10 09:30:00',
       NULL,
       1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_announcements`
  WHERE `company_id` = 1
    AND `title` = 'Recordatorio de evaluaciones mensuales'
);

INSERT INTO `hr_announcements` (`company_id`, `title`, `announcement_type`, `content`, `audience_type`, `status`, `scheduled_for`, `published_at`, `created_by`)
SELECT 1,
       'Celebración de aniversarios del mes',
       'celebration',
       'Compartiremos los aniversarios y logros del mes en la reunión general de RH.',
       'employees',
       'draft',
       NULL,
       NULL,
       1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_announcements`
  WHERE `company_id` = 1
    AND `title` = 'Celebración de aniversarios del mes'
);

INSERT INTO `hr_announcement_targets` (`announcement_id`, `target_type`, `target_value`)
SELECT a.`id`, 'unit', '5'
FROM `hr_announcements` a
WHERE a.`company_id` = 1
  AND a.`title` = 'Cambio de horario operativo'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_announcement_targets`
    WHERE `announcement_id` = a.`id`
      AND `target_type` = 'unit'
      AND `target_value` = '5'
  );

INSERT INTO `hr_announcement_targets` (`announcement_id`, `target_type`, `target_value`)
SELECT a.`id`, 'employee', '2'
FROM `hr_announcements` a
WHERE a.`company_id` = 1
  AND a.`title` = 'Celebración de aniversarios del mes'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_announcement_targets`
    WHERE `announcement_id` = a.`id`
      AND `target_type` = 'employee'
      AND `target_value` = '2'
  );

-- =====================================================================
-- Source: V6__hr_payroll_foundations.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `hr_payroll_preferences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `grouping_mode` varchar(20) NOT NULL DEFAULT 'single',
  `default_daily_hours` decimal(5,2) NOT NULL DEFAULT '8.00',
  `pay_leave_days` tinyint(1) NOT NULL DEFAULT '1',
  `isr_rate` decimal(8,5) NOT NULL DEFAULT '0.10000',
  `imss_employee_rate` decimal(8,5) NOT NULL DEFAULT '0.04000',
  `infonavit_employee_rate` decimal(8,5) NOT NULL DEFAULT '0.03000',
  `imss_employer_rate` decimal(8,5) NOT NULL DEFAULT '0.07000',
  `infonavit_employer_rate` decimal(8,5) NOT NULL DEFAULT '0.05000',
  `sar_employer_rate` decimal(8,5) NOT NULL DEFAULT '0.02000',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_payroll_preferences_company` (`company_id`),
  CONSTRAINT `fk_hr_payroll_preferences_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_payroll_runs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `grouping_mode` varchar(20) NOT NULL,
  `grouping_key` varchar(80) DEFAULT NULL,
  `grouping_label` varchar(160) DEFAULT NULL,
  `pay_period` varchar(20) NOT NULL,
  `period_start_date` date NOT NULL,
  `period_end_date` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `employees_count` int NOT NULL DEFAULT '0',
  `gross_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `deductions_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `employer_contributions_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_by` bigint DEFAULT NULL,
  `processed_by` bigint DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `approved_by` bigint DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `paid_by` bigint DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `cancelled_by` bigint DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_payroll_runs_company_period` (`company_id`, `period_start_date`, `period_end_date`),
  KEY `idx_hr_payroll_runs_company_status` (`company_id`, `status`),
  CONSTRAINT `fk_hr_payroll_runs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_payroll_run_lines` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `employee_number_snapshot` varchar(80) DEFAULT NULL,
  `employee_name_snapshot` varchar(180) NOT NULL,
  `position_title_snapshot` varchar(160) DEFAULT NULL,
  `department_snapshot` varchar(160) DEFAULT NULL,
  `unit_id_snapshot` bigint DEFAULT NULL,
  `unit_name_snapshot` varchar(160) DEFAULT NULL,
  `business_id_snapshot` bigint DEFAULT NULL,
  `business_name_snapshot` varchar(160) DEFAULT NULL,
  `pay_period_snapshot` varchar(20) NOT NULL,
  `salary_type_snapshot` varchar(20) NOT NULL,
  `base_salary_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `hourly_rate_amount` decimal(14,2) DEFAULT NULL,
  `days_payable` decimal(8,2) NOT NULL DEFAULT '0.00',
  `leave_days` decimal(8,2) NOT NULL DEFAULT '0.00',
  `absence_days` decimal(8,2) NOT NULL DEFAULT '0.00',
  `rest_days` decimal(8,2) NOT NULL DEFAULT '0.00',
  `late_count` int NOT NULL DEFAULT '0',
  `regular_hours` decimal(8,2) NOT NULL DEFAULT '0.00',
  `overtime_hours` decimal(8,2) NOT NULL DEFAULT '0.00',
  `include_in_fiscal` tinyint(1) NOT NULL DEFAULT '1',
  `gross_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `deductions_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `employer_contributions_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_payroll_run_lines_run_employee` (`run_id`, `employee_id`),
  KEY `idx_hr_payroll_run_lines_company` (`company_id`),
  CONSTRAINT `fk_hr_payroll_run_lines_run` FOREIGN KEY (`run_id`) REFERENCES `hr_payroll_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_payroll_run_lines_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_payroll_run_lines_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_payroll_run_line_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_line_id` bigint NOT NULL,
  `code` varchar(50) NOT NULL,
  `category` varchar(30) NOT NULL,
  `label` varchar(180) NOT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `source_type` varchar(20) NOT NULL DEFAULT 'computed',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_payroll_run_line_items_line` (`run_line_id`),
  CONSTRAINT `fk_hr_payroll_run_line_items_line` FOREIGN KEY (`run_line_id`) REFERENCES `hr_payroll_run_lines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hr_payroll_preferences`
(`company_id`, `grouping_mode`, `default_daily_hours`, `pay_leave_days`, `isr_rate`, `imss_employee_rate`, `infonavit_employee_rate`, `imss_employer_rate`, `infonavit_employer_rate`, `sar_employer_rate`)
SELECT 1, 'single', 8.00, 1, 0.10000, 0.04000, 0.03000, 0.07000, 0.05000, 0.02000
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_payroll_preferences`
  WHERE `company_id` = 1
);

-- =====================================================================
-- Source: V7__hr_kiosk_access_model.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `hr_kiosk_devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `location_id` bigint DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `metadata_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_kiosk_devices_company_code` (`company_id`, `code`),
  KEY `idx_hr_kiosk_devices_company_status` (`company_id`, `status`),
  KEY `idx_hr_kiosk_devices_unit` (`unit_id`),
  KEY `idx_hr_kiosk_devices_business` (`business_id`),
  KEY `idx_hr_kiosk_devices_location` (`location_id`),
  CONSTRAINT `fk_hr_kiosk_devices_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_kiosk_devices_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_kiosk_devices_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_kiosk_devices_location` FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_access_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `default_method` varchar(30) NOT NULL DEFAULT 'manual_override',
  `last_enrolled_at` datetime DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_access_profiles_company_employee` (`company_id`, `employee_id`),
  KEY `idx_hr_employee_access_profiles_company_status` (`company_id`, `status`),
  CONSTRAINT `fk_hr_employee_access_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_access_profiles_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_access_methods` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `access_profile_id` bigint NOT NULL,
  `method_type` varchar(30) NOT NULL,
  `credential_ref` varchar(120) DEFAULT NULL,
  `secret_hash` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `priority` int NOT NULL DEFAULT '100',
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_access_methods_company_method_ref` (`company_id`, `method_type`, `credential_ref`),
  KEY `idx_hr_employee_access_methods_profile_status` (`access_profile_id`, `status`),
  KEY `idx_hr_employee_access_methods_company_method` (`company_id`, `method_type`, `status`),
  CONSTRAINT `fk_hr_employee_access_methods_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_access_methods_profile` FOREIGN KEY (`access_profile_id`) REFERENCES `hr_employee_access_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `hr_attendance_events`
  MODIFY COLUMN `latitude` decimal(10,7) DEFAULT NULL,
  MODIFY COLUMN `longitude` decimal(10,7) DEFAULT NULL,
  ADD COLUMN `kiosk_device_id` bigint DEFAULT NULL AFTER `location_id`,
  ADD COLUMN `auth_method` varchar(30) DEFAULT NULL AFTER `source`,
  ADD COLUMN `result_status` varchar(20) DEFAULT NULL AFTER `auth_method`,
  ADD COLUMN `event_kind` varchar(30) DEFAULT NULL AFTER `result_status`,
  ADD COLUMN `metadata_json` json DEFAULT NULL AFTER `notes`,
  ADD COLUMN `supersedes_event_id` bigint DEFAULT NULL AFTER `metadata_json`;

ALTER TABLE `hr_attendance_events`
  ADD KEY `idx_hr_attendance_events_company_employee_timestamp` (`company_id`, `employee_id`, `event_timestamp`),
  ADD KEY `idx_hr_attendance_events_company_kiosk_timestamp` (`company_id`, `kiosk_device_id`, `event_timestamp`),
  ADD CONSTRAINT `fk_hr_attendance_events_kiosk_device` FOREIGN KEY (`kiosk_device_id`) REFERENCES `hr_kiosk_devices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_hr_attendance_events_supersedes` FOREIGN KEY (`supersedes_event_id`) REFERENCES `hr_attendance_events` (`id`) ON DELETE SET NULL;

UPDATE `hr_attendance_events`
SET `auth_method` = COALESCE(NULLIF(`auth_method`, ''), 'manual_override'),
    `result_status` = COALESCE(NULLIF(`result_status`, ''), 'success'),
    `event_kind` = COALESCE(NULLIF(`event_kind`, ''), `event_type`)
WHERE 1 = 1;

INSERT INTO `hr_kiosk_devices`
(`company_id`, `unit_id`, `business_id`, `location_id`, `code`, `name`, `status`, `metadata_json`, `created_by`)
SELECT 1,
       5,
       5,
       l.id,
       'spring-front-kiosk',
       'Spring Front Kiosk',
       'active',
       JSON_OBJECT('mode', 'shared', 'supports_face_recognition', false),
       1
FROM `hr_attendance_locations` l
WHERE l.company_id = 1
  AND l.name = 'Spring HQ'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_kiosk_devices`
    WHERE `company_id` = 1
      AND `code` = 'spring-front-kiosk'
  );

INSERT INTO `hr_employee_access_profiles`
(`company_id`, `employee_id`, `status`, `default_method`, `last_enrolled_at`, `metadata_json`, `created_by`)
SELECT e.company_id,
       e.id,
       'active',
       'manual_override',
       CURRENT_TIMESTAMP,
       JSON_OBJECT('supports_face_recognition', false),
       1
FROM `hr_employees` e
WHERE COALESCE(LOWER(e.status), 'active') <> 'terminated'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_employee_access_profiles` p
    WHERE p.company_id = e.company_id
      AND p.employee_id = e.id
  );

INSERT INTO `hr_employee_access_methods`
(`company_id`, `access_profile_id`, `method_type`, `credential_ref`, `secret_hash`, `status`, `priority`, `metadata_json`)
SELECT p.company_id,
       p.id,
       'manual_override',
       NULL,
       NULL,
       'active',
       100,
       JSON_OBJECT('label', 'Manual override')
FROM `hr_employee_access_profiles` p
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_employee_access_methods` m
  WHERE m.company_id = p.company_id
    AND m.access_profile_id = p.id
    AND m.method_type = 'manual_override'
);

-- =====================================================================
-- Source: V8__hr_schedule_policy_extensions.sql
-- =====================================================================

ALTER TABLE `hr_schedule_templates`
  ADD COLUMN `schedule_mode` varchar(20) NOT NULL DEFAULT 'strict' AFTER `status`,
  ADD COLUMN `block_after_grace_period` tinyint(1) NOT NULL DEFAULT '0' AFTER `schedule_mode`,
  ADD COLUMN `enforce_location` tinyint(1) NOT NULL DEFAULT '0' AFTER `block_after_grace_period`,
  ADD COLUMN `location_id` bigint DEFAULT NULL AFTER `enforce_location`,
  ADD KEY `idx_hr_schedule_templates_location` (`location_id`),
  ADD CONSTRAINT `fk_hr_schedule_templates_location`
    FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL;

ALTER TABLE `hr_schedule_template_days`
  ADD COLUMN `meal_minutes` int NOT NULL DEFAULT '0' AFTER `end_time`,
  ADD COLUMN `rest_minutes` int NOT NULL DEFAULT '0' AFTER `meal_minutes`;

-- =====================================================================
-- Source: V9__hr_face_verification.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `hr_face_enrollments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `enrolled_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_face_enrollments_company_employee` (`company_id`, `employee_id`),
  CONSTRAINT `fk_hr_face_enrollments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_face_enrollments_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_face_enrollment_captures` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `enrollment_id` bigint NOT NULL,
  `capture_step` varchar(20) NOT NULL,
  `object_key` varchar(255) NOT NULL,
  `embedding_json` json DEFAULT NULL,
  `capture_metadata_json` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `processed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_face_enrollment_captures_step` (`enrollment_id`, `capture_step`),
  CONSTRAINT `fk_hr_face_enrollment_captures_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `hr_face_enrollments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_face_verification_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `auth_method` varchar(30) NOT NULL DEFAULT 'facial_recognition',
  `challenge_sequence_json` json NOT NULL,
  `liveness_result` varchar(20) DEFAULT NULL,
  `verification_result` varchar(20) DEFAULT NULL,
  `matched_score` decimal(8,5) DEFAULT NULL,
  `failure_reason` varchar(255) DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_face_verification_sessions_company_employee` (`company_id`, `employee_id`),
  CONSTRAINT `fk_hr_face_verification_sessions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_face_verification_sessions_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_face_verification_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `session_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `event_type` varchar(40) NOT NULL,
  `status` varchar(20) NOT NULL,
  `detail_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_face_verification_events_session` (`session_id`),
  KEY `idx_hr_face_verification_events_company_employee` (`company_id`, `employee_id`),
  CONSTRAINT `fk_hr_face_verification_events_session` FOREIGN KEY (`session_id`) REFERENCES `hr_face_verification_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_face_verification_events_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_face_verification_events_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Source: V10__hr_face_enrollment_session_expiry.sql
-- =====================================================================

ALTER TABLE `hr_face_enrollments`
  ADD COLUMN `expires_at` datetime NOT NULL AFTER `status`;

-- =====================================================================
-- Source: V11__hr_assets.sql
-- =====================================================================

CREATE TABLE `hr_assets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `asset_code` varchar(80) NOT NULL,
  `asset_type` varchar(50) NOT NULL,
  `name` varchar(160) NOT NULL,
  `model` varchar(160) DEFAULT NULL,
  `serial_number` varchar(160) DEFAULT NULL,
  `responsible_employee_id` bigint DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'available',
  `assigned_at` datetime DEFAULT NULL,
  `value_amount` decimal(12,2) DEFAULT NULL,
  `notes` text,
  `created_by_user_id` bigint DEFAULT NULL,
  `updated_by_user_id` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_hr_assets_company_asset_code` (`company_id`,`asset_code`),
  UNIQUE KEY `uk_hr_assets_company_serial_number` (`company_id`,`serial_number`),
  KEY `idx_hr_assets_company_status` (`company_id`,`status`),
  KEY `idx_hr_assets_company_responsible` (`company_id`,`responsible_employee_id`),
  KEY `idx_hr_assets_company_unit` (`company_id`,`unit_id`),
  KEY `idx_hr_assets_company_type` (`company_id`,`asset_type`),
  KEY `idx_hr_assets_company_updated_at` (`company_id`,`updated_at`),
  CONSTRAINT `fk_hr_assets_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_assets_employee` FOREIGN KEY (`responsible_employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_assets_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_assets_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_assets_updated_by_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_hr_assets_status` CHECK (`status` IN ('available', 'assigned', 'maintenance', 'custody', 'inactive')),
  CONSTRAINT `chk_hr_assets_value_amount` CHECK (`value_amount` IS NULL OR `value_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `hr_asset_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `asset_id` bigint NOT NULL,
  `responsible_employee_id` bigint DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `assignment_status` varchar(30) NOT NULL,
  `started_at` datetime NOT NULL,
  `ended_at` datetime DEFAULT NULL,
  `notes` text,
  `created_by_user_id` bigint DEFAULT NULL,
  `ended_by_user_id` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_asset_assignments_company_asset_started` (`company_id`,`asset_id`,`started_at`),
  KEY `idx_hr_asset_assignments_asset_ended` (`asset_id`,`ended_at`),
  KEY `idx_hr_asset_assignments_company_employee_started` (`company_id`,`responsible_employee_id`,`started_at`),
  CONSTRAINT `fk_hr_asset_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_asset_assignments_asset` FOREIGN KEY (`asset_id`) REFERENCES `hr_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_asset_assignments_employee` FOREIGN KEY (`responsible_employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_asset_assignments_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_asset_assignments_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_asset_assignments_ended_by_user` FOREIGN KEY (`ended_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_hr_asset_assignments_status` CHECK (`assignment_status` IN ('assigned', 'custody'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `hr_asset_status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `asset_id` bigint NOT NULL,
  `from_status` varchar(30) DEFAULT NULL,
  `to_status` varchar(30) NOT NULL,
  `change_reason` varchar(50) DEFAULT NULL,
  `notes` text,
  `changed_by_user_id` bigint DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_asset_status_history_company_asset_changed` (`company_id`,`asset_id`,`changed_at`),
  KEY `idx_hr_asset_status_history_company_to_status_changed` (`company_id`,`to_status`,`changed_at`),
  CONSTRAINT `fk_hr_asset_status_history_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_asset_status_history_asset` FOREIGN KEY (`asset_id`) REFERENCES `hr_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_asset_status_history_changed_by_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_hr_asset_status_history_from_status` CHECK (`from_status` IS NULL OR `from_status` IN ('available', 'assigned', 'maintenance', 'custody', 'inactive')),
  CONSTRAINT `chk_hr_asset_status_history_to_status` CHECK (`to_status` IN ('available', 'assigned', 'maintenance', 'custody', 'inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Source: V12__user_personal_performance.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `user_personal_performance_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_personal_performance_profiles_user_version` (`user_id`,`version`),
  KEY `idx_user_personal_performance_profiles_user_status` (`user_id`,`status`),
  KEY `idx_user_personal_performance_profiles_company_status` (`company_id`,`status`),
  CONSTRAINT `fk_user_personal_performance_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_personal_performance_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_personal_performance_answers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `personal_performance_profile_id` bigint NOT NULL,
  `section_key` varchar(40) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `completed_at` datetime DEFAULT NULL,
  `data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_personal_performance_answers_profile_section` (`personal_performance_profile_id`,`section_key`),
  KEY `idx_user_personal_performance_answers_profile_status` (`personal_performance_profile_id`,`status`),
  CONSTRAINT `fk_user_personal_performance_answers_profile` FOREIGN KEY (`personal_performance_profile_id`) REFERENCES `user_personal_performance_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Source: V14__hr_employee_profiles_documents_and_portal_access.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `hr_employee_profiles` (
  `employee_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `national_id` varchar(80) DEFAULT NULL,
  `tax_id` varchar(80) DEFAULT NULL,
  `social_security_number` varchar(80) DEFAULT NULL,
  `registration_country` varchar(2) DEFAULT NULL,
  `state_province` varchar(120) DEFAULT NULL,
  `alternate_phone` varchar(50) DEFAULT NULL,
  `emergency_contact_name` varchar(120) DEFAULT NULL,
  `emergency_contact_relationship` varchar(80) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `workday_hours` decimal(5,2) NOT NULL DEFAULT '8.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  KEY `idx_hr_employee_profiles_company` (`company_id`),
  CONSTRAINT `fk_hr_employee_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_profiles_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `document_type` varchar(40) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT '0',
  `object_key` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `uploaded_by_user_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_documents_employee_type` (`company_id`, `employee_id`, `document_type`),
  UNIQUE KEY `uq_hr_employee_documents_object_key` (`company_id`, `object_key`),
  KEY `idx_hr_employee_documents_company_employee` (`company_id`, `employee_id`),
  CONSTRAINT `fk_hr_employee_documents_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_documents_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_documents_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_portal_access` (
  `employee_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `access_role` varchar(40) NOT NULL DEFAULT 'employee',
  `linked_user_id` bigint DEFAULT NULL,
  `invitation_id` bigint DEFAULT NULL,
  `invitation_status` varchar(20) NOT NULL DEFAULT 'not_invited',
  `last_invited_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  KEY `idx_hr_employee_portal_access_company_role` (`company_id`, `access_role`),
  KEY `idx_hr_employee_portal_access_linked_user` (`linked_user_id`),
  KEY `idx_hr_employee_portal_access_invitation` (`invitation_id`),
  CONSTRAINT `fk_hr_employee_portal_access_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_portal_access_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_portal_access_linked_user` FOREIGN KEY (`linked_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_employee_portal_access_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `user_invitations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hr_employee_profiles`
(`employee_id`, `company_id`, `workday_hours`)
SELECT e.`id`, e.`company_id`, 8.00
FROM `hr_employees` e
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_employee_profiles` p
  WHERE p.`employee_id` = e.`id`
);

INSERT INTO `hr_employee_portal_access`
(`employee_id`, `company_id`, `access_role`, `linked_user_id`, `invitation_status`, `created_by`)
SELECT e.`id`,
       e.`company_id`,
       'employee',
       (
         SELECT uc.`user_id`
         FROM `users` u
         INNER JOIN `user_companies` uc ON uc.`user_id` = u.`id`
         WHERE uc.`company_id` = e.`company_id`
           AND LOWER(u.`email`) = LOWER(e.`email`)
         LIMIT 1
       ) AS `linked_user_id`,
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM `users` u
           INNER JOIN `user_companies` uc ON uc.`user_id` = u.`id`
           WHERE uc.`company_id` = e.`company_id`
             AND LOWER(u.`email`) = LOWER(e.`email`)
         ) THEN 'linked'
         ELSE 'not_invited'
       END AS `invitation_status`,
       e.`created_by`
FROM `hr_employees` e
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_employee_portal_access` a
  WHERE a.`employee_id` = e.`id`
);

-- =====================================================================
-- Source: V15__hr_employee_number_sequences.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `hr_employee_number_sequences` (
  `company_id` bigint NOT NULL,
  `prefix` varchar(20) NOT NULL DEFAULT 'EMP',
  `padding` int NOT NULL DEFAULT '4',
  `next_number` bigint NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  CONSTRAINT `fk_hr_employee_number_sequences_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

WITH normalized_numbers AS (
  SELECT
    e.`id`,
    e.`company_id`,
    TRIM(COALESCE(e.`employee_number`, '')) AS `normalized_employee_number`,
    ROW_NUMBER() OVER (
      PARTITION BY e.`company_id`, NULLIF(TRIM(COALESCE(e.`employee_number`, '')), '')
      ORDER BY e.`id`
    ) AS `duplicate_rank`
  FROM `hr_employees` e
),
rows_needing_numbers AS (
  SELECT
    n.`id`,
    n.`company_id`,
    ROW_NUMBER() OVER (PARTITION BY n.`company_id` ORDER BY n.`id`) AS `generated_offset`
  FROM normalized_numbers n
  WHERE n.`normalized_employee_number` = ''
     OR n.`duplicate_rank` > 1
),
company_max_numbers AS (
  SELECT
    e.`company_id`,
    COALESCE(MAX(
      CASE
        WHEN TRIM(COALESCE(e.`employee_number`, '')) REGEXP '^EMP-[0-9]+$'
          THEN CAST(SUBSTRING(TRIM(e.`employee_number`), 5) AS UNSIGNED)
        ELSE 0
      END
    ), 0) AS `max_existing_number`
  FROM `hr_employees` e
  GROUP BY e.`company_id`
)
UPDATE `hr_employees` e
JOIN rows_needing_numbers r ON r.`id` = e.`id`
JOIN company_max_numbers m ON m.`company_id` = r.`company_id`
SET e.`employee_number` = CONCAT('EMP-', LPAD(m.`max_existing_number` + r.`generated_offset`, 4, '0'));

INSERT INTO `hr_employee_number_sequences` (`company_id`, `prefix`, `padding`, `next_number`)
SELECT
  c.`id`,
  'EMP',
  4,
  COALESCE((
    SELECT MAX(
      CASE
        WHEN TRIM(COALESCE(e.`employee_number`, '')) REGEXP '^EMP-[0-9]+$'
          THEN CAST(SUBSTRING(TRIM(e.`employee_number`), 5) AS UNSIGNED)
        ELSE 0
      END
    )
    FROM `hr_employees` e
    WHERE e.`company_id` = c.`id`
  ), 0) + 1
FROM `companies` c
ON DUPLICATE KEY UPDATE
  `prefix` = VALUES(`prefix`),
  `padding` = VALUES(`padding`),
  `next_number` = GREATEST(`hr_employee_number_sequences`.`next_number`, VALUES(`next_number`));

ALTER TABLE `hr_employees`
  ADD UNIQUE KEY `uq_hr_employees_company_employee_number` (`company_id`, `employee_number`);

-- =====================================================================
-- Source: V16__hr_employee_link_uniqueness.sql
-- =====================================================================

UPDATE `hr_employees`
SET `email` = NULL
WHERE `email` IS NOT NULL
  AND TRIM(`email`) = '';

UPDATE `hr_employees`
SET `email` = LOWER(TRIM(`email`))
WHERE `email` IS NOT NULL
  AND TRIM(`email`) <> ''
  AND `email` <> LOWER(TRIM(`email`));

WITH ranked_portal_links AS (
  SELECT
    `employee_id`,
    ROW_NUMBER() OVER (
      PARTITION BY `company_id`, `linked_user_id`
      ORDER BY `employee_id` ASC
    ) AS `link_rank`
  FROM `hr_employee_portal_access`
  WHERE `linked_user_id` IS NOT NULL
)
UPDATE `hr_employee_portal_access` access_ref
JOIN ranked_portal_links ranked ON ranked.`employee_id` = access_ref.`employee_id`
SET access_ref.`linked_user_id` = NULL,
    access_ref.`invitation_status` = CASE
      WHEN LOWER(COALESCE(access_ref.`invitation_status`, '')) = 'linked' THEN 'not_invited'
      ELSE access_ref.`invitation_status`
    END
WHERE ranked.`link_rank` > 1;

WITH ranked_employee_emails AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `company_id`, `email`
      ORDER BY `id` ASC
    ) AS `email_rank`
  FROM `hr_employees`
  WHERE `email` IS NOT NULL
)
UPDATE `hr_employees` employee_ref
JOIN ranked_employee_emails ranked ON ranked.`id` = employee_ref.`id`
SET employee_ref.`email` = NULL
WHERE ranked.`email_rank` > 1;

ALTER TABLE `hr_employee_portal_access`
  ADD UNIQUE KEY `uq_hr_employee_portal_access_company_linked_user` (`company_id`, `linked_user_id`);

ALTER TABLE `hr_employees`
  ADD UNIQUE KEY `uq_hr_employees_company_email` (`company_id`, `email`);

-- =====================================================================
-- Source: V17__hr_records.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `hr_employee_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `record_number` VARCHAR(32) NULL,
  `employee_id` BIGINT NOT NULL,
  `employee_name_snapshot` VARCHAR(160) NOT NULL,
  `employee_position_snapshot` VARCHAR(160) NULL,
  `employee_department_snapshot` VARCHAR(160) NULL,
  `employee_unit_id_snapshot` BIGINT NULL,
  `employee_unit_name_snapshot` VARCHAR(160) NULL,
  `employee_business_id_snapshot` BIGINT NULL,
  `employee_business_name_snapshot` VARCHAR(160) NULL,
  `record_type` VARCHAR(32) NOT NULL,
  `severity` VARCHAR(16) NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'pending',
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `actions_taken` TEXT NULL,
  `event_date` DATETIME NOT NULL,
  `reported_by_user_id` BIGINT NOT NULL,
  `reported_by_employee_id` BIGINT NULL,
  `reported_by_name_snapshot` VARCHAR(160) NOT NULL,
  `created_by_user_id` BIGINT NOT NULL,
  `updated_by_user_id` BIGINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_records_company_number` (`company_id`, `record_number`),
  KEY `idx_hr_employee_records_company_employee` (`company_id`, `employee_id`),
  KEY `idx_hr_employee_records_company_status` (`company_id`, `status`),
  KEY `idx_hr_employee_records_company_type` (`company_id`, `record_type`),
  KEY `idx_hr_employee_records_company_event_date` (`company_id`, `event_date`),
  KEY `idx_hr_employee_records_company_deleted` (`company_id`, `deleted_at`),
  CONSTRAINT `fk_hr_employee_records_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_records_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_records_reported_by_user` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_hr_employee_records_reported_by_employee` FOREIGN KEY (`reported_by_employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_employee_records_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_hr_employee_records_updated_by_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_record_witnesses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `record_id` BIGINT NOT NULL,
  `witness_employee_id` BIGINT NULL,
  `witness_name_snapshot` VARCHAR(160) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_employee_record_witnesses_record` (`record_id`),
  KEY `idx_hr_employee_record_witnesses_company` (`company_id`),
  CONSTRAINT `fk_hr_employee_record_witnesses_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_record_witnesses_record` FOREIGN KEY (`record_id`) REFERENCES `hr_employee_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_record_witnesses_employee` FOREIGN KEY (`witness_employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_record_attachments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `record_id` BIGINT NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(120) NOT NULL,
  `size_bytes` BIGINT NOT NULL,
  `object_key` VARCHAR(512) NOT NULL,
  `uploaded_by_user_id` BIGINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_record_attachments_object_key` (`company_id`, `object_key`),
  KEY `idx_hr_employee_record_attachments_record` (`record_id`),
  KEY `idx_hr_employee_record_attachments_company_deleted` (`company_id`, `deleted_at`),
  CONSTRAINT `fk_hr_employee_record_attachments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_record_attachments_record` FOREIGN KEY (`record_id`) REFERENCES `hr_employee_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_record_attachments_uploaded_by_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_record_activity` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `record_id` BIGINT NOT NULL,
  `activity_type` VARCHAR(32) NOT NULL,
  `from_status` VARCHAR(16) NULL,
  `to_status` VARCHAR(16) NULL,
  `note` TEXT NULL,
  `actor_user_id` BIGINT NOT NULL,
  `actor_name_snapshot` VARCHAR(160) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_employee_record_activity_record` (`record_id`),
  KEY `idx_hr_employee_record_activity_company` (`company_id`),
  CONSTRAINT `fk_hr_employee_record_activity_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_record_activity_record` FOREIGN KEY (`record_id`) REFERENCES `hr_employee_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_record_activity_actor_user` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Source: V18__hr_kiosk_public_access.sql
-- =====================================================================

ALTER TABLE `hr_kiosk_devices`
  ADD COLUMN `public_access_token` varchar(64) DEFAULT NULL AFTER `status`;

UPDATE `hr_kiosk_devices`
SET `public_access_token` = REPLACE(UUID(), '-', '')
WHERE COALESCE(TRIM(`public_access_token`), '') = '';

ALTER TABLE `hr_kiosk_devices`
  MODIFY COLUMN `public_access_token` varchar(64) NOT NULL,
  ADD UNIQUE KEY `uq_hr_kiosk_devices_public_access_token` (`public_access_token`);

-- =====================================================================
-- Source: V19__hr_attendance_location_scope.sql
-- =====================================================================

ALTER TABLE `hr_attendance_locations`
  ADD COLUMN `unit_id` bigint DEFAULT NULL AFTER `company_id`,
  ADD COLUMN `business_id` bigint DEFAULT NULL AFTER `unit_id`,
  ADD KEY `idx_hr_attendance_locations_unit` (`unit_id`),
  ADD KEY `idx_hr_attendance_locations_business` (`business_id`),
  ADD CONSTRAINT `fk_hr_attendance_locations_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_hr_attendance_locations_business`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL;

-- =====================================================================
-- Source: V20__hr_employee_work_sites.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS `hr_employee_allowed_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `location_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_allowed_locations_employee_location` (`company_id`, `employee_id`, `location_id`),
  KEY `idx_hr_employee_allowed_locations_employee` (`company_id`, `employee_id`, `status`),
  KEY `idx_hr_employee_allowed_locations_location` (`location_id`),
  CONSTRAINT `fk_hr_employee_allowed_locations_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_allowed_locations_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_allowed_locations_location`
    FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_work_site_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `location_id` bigint NOT NULL,
  `effective_start_date` date NOT NULL,
  `effective_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_employee_work_sites_employee_date` (`company_id`, `employee_id`, `effective_start_date`, `effective_end_date`, `status`),
  KEY `idx_hr_employee_work_sites_location` (`location_id`),
  CONSTRAINT `fk_hr_employee_work_sites_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_work_sites_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_work_sites_location`
    FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================================
-- Source: V21__hr_contract_site_requirements.sql
-- =====================================================================

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

-- =====================================================================
-- Source: V22__hr_contract_site_daily_time.sql
-- =====================================================================

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
