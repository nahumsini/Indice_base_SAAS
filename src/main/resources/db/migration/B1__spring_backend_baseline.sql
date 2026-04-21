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
