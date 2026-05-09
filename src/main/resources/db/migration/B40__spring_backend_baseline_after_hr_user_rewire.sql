-- Baseline migration for fresh databases after the HR user rewiring.
-- This cumulative baseline includes the Spring-owned schema through V39.
-- Keep older B*/V* migrations for existing databases that already have Flyway history.


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_kiosk_devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `location_id` bigint DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `public_access_token` varchar(64) NOT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_kiosk_devices_company_code` (`company_id`,`code`),
  UNIQUE KEY `uq_attendance_kiosk_devices_public_token` (`public_access_token`),
  KEY `idx_attendance_kiosk_devices_company_status` (`company_id`,`status`),
  KEY `idx_attendance_kiosk_devices_unit` (`unit_id`),
  KEY `idx_attendance_kiosk_devices_business` (`business_id`),
  KEY `idx_attendance_kiosk_devices_location` (`location_id`),
  KEY `fk_attendance_kiosk_devices_created_by` (`created_by`),
  CONSTRAINT `fk_attendance_kiosk_devices_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_kiosk_devices_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_kiosk_devices_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_kiosk_devices_location` FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_kiosk_devices_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `attendance_kiosk_devices` VALUES (1,1,5,5,1,'spring-front-kiosk','Spring Front Kiosk','active','64c1e82e4b9011f1bf6edeb84f3000b8','{\"mode\": \"shared\", \"supports_face_recognition\": false}',1,'2026-05-09 10:18:15','2026-05-09 10:18:16');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `contract_start_date` date NOT NULL,
  `contract_end_date` date NOT NULL,
  `name` varchar(160) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `radius_meters` int NOT NULL DEFAULT '80',
  `required_hours_per_day` decimal(5,2) NOT NULL DEFAULT '8.00',
  `required_start_time` time NOT NULL DEFAULT '08:00:00',
  `required_end_time` time NOT NULL DEFAULT '16:00:00',
  `required_days_per_week` int NOT NULL DEFAULT '5',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `managed_source` varchar(40) DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_locations_company` (`company_id`),
  KEY `idx_attendance_locations_unit` (`unit_id`),
  KEY `idx_attendance_locations_business` (`business_id`),
  KEY `fk_attendance_locations_created_by` (`created_by`),
  CONSTRAINT `fk_attendance_locations_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_locations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_locations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_locations_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `attendance_locations` VALUES (1,1,5,5,'2026-05-09','2026-05-09','Spring HQ',25.6866140,-100.3161130,120,8.00,'08:00:00','16:00:00',5,'active','business_structure',1,'2026-05-09 10:18:15','2026-05-09 10:18:16');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_schedule_template_days` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_id` bigint NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `meal_minutes` int NOT NULL DEFAULT '0',
  `rest_minutes` int NOT NULL DEFAULT '0',
  `late_after_minutes` int NOT NULL DEFAULT '10',
  `is_rest_day` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_schedule_template_days_day` (`template_id`,`day_of_week`),
  CONSTRAINT `fk_attendance_schedule_template_days_template` FOREIGN KEY (`template_id`) REFERENCES `attendance_schedule_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `attendance_schedule_template_days` VALUES (1,1,1,'08:30:00','17:30:00',0,0,15,0,'2026-05-09 10:18:15'),(2,1,2,'08:30:00','17:30:00',0,0,15,0,'2026-05-09 10:18:15'),(3,1,3,'08:30:00','17:30:00',0,0,15,0,'2026-05-09 10:18:15'),(4,1,4,'08:30:00','17:30:00',0,0,15,0,'2026-05-09 10:18:15'),(5,1,5,'08:30:00','17:30:00',0,0,15,0,'2026-05-09 10:18:15'),(6,1,6,NULL,NULL,0,0,0,1,'2026-05-09 10:18:15'),(7,1,7,NULL,NULL,0,0,0,1,'2026-05-09 10:18:15');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_schedule_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `schedule_mode` varchar(20) NOT NULL DEFAULT 'strict',
  `block_after_grace_period` tinyint(1) NOT NULL DEFAULT '0',
  `enforce_location` tinyint(1) NOT NULL DEFAULT '0',
  `location_id` bigint DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_schedule_templates_company` (`company_id`),
  KEY `fk_attendance_schedule_templates_created_by` (`created_by`),
  KEY `idx_attendance_schedule_templates_location` (`location_id`),
  CONSTRAINT `fk_attendance_schedule_templates_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_schedule_templates_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `attendance_schedule_templates` VALUES (1,1,'Spring Default Schedule','active','strict',0,0,NULL,1,'2026-05-09 10:18:15','2026-05-09 10:18:15');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `businesses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `timezone` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `radius_meters` int DEFAULT NULL,
  `coordinate_source` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_maps_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `businesses` VALUES (5,1,5,'Spring Biz A',NULL,NULL,NULL,25.6866140,-100.3161130,120,'manual',NULL,'active',NULL,NULL,'2026-03-30 22:24:49','2026-05-09 10:18:16'),(6,1,5,'Spring Biz B',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'active',NULL,NULL,'2026-03-30 22:24:49','2026-03-30 22:24:49');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `companies` VALUES (1,'Empresa Demo Spring',NULL,'2026-03-17 19:37:29','2026-03-30 23:16:15');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_business_profile_answers` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_business_profiles` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_settings` (
  `company_id` bigint NOT NULL,
  `settings_json` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  CONSTRAINT `fk_company_settings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_announcement_targets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `announcement_id` bigint NOT NULL,
  `target_type` varchar(20) NOT NULL,
  `target_value` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_announcement_targets_announcement` (`announcement_id`),
  CONSTRAINT `fk_hr_announcement_targets_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `hr_announcements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `hr_announcement_targets` VALUES (1,1,'unit','5','2026-05-09 10:18:15'),(2,3,'employee','2','2026-05-09 10:18:15');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hr_announcements` (
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
  KEY `idx_hr_announcements_company_status` (`company_id`,`status`),
  CONSTRAINT `fk_hr_announcements_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `hr_announcements` VALUES (1,1,'Cambio de horario operativo','urgent','A partir del lunes, la reunión de arranque cambia a las 8:15 AM para Operaciones.','units','published',NULL,'2026-04-01 08:00:00',1,'2026-05-09 10:18:15','2026-05-09 10:18:15'),(2,1,'Recordatorio de evaluaciones mensuales','reminder','Los líderes deben completar las evaluaciones mensuales antes del viernes a las 5:00 PM.','all','published','2026-04-10 09:30:00','2026-05-09 10:18:18',1,'2026-05-09 10:18:15','2026-05-09 10:18:18'),(3,1,'Celebración de aniversarios del mes','celebration','Compartiremos los aniversarios y logros del mes en la reunión general de RH.','employees','draft',NULL,NULL,1,'2026-05-09 10:18:15','2026-05-09 10:18:15');
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `hr_users` AS SELECT 
 1 AS `id`,
 1 AS `company_id`,
 1 AS `user_company_id`,
 1 AS `user_id`,
 1 AS `work_profile_id`,
 1 AS `user_code`,
 1 AS `full_name`,
 1 AS `first_name`,
 1 AS `last_name`,
 1 AS `email`,
 1 AS `phone`,
 1 AS `position`,
 1 AS `department`,
 1 AS `unit_id`,
 1 AS `business_id`,
 1 AS `hire_date`,
 1 AS `salary`,
 1 AS `pay_period`,
 1 AS `salary_type`,
 1 AS `hourly_rate`,
 1 AS `contract_type`,
 1 AS `contract_start_date`,
 1 AS `contract_end_date`,
 1 AS `termination_date`,
 1 AS `last_working_day`,
 1 AS `termination_reason_type`,
 1 AS `termination_reason_code`,
 1 AS `termination_summary`,
 1 AS `date_of_birth`,
 1 AS `address`,
 1 AS `national_id`,
 1 AS `tax_id`,
 1 AS `social_security_number`,
 1 AS `registration_country`,
 1 AS `state_province`,
 1 AS `city`,
 1 AS `postal_code`,
 1 AS `alternate_phone`,
 1 AS `emergency_contact_name`,
 1 AS `emergency_contact_relationship`,
 1 AS `emergency_contact_phone`,
 1 AS `workday_hours`,
 1 AS `status`,
 1 AS `created_by`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `modules` VALUES (1,'human_resources','Recursos Humanos','Gestión de empleados, asistencia y nómina','bi-people-fill',NULL,'pro',1,0,1),(2,'expenses','Gastos','Control de gastos y caja chica','bi-receipt',NULL,'pro',2,0,1),(3,'crm','CRM','Gestión de clientes y oportunidades','bi-person-badge',NULL,'pro',3,0,1),(4,'pos','Punto de Venta','Sistema de ventas y productos','bi-shop',NULL,'enterprise',4,0,1),(5,'processes','Procesos y Tareas','Gestión de workflows y tareas','bi-list-check',NULL,'enterprise',5,0,1),(6,'maintenance','Mantenimiento','Reportes y gestión de mantenimiento','bi-tools',NULL,'enterprise',6,0,1),(7,'inventory','Inventarios','Control de stock e inventarios','bi-boxes',NULL,'enterprise',7,0,1),(8,'config_center','Panel Inicial','Configuracion inicial de la empresa','bi-gear-fill','Basic','basic',1,1,1);
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_preferences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `grouping_mode` varchar(20) NOT NULL DEFAULT 'single',
  `default_daily_hours` decimal(5,2) NOT NULL DEFAULT '8.00',
  `pay_leave_days` tinyint(1) NOT NULL DEFAULT '1',
  `isr_rate` decimal(8,5) NOT NULL DEFAULT '0.10000',
  `imss_user_rate` decimal(8,5) NOT NULL DEFAULT '0.04000',
  `infonavit_user_rate` decimal(8,5) NOT NULL DEFAULT '0.03000',
  `imss_employer_rate` decimal(8,5) NOT NULL DEFAULT '0.07000',
  `infonavit_employer_rate` decimal(8,5) NOT NULL DEFAULT '0.05000',
  `sar_employer_rate` decimal(8,5) NOT NULL DEFAULT '0.02000',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_preferences_company` (`company_id`),
  CONSTRAINT `fk_payroll_preferences_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `payroll_preferences` VALUES (1,1,'single',8.00,1,0.10000,0.04000,0.03000,0.07000,0.05000,0.02000,'2026-05-09 10:18:15','2026-05-09 10:18:15');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_run_line_items` (
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
  KEY `idx_payroll_run_line_items_line` (`run_line_id`),
  CONSTRAINT `fk_payroll_run_line_items_line` FOREIGN KEY (`run_line_id`) REFERENCES `payroll_run_lines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_run_lines` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `user_code_snapshot` varchar(80) DEFAULT NULL,
  `user_name_snapshot` varchar(180) NOT NULL,
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
  UNIQUE KEY `uq_payroll_run_lines_run_user` (`run_id`,`user_company_id`),
  KEY `idx_payroll_run_lines_company` (`company_id`),
  KEY `idx_payroll_run_lines_user` (`company_id`,`user_id`),
  KEY `fk_payroll_run_lines_user_company` (`user_company_id`),
  KEY `fk_payroll_run_lines_user` (`user_id`),
  CONSTRAINT `fk_payroll_run_lines_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_run_lines_run` FOREIGN KEY (`run_id`) REFERENCES `payroll_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_run_lines_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_run_lines_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_runs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `grouping_mode` varchar(20) NOT NULL,
  `grouping_key` varchar(80) DEFAULT NULL,
  `grouping_label` varchar(160) DEFAULT NULL,
  `pay_period` varchar(20) NOT NULL,
  `period_start_date` date NOT NULL,
  `period_end_date` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `users_count` int NOT NULL DEFAULT '0',
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
  KEY `idx_payroll_runs_company_period` (`company_id`,`period_start_date`,`period_end_date`),
  KEY `idx_payroll_runs_company_status` (`company_id`,`status`),
  CONSTRAINT `fk_payroll_runs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `process_id` bigint DEFAULT NULL,
  `project_id` bigint DEFAULT NULL,
  `folio` varchar(40) NOT NULL,
  `title` varchar(220) NOT NULL,
  `description` text,
  `assigned_user_id` bigint DEFAULT NULL,
  `assigned_user_company_id` bigint DEFAULT NULL,
  `assigned_name` varchar(180) DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'pending',
  `priority` varchar(50) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `completed_by_user_id` bigint DEFAULT NULL,
  `completed_by_user_company_id` bigint DEFAULT NULL,
  `completion_notes` text,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_process_tasks_company_folio` (`company_id`,`folio`),
  KEY `idx_process_tasks_company_status` (`company_id`,`status`),
  KEY `idx_process_tasks_process` (`process_id`),
  KEY `idx_process_tasks_user` (`assigned_user_id`),
  KEY `idx_process_tasks_project` (`project_id`),
  KEY `idx_process_tasks_assigned_user_company` (`assigned_user_company_id`),
  KEY `idx_process_tasks_completed_user_company` (`completed_by_user_company_id`),
  CONSTRAINT `fk_process_tasks_assigned_user_company` FOREIGN KEY (`assigned_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_process_tasks_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_process_tasks_completed_user_company` FOREIGN KEY (`completed_by_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_process_tasks_process` FOREIGN KEY (`process_id`) REFERENCES `processes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_process_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `processes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `folio` varchar(40) NOT NULL,
  `unit_name` varchar(160) DEFAULT NULL,
  `business_name` varchar(160) DEFAULT NULL,
  `title` varchar(220) NOT NULL,
  `description` text NOT NULL,
  `frequency` varchar(40) NOT NULL,
  `priority` varchar(30) NOT NULL DEFAULT 'medium',
  `creator_user_id` bigint DEFAULT NULL,
  `creator_name` varchar(180) DEFAULT NULL,
  `responsible_name` varchar(180) DEFAULT NULL,
  `recurrence_json` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_processes_company_folio` (`company_id`,`folio`),
  KEY `idx_processes_company_active` (`company_id`,`is_active`),
  KEY `idx_processes_company_created` (`company_id`,`created_at`),
  CONSTRAINT `fk_processes_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `folio` varchar(40) NOT NULL,
  `name` varchar(220) NOT NULL,
  `description` text,
  `status` varchar(40) NOT NULL DEFAULT 'active',
  `priority` varchar(50) DEFAULT NULL,
  `owner_user_id` bigint DEFAULT NULL,
  `owner_user_company_id` bigint DEFAULT NULL,
  `owner_name` varchar(180) DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_projects_company_folio` (`company_id`,`folio`),
  KEY `idx_projects_company_status` (`company_id`,`status`),
  KEY `idx_projects_company_due_date` (`company_id`,`due_date`),
  KEY `idx_projects_owner_user` (`owner_user_id`),
  KEY `idx_projects_business` (`business_id`),
  KEY `idx_projects_unit` (`unit_id`),
  KEY `idx_projects_owner_user_company` (`owner_user_company_id`),
  CONSTRAINT `fk_projects_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_owner_user_company` FOREIGN KEY (`owner_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint DEFAULT NULL,
  `name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `timezone` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_units_company` (`company_id`),
  KEY `idx_units_status` (`status`),
  CONSTRAINT `fk_units_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `units` VALUES (5,1,'Spring Unit',NULL,NULL,'active','2026-03-30 22:24:49','2026-03-30 22:24:49');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_access_methods` (
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
  UNIQUE KEY `uq_user_access_methods_company_method_ref` (`company_id`,`method_type`,`credential_ref`),
  KEY `idx_user_access_methods_profile_status` (`access_profile_id`,`status`),
  KEY `idx_user_access_methods_company_method` (`company_id`,`method_type`,`status`),
  CONSTRAINT `fk_user_access_methods_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_access_methods_profile` FOREIGN KEY (`access_profile_id`) REFERENCES `user_access_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_access_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `default_method` varchar(30) NOT NULL DEFAULT 'manual_override',
  `last_enrolled_at` datetime DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_access_profiles_company_user_company` (`company_id`,`user_company_id`),
  KEY `idx_user_access_profiles_company_status` (`company_id`,`status`),
  KEY `idx_user_access_profiles_user` (`user_id`),
  KEY `fk_user_access_profiles_user_company` (`user_company_id`),
  KEY `fk_user_access_profiles_created_by` (`created_by`),
  CONSTRAINT `fk_user_access_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_access_profiles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_access_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_access_profiles_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_allowed_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `location_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_allowed_locations_user_location` (`company_id`,`user_company_id`,`location_id`),
  KEY `idx_user_allowed_locations_user` (`company_id`,`user_company_id`,`status`),
  KEY `idx_user_allowed_locations_location` (`location_id`),
  KEY `fk_user_allowed_locations_user_company` (`user_company_id`),
  KEY `fk_user_allowed_locations_user` (`user_id`),
  KEY `fk_user_allowed_locations_created_by` (`created_by`),
  CONSTRAINT `fk_user_allowed_locations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_allowed_locations_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_allowed_locations_location` FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_allowed_locations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_allowed_locations_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_asset_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `asset_id` bigint NOT NULL,
  `responsible_user_company_id` bigint DEFAULT NULL,
  `responsible_user_id` bigint DEFAULT NULL,
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
  KEY `idx_user_asset_assignments_asset_started` (`company_id`,`asset_id`,`started_at`),
  KEY `idx_user_asset_assignments_asset_ended` (`asset_id`,`ended_at`),
  KEY `idx_user_asset_assignments_user_started` (`company_id`,`responsible_user_company_id`,`started_at`),
  KEY `fk_user_asset_assignments_responsible_user_company` (`responsible_user_company_id`),
  KEY `fk_user_asset_assignments_responsible_user` (`responsible_user_id`),
  KEY `fk_user_asset_assignments_unit` (`unit_id`),
  KEY `fk_user_asset_assignments_created_by_user` (`created_by_user_id`),
  KEY `fk_user_asset_assignments_ended_by_user` (`ended_by_user_id`),
  CONSTRAINT `fk_user_asset_assignments_asset` FOREIGN KEY (`asset_id`) REFERENCES `user_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_asset_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_asset_assignments_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_ended_by_user` FOREIGN KEY (`ended_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_responsible_user` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_responsible_user_company` FOREIGN KEY (`responsible_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_user_asset_assignments_status` CHECK ((`assignment_status` in (_utf8mb4'assigned',_utf8mb4'custody')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_asset_status_history` (
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
  KEY `idx_user_asset_status_history_asset_changed` (`company_id`,`asset_id`,`changed_at`),
  KEY `idx_user_asset_status_history_to_status_changed` (`company_id`,`to_status`,`changed_at`),
  KEY `fk_user_asset_status_history_asset` (`asset_id`),
  KEY `fk_user_asset_status_history_changed_by_user` (`changed_by_user_id`),
  CONSTRAINT `fk_user_asset_status_history_asset` FOREIGN KEY (`asset_id`) REFERENCES `user_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_asset_status_history_changed_by_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_status_history_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_asset_status_history_from_status` CHECK (((`from_status` is null) or (`from_status` in (_utf8mb4'available',_utf8mb4'assigned',_utf8mb4'maintenance',_utf8mb4'custody',_utf8mb4'inactive')))),
  CONSTRAINT `chk_user_asset_status_history_to_status` CHECK ((`to_status` in (_utf8mb4'available',_utf8mb4'assigned',_utf8mb4'maintenance',_utf8mb4'custody',_utf8mb4'inactive')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_assets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `asset_code` varchar(80) NOT NULL,
  `asset_type` varchar(50) NOT NULL,
  `name` varchar(160) NOT NULL,
  `model` varchar(160) DEFAULT NULL,
  `serial_number` varchar(160) DEFAULT NULL,
  `responsible_user_company_id` bigint DEFAULT NULL,
  `responsible_user_id` bigint DEFAULT NULL,
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
  UNIQUE KEY `uk_user_assets_company_asset_code` (`company_id`,`asset_code`),
  UNIQUE KEY `uk_user_assets_company_serial_number` (`company_id`,`serial_number`),
  KEY `idx_user_assets_company_status` (`company_id`,`status`),
  KEY `idx_user_assets_company_responsible` (`company_id`,`responsible_user_company_id`),
  KEY `idx_user_assets_company_unit` (`company_id`,`unit_id`),
  KEY `idx_user_assets_company_type` (`company_id`,`asset_type`),
  KEY `idx_user_assets_company_updated_at` (`company_id`,`updated_at`),
  KEY `fk_user_assets_responsible_user_company` (`responsible_user_company_id`),
  KEY `fk_user_assets_responsible_user` (`responsible_user_id`),
  KEY `fk_user_assets_unit` (`unit_id`),
  KEY `fk_user_assets_created_by_user` (`created_by_user_id`),
  KEY `fk_user_assets_updated_by_user` (`updated_by_user_id`),
  CONSTRAINT `fk_user_assets_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_assets_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_responsible_user` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_responsible_user_company` FOREIGN KEY (`responsible_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_updated_by_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_user_assets_status` CHECK ((`status` in (_utf8mb4'available',_utf8mb4'assigned',_utf8mb4'maintenance',_utf8mb4'custody',_utf8mb4'inactive'))),
  CONSTRAINT `chk_user_assets_value_amount` CHECK (((`value_amount` is null) or (`value_amount` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_attendance_daily_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
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
  UNIQUE KEY `uq_user_attendance_daily_records_user_day` (`company_id`,`user_company_id`,`attendance_date`),
  KEY `idx_user_attendance_daily_records_company_date` (`company_id`,`attendance_date`),
  KEY `idx_user_attendance_daily_records_user_date` (`company_id`,`user_id`,`attendance_date`),
  KEY `fk_user_attendance_daily_records_user_company` (`user_company_id`),
  KEY `fk_user_attendance_daily_records_user` (`user_id`),
  KEY `fk_user_attendance_daily_records_corrected_by` (`corrected_by`),
  KEY `fk_user_attendance_daily_records_first_location` (`first_location_id`),
  KEY `fk_user_attendance_daily_records_last_location` (`last_location_id`),
  CONSTRAINT `fk_user_attendance_daily_records_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_daily_records_corrected_by` FOREIGN KEY (`corrected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_daily_records_first_location` FOREIGN KEY (`first_location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_daily_records_last_location` FOREIGN KEY (`last_location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_daily_records_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_daily_records_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_attendance_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `event_type` varchar(20) NOT NULL,
  `event_timestamp` datetime NOT NULL,
  `attendance_date` date NOT NULL,
  `location_id` bigint DEFAULT NULL,
  `kiosk_device_id` bigint DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'web_self',
  `auth_method` varchar(40) DEFAULT NULL,
  `result_status` varchar(20) DEFAULT NULL,
  `event_kind` varchar(30) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `supersedes_event_id` bigint DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_attendance_events_company_date` (`company_id`,`attendance_date`),
  KEY `idx_user_attendance_events_user_company_date` (`company_id`,`user_company_id`,`attendance_date`),
  KEY `idx_user_attendance_events_user_date` (`company_id`,`user_id`,`attendance_date`),
  KEY `idx_user_attendance_events_location` (`company_id`,`location_id`,`event_timestamp`),
  KEY `idx_user_attendance_events_kiosk` (`company_id`,`kiosk_device_id`,`event_timestamp`),
  KEY `fk_user_attendance_events_user_company` (`user_company_id`),
  KEY `fk_user_attendance_events_user` (`user_id`),
  KEY `fk_user_attendance_events_location` (`location_id`),
  KEY `fk_user_attendance_events_kiosk_device` (`kiosk_device_id`),
  KEY `fk_user_attendance_events_supersedes` (`supersedes_event_id`),
  KEY `fk_user_attendance_events_created_by` (`created_by`),
  CONSTRAINT `fk_user_attendance_events_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_events_kiosk_device` FOREIGN KEY (`kiosk_device_id`) REFERENCES `attendance_kiosk_devices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_events_location` FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_events_supersedes` FOREIGN KEY (`supersedes_event_id`) REFERENCES `user_attendance_events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_events_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `user_companies` VALUES (1,1,1,'admin','active','all','2026-03-17 19:37:29');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
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
  UNIQUE KEY `uq_user_documents_user_type` (`company_id`,`user_company_id`,`document_type`),
  UNIQUE KEY `uq_user_documents_object_key` (`company_id`,`object_key`),
  KEY `idx_user_documents_company_user` (`company_id`,`user_id`),
  KEY `fk_user_documents_user_company` (`user_company_id`),
  KEY `fk_user_documents_user` (`user_id`),
  KEY `fk_user_documents_uploaded_by` (`uploaded_by_user_id`),
  CONSTRAINT `fk_user_documents_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_documents_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_documents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_documents_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_face_enrollment_captures` (
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
  UNIQUE KEY `uq_user_face_enrollment_captures_step` (`enrollment_id`,`capture_step`),
  CONSTRAINT `fk_user_face_enrollment_captures_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `user_face_enrollments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_face_enrollments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `enrolled_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_face_enrollments_user` (`company_id`,`user_company_id`),
  KEY `fk_user_face_enrollments_user_company` (`user_company_id`),
  KEY `fk_user_face_enrollments_user` (`user_id`),
  KEY `fk_user_face_enrollments_created_by` (`created_by`),
  CONSTRAINT `fk_user_face_enrollments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_enrollments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_face_enrollments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_enrollments_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_face_verification_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `session_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `event_type` varchar(40) NOT NULL,
  `status` varchar(20) NOT NULL,
  `detail_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_face_verification_events_session` (`session_id`),
  KEY `idx_user_face_verification_events_user` (`company_id`,`user_company_id`),
  KEY `fk_user_face_verification_events_user_company` (`user_company_id`),
  KEY `fk_user_face_verification_events_user` (`user_id`),
  CONSTRAINT `fk_user_face_verification_events_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_events_session` FOREIGN KEY (`session_id`) REFERENCES `user_face_verification_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_events_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_face_verification_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
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
  KEY `idx_user_face_verification_sessions_user` (`company_id`,`user_company_id`),
  KEY `fk_user_face_verification_sessions_user_company` (`user_company_id`),
  KEY `fk_user_face_verification_sessions_user` (`user_id`),
  KEY `fk_user_face_verification_sessions_created_by` (`created_by`),
  CONSTRAINT `fk_user_face_verification_sessions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_sessions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_face_verification_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_sessions_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_invitations` (
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
  KEY `fk_user_invitations_invited_by` (`invited_by`),
  CONSTRAINT `fk_user_invitations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_invitations_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_module_favorites` (
  `user_id` bigint NOT NULL,
  `module_slug` varchar(50) NOT NULL,
  PRIMARY KEY (`user_id`,`module_slug`),
  CONSTRAINT `user_module_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_number_sequences` (
  `company_id` bigint NOT NULL,
  `prefix` varchar(12) NOT NULL DEFAULT 'USR',
  `padding` int NOT NULL DEFAULT '4',
  `next_number` bigint NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  CONSTRAINT `fk_user_number_sequences_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `user_number_sequences` VALUES (1,'USR',4,2,'2026-05-09 10:18:18');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_personal_performance_answers` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_personal_performance_profiles` (
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
  CONSTRAINT `fk_user_personal_performance_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_personal_performance_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `user_id` bigint NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  `preferred_language` varchar(20) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `avatar_object_key` varchar(512) DEFAULT NULL,
  `avatar_content_type` varchar(100) DEFAULT NULL,
  `avatar_updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_record_activity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `record_id` bigint NOT NULL,
  `activity_type` varchar(32) NOT NULL,
  `from_status` varchar(16) DEFAULT NULL,
  `to_status` varchar(16) DEFAULT NULL,
  `note` text,
  `actor_user_id` bigint NOT NULL,
  `actor_name_snapshot` varchar(160) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_record_activity_record` (`record_id`),
  KEY `idx_user_record_activity_company` (`company_id`),
  KEY `fk_user_record_activity_actor_user` (`actor_user_id`),
  CONSTRAINT `fk_user_record_activity_actor_user` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_record_activity_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_activity_record` FOREIGN KEY (`record_id`) REFERENCES `user_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_record_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `record_id` bigint NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `size_bytes` bigint NOT NULL,
  `object_key` varchar(512) NOT NULL,
  `uploaded_by_user_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_record_attachments_object_key` (`company_id`,`object_key`),
  KEY `idx_user_record_attachments_record` (`record_id`),
  KEY `idx_user_record_attachments_company_deleted` (`company_id`,`deleted_at`),
  KEY `fk_user_record_attachments_uploaded_by_user` (`uploaded_by_user_id`),
  CONSTRAINT `fk_user_record_attachments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_attachments_record` FOREIGN KEY (`record_id`) REFERENCES `user_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_attachments_uploaded_by_user` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_record_witnesses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `record_id` bigint NOT NULL,
  `witness_user_company_id` bigint DEFAULT NULL,
  `witness_user_id` bigint DEFAULT NULL,
  `witness_name_snapshot` varchar(160) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_record_witnesses_record` (`record_id`),
  KEY `idx_user_record_witnesses_company` (`company_id`),
  KEY `fk_user_record_witnesses_user_company` (`witness_user_company_id`),
  KEY `fk_user_record_witnesses_user` (`witness_user_id`),
  CONSTRAINT `fk_user_record_witnesses_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_witnesses_record` FOREIGN KEY (`record_id`) REFERENCES `user_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_witnesses_user` FOREIGN KEY (`witness_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_record_witnesses_user_company` FOREIGN KEY (`witness_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `record_number` varchar(32) DEFAULT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `user_name_snapshot` varchar(160) NOT NULL,
  `user_position_snapshot` varchar(160) DEFAULT NULL,
  `user_department_snapshot` varchar(160) DEFAULT NULL,
  `user_unit_id_snapshot` bigint DEFAULT NULL,
  `user_unit_name_snapshot` varchar(160) DEFAULT NULL,
  `user_business_id_snapshot` bigint DEFAULT NULL,
  `user_business_name_snapshot` varchar(160) DEFAULT NULL,
  `record_type` varchar(32) NOT NULL,
  `severity` varchar(16) DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `title` varchar(160) NOT NULL,
  `description` text NOT NULL,
  `actions_taken` text,
  `event_date` datetime NOT NULL,
  `reported_by_user_id` bigint NOT NULL,
  `reported_by_user_company_id` bigint DEFAULT NULL,
  `reported_by_name_snapshot` varchar(160) NOT NULL,
  `created_by_user_id` bigint NOT NULL,
  `updated_by_user_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_records_company_number` (`company_id`,`record_number`),
  KEY `idx_user_records_company_user` (`company_id`,`user_company_id`),
  KEY `idx_user_records_company_status` (`company_id`,`status`),
  KEY `idx_user_records_company_type` (`company_id`,`record_type`),
  KEY `idx_user_records_company_event_date` (`company_id`,`event_date`),
  KEY `idx_user_records_company_deleted` (`company_id`,`deleted_at`),
  KEY `fk_user_records_user_company` (`user_company_id`),
  KEY `fk_user_records_user` (`user_id`),
  KEY `fk_user_records_reported_by_user` (`reported_by_user_id`),
  KEY `fk_user_records_reported_by_user_company` (`reported_by_user_company_id`),
  KEY `fk_user_records_created_by_user` (`created_by_user_id`),
  KEY `fk_user_records_updated_by_user` (`updated_by_user_id`),
  CONSTRAINT `fk_user_records_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_records_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_records_reported_by_user` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_records_reported_by_user_company` FOREIGN KEY (`reported_by_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_records_updated_by_user` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_records_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_records_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_schedule_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `template_id` bigint NOT NULL,
  `effective_start_date` date NOT NULL,
  `effective_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_schedule_assignments_company_user` (`company_id`,`user_company_id`),
  KEY `idx_user_schedule_assignments_template` (`template_id`),
  KEY `fk_user_schedule_assignments_user_company` (`user_company_id`),
  KEY `fk_user_schedule_assignments_user` (`user_id`),
  KEY `fk_user_schedule_assignments_created_by` (`created_by`),
  CONSTRAINT `fk_user_schedule_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_schedule_assignments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_schedule_assignments_template` FOREIGN KEY (`template_id`) REFERENCES `attendance_schedule_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_schedule_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_schedule_assignments_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_work_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `user_code` varchar(50) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `pay_period` varchar(20) DEFAULT 'weekly',
  `salary_type` varchar(20) DEFAULT 'daily',
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `contract_type` varchar(20) DEFAULT 'permanent',
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `termination_date` date DEFAULT NULL,
  `last_working_day` date DEFAULT NULL,
  `termination_reason_type` varchar(40) DEFAULT NULL,
  `termination_reason_code` varchar(80) DEFAULT NULL,
  `termination_summary` text,
  `date_of_birth` date DEFAULT NULL,
  `address` text,
  `national_id` varchar(80) DEFAULT NULL,
  `tax_id` varchar(80) DEFAULT NULL,
  `social_security_number` varchar(80) DEFAULT NULL,
  `registration_country` varchar(2) DEFAULT NULL,
  `state_province` varchar(120) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `alternate_phone` varchar(50) DEFAULT NULL,
  `emergency_contact_name` varchar(120) DEFAULT NULL,
  `emergency_contact_relationship` varchar(80) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `workday_hours` decimal(5,2) NOT NULL DEFAULT '8.00',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_work_profiles_company_user_company` (`company_id`,`user_company_id`),
  UNIQUE KEY `uq_user_work_profiles_company_code` (`company_id`,`user_code`),
  KEY `idx_user_work_profiles_company_user` (`company_id`,`user_id`),
  KEY `idx_user_work_profiles_company_status` (`company_id`,`status`),
  KEY `idx_user_work_profiles_unit` (`unit_id`),
  KEY `idx_user_work_profiles_business` (`business_id`),
  KEY `fk_user_work_profiles_user_company` (`user_company_id`),
  KEY `fk_user_work_profiles_user` (`user_id`),
  KEY `fk_user_work_profiles_created_by` (`created_by`),
  CONSTRAINT `fk_user_work_profiles_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_work_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_profiles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_work_profiles_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_work_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_profiles_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_work_site_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `location_id` bigint NOT NULL,
  `effective_start_date` date NOT NULL,
  `effective_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_work_sites_user_date` (`company_id`,`user_company_id`,`effective_start_date`,`effective_end_date`,`status`),
  KEY `idx_user_work_sites_location` (`location_id`),
  KEY `fk_user_work_sites_user_company` (`user_company_id`),
  KEY `fk_user_work_sites_user` (`user_id`),
  KEY `fk_user_work_sites_created_by` (`created_by`),
  CONSTRAINT `fk_user_work_sites_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_sites_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_work_sites_location` FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_sites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_sites_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `users` VALUES (1,'demo@example.com','$2y$12$4s7mj2iDLKOSDtJY9Zz5qukpJvNLtWAF87NhuEEF7kxuEH6G1r3ge','Usuario Demo','2026-03-17 19:37:29','2026-03-17 19:37:29');
/*!50001 DROP VIEW IF EXISTS `hr_users`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `hr_users` AS select `uc`.`id` AS `id`,`uc`.`company_id` AS `company_id`,`uc`.`id` AS `user_company_id`,`u`.`id` AS `user_id`,`wp`.`id` AS `work_profile_id`,coalesce(`wp`.`user_code`,'') AS `user_code`,trim(coalesce(nullif(`up`.`full_name`,''),nullif(`u`.`full_name`,''),`u`.`email`)) AS `full_name`,substring_index(trim(coalesce(nullif(`up`.`full_name`,''),nullif(`u`.`full_name`,''),`u`.`email`)),' ',1) AS `first_name`,trim(substr(trim(coalesce(nullif(`up`.`full_name`,''),nullif(`u`.`full_name`,''),`u`.`email`)),(char_length(substring_index(trim(coalesce(nullif(`up`.`full_name`,''),nullif(`u`.`full_name`,''),`u`.`email`)),' ',1)) + 1))) AS `last_name`,`u`.`email` AS `email`,coalesce(`up`.`phone`,'') AS `phone`,coalesce(`wp`.`position`,'') AS `position`,coalesce(`wp`.`department`,'') AS `department`,`wp`.`unit_id` AS `unit_id`,`wp`.`business_id` AS `business_id`,`wp`.`hire_date` AS `hire_date`,`wp`.`salary` AS `salary`,coalesce(`wp`.`pay_period`,'weekly') AS `pay_period`,coalesce(`wp`.`salary_type`,'daily') AS `salary_type`,`wp`.`hourly_rate` AS `hourly_rate`,coalesce(`wp`.`contract_type`,'permanent') AS `contract_type`,`wp`.`contract_start_date` AS `contract_start_date`,`wp`.`contract_end_date` AS `contract_end_date`,`wp`.`termination_date` AS `termination_date`,`wp`.`last_working_day` AS `last_working_day`,`wp`.`termination_reason_type` AS `termination_reason_type`,`wp`.`termination_reason_code` AS `termination_reason_code`,`wp`.`termination_summary` AS `termination_summary`,coalesce(`wp`.`date_of_birth`,NULL) AS `date_of_birth`,coalesce(`wp`.`address`,'') AS `address`,coalesce(`wp`.`national_id`,'') AS `national_id`,coalesce(`wp`.`tax_id`,'') AS `tax_id`,coalesce(`wp`.`social_security_number`,'') AS `social_security_number`,coalesce(`wp`.`registration_country`,'') AS `registration_country`,coalesce(`wp`.`state_province`,'') AS `state_province`,coalesce(`wp`.`city`,'') AS `city`,coalesce(`wp`.`postal_code`,'') AS `postal_code`,coalesce(`wp`.`alternate_phone`,'') AS `alternate_phone`,coalesce(`wp`.`emergency_contact_name`,'') AS `emergency_contact_name`,coalesce(`wp`.`emergency_contact_relationship`,'') AS `emergency_contact_relationship`,coalesce(`wp`.`emergency_contact_phone`,'') AS `emergency_contact_phone`,coalesce(`wp`.`workday_hours`,8.00) AS `workday_hours`,coalesce(`wp`.`status`,`uc`.`status`,'active') AS `status`,`wp`.`created_by` AS `created_by`,coalesce(`wp`.`created_at`,`uc`.`created_at`) AS `created_at`,`wp`.`updated_at` AS `updated_at` from (((`user_companies` `uc` join `users` `u` on((`u`.`id` = `uc`.`user_id`))) left join `user_profiles` `up` on((`up`.`user_id` = `u`.`id`))) left join `user_work_profiles` `wp` on(((`wp`.`company_id` = `uc`.`company_id`) and (`wp`.`user_company_id` = `uc`.`id`)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

