-- User-based Human Resources foundation.
-- This migration is intentionally additive: old hr_employee tables stay in place
-- until the backend has been rewired and verified against the user tables.

CREATE TABLE IF NOT EXISTS `user_number_sequences` (
  `company_id` bigint NOT NULL,
  `prefix` varchar(12) NOT NULL DEFAULT 'USR',
  `padding` int NOT NULL DEFAULT '4',
  `next_number` bigint NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  CONSTRAINT `fk_user_number_sequences_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `user_number_sequences`
  MODIFY COLUMN `padding` int NOT NULL DEFAULT '4',
  MODIFY COLUMN `next_number` bigint NOT NULL DEFAULT '1';

CREATE TABLE IF NOT EXISTS `user_work_profiles` (
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
  `termination_summary` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
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
  UNIQUE KEY `uq_user_work_profiles_company_user_company` (`company_id`, `user_company_id`),
  UNIQUE KEY `uq_user_work_profiles_company_code` (`company_id`, `user_code`),
  KEY `idx_user_work_profiles_company_user` (`company_id`, `user_id`),
  KEY `idx_user_work_profiles_company_status` (`company_id`, `status`),
  KEY `idx_user_work_profiles_unit` (`unit_id`),
  KEY `idx_user_work_profiles_business` (`business_id`),
  CONSTRAINT `fk_user_work_profiles_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_profiles_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_profiles_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_work_profiles_business`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_work_profiles_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_documents` (
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
  UNIQUE KEY `uq_user_documents_user_type` (`company_id`, `user_company_id`, `document_type`),
  UNIQUE KEY `uq_user_documents_object_key` (`company_id`, `object_key`),
  KEY `idx_user_documents_company_user` (`company_id`, `user_id`),
  CONSTRAINT `fk_user_documents_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_documents_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_documents_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_documents_uploaded_by`
    FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `attendance_locations` (
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
  CONSTRAINT `fk_attendance_locations_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_locations_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_locations_business`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_locations_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `attendance_schedule_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_schedule_templates_company` (`company_id`),
  CONSTRAINT `fk_attendance_schedule_templates_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_schedule_templates_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `attendance_schedule_template_days` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_id` bigint NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `late_after_minutes` int NOT NULL DEFAULT '10',
  `is_rest_day` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_schedule_template_days_day` (`template_id`, `day_of_week`),
  CONSTRAINT `fk_attendance_schedule_template_days_template`
    FOREIGN KEY (`template_id`) REFERENCES `attendance_schedule_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_schedule_assignments` (
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
  KEY `idx_user_schedule_assignments_company_user` (`company_id`, `user_company_id`),
  KEY `idx_user_schedule_assignments_template` (`template_id`),
  CONSTRAINT `fk_user_schedule_assignments_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_schedule_assignments_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_schedule_assignments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_schedule_assignments_template`
    FOREIGN KEY (`template_id`) REFERENCES `attendance_schedule_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_schedule_assignments_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `attendance_kiosk_devices` (
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
  UNIQUE KEY `uq_attendance_kiosk_devices_company_code` (`company_id`, `code`),
  UNIQUE KEY `uq_attendance_kiosk_devices_public_token` (`public_access_token`),
  KEY `idx_attendance_kiosk_devices_company_status` (`company_id`, `status`),
  KEY `idx_attendance_kiosk_devices_unit` (`unit_id`),
  KEY `idx_attendance_kiosk_devices_business` (`business_id`),
  KEY `idx_attendance_kiosk_devices_location` (`location_id`),
  CONSTRAINT `fk_attendance_kiosk_devices_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_kiosk_devices_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_kiosk_devices_business`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_kiosk_devices_location`
    FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_kiosk_devices_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_access_profiles` (
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
  UNIQUE KEY `uq_user_access_profiles_company_user_company` (`company_id`, `user_company_id`),
  KEY `idx_user_access_profiles_company_status` (`company_id`, `status`),
  KEY `idx_user_access_profiles_user` (`user_id`),
  CONSTRAINT `fk_user_access_profiles_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_access_profiles_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_access_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_access_profiles_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_access_methods` (
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
  UNIQUE KEY `uq_user_access_methods_company_method_ref` (`company_id`, `method_type`, `credential_ref`),
  KEY `idx_user_access_methods_profile_status` (`access_profile_id`, `status`),
  KEY `idx_user_access_methods_company_method` (`company_id`, `method_type`, `status`),
  CONSTRAINT `fk_user_access_methods_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_access_methods_profile`
    FOREIGN KEY (`access_profile_id`) REFERENCES `user_access_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_attendance_events` (
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
  KEY `idx_user_attendance_events_company_date` (`company_id`, `attendance_date`),
  KEY `idx_user_attendance_events_user_company_date` (`company_id`, `user_company_id`, `attendance_date`),
  KEY `idx_user_attendance_events_user_date` (`company_id`, `user_id`, `attendance_date`),
  KEY `idx_user_attendance_events_location` (`company_id`, `location_id`, `event_timestamp`),
  KEY `idx_user_attendance_events_kiosk` (`company_id`, `kiosk_device_id`, `event_timestamp`),
  CONSTRAINT `fk_user_attendance_events_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_events_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_events_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_events_location`
    FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_events_kiosk_device`
    FOREIGN KEY (`kiosk_device_id`) REFERENCES `attendance_kiosk_devices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_events_supersedes`
    FOREIGN KEY (`supersedes_event_id`) REFERENCES `user_attendance_events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_events_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_attendance_daily_records` (
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
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_attendance_daily_records_user_day` (`company_id`, `user_company_id`, `attendance_date`),
  KEY `idx_user_attendance_daily_records_company_date` (`company_id`, `attendance_date`),
  KEY `idx_user_attendance_daily_records_user_date` (`company_id`, `user_id`, `attendance_date`),
  CONSTRAINT `fk_user_attendance_daily_records_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_daily_records_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_daily_records_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_attendance_daily_records_corrected_by`
    FOREIGN KEY (`corrected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_daily_records_first_location`
    FOREIGN KEY (`first_location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_attendance_daily_records_last_location`
    FOREIGN KEY (`last_location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_allowed_locations` (
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
  UNIQUE KEY `uq_user_allowed_locations_user_location` (`company_id`, `user_company_id`, `location_id`),
  KEY `idx_user_allowed_locations_user` (`company_id`, `user_company_id`, `status`),
  KEY `idx_user_allowed_locations_location` (`location_id`),
  CONSTRAINT `fk_user_allowed_locations_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_allowed_locations_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_allowed_locations_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_allowed_locations_location`
    FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_allowed_locations_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_work_site_assignments` (
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
  KEY `idx_user_work_sites_user_date` (`company_id`, `user_company_id`, `effective_start_date`, `effective_end_date`, `status`),
  KEY `idx_user_work_sites_location` (`location_id`),
  CONSTRAINT `fk_user_work_sites_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_sites_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_sites_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_sites_location`
    FOREIGN KEY (`location_id`) REFERENCES `attendance_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_work_sites_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_face_enrollments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `enrolled_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_face_enrollments_user` (`company_id`, `user_company_id`),
  CONSTRAINT `fk_user_face_enrollments_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_enrollments_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_enrollments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_enrollments_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_face_enrollment_captures` (
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
  UNIQUE KEY `uq_user_face_enrollment_captures_step` (`enrollment_id`, `capture_step`),
  CONSTRAINT `fk_user_face_enrollment_captures_enrollment`
    FOREIGN KEY (`enrollment_id`) REFERENCES `user_face_enrollments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_face_verification_sessions` (
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
  KEY `idx_user_face_verification_sessions_user` (`company_id`, `user_company_id`),
  CONSTRAINT `fk_user_face_verification_sessions_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_sessions_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_sessions_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_face_verification_events` (
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
  KEY `idx_user_face_verification_events_user` (`company_id`, `user_company_id`),
  CONSTRAINT `fk_user_face_verification_events_session`
    FOREIGN KEY (`session_id`) REFERENCES `user_face_verification_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_events_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_events_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_face_verification_events_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_records` (
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
  `actions_taken` text DEFAULT NULL,
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
  UNIQUE KEY `uq_user_records_company_number` (`company_id`, `record_number`),
  KEY `idx_user_records_company_user` (`company_id`, `user_company_id`),
  KEY `idx_user_records_company_status` (`company_id`, `status`),
  KEY `idx_user_records_company_type` (`company_id`, `record_type`),
  KEY `idx_user_records_company_event_date` (`company_id`, `event_date`),
  KEY `idx_user_records_company_deleted` (`company_id`, `deleted_at`),
  CONSTRAINT `fk_user_records_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_records_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_records_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_records_reported_by_user`
    FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_records_reported_by_user_company`
    FOREIGN KEY (`reported_by_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_records_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_records_updated_by_user`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_record_witnesses` (
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
  CONSTRAINT `fk_user_record_witnesses_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_witnesses_record`
    FOREIGN KEY (`record_id`) REFERENCES `user_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_witnesses_user_company`
    FOREIGN KEY (`witness_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_record_witnesses_user`
    FOREIGN KEY (`witness_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_record_attachments` (
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
  UNIQUE KEY `uq_user_record_attachments_object_key` (`company_id`, `object_key`),
  KEY `idx_user_record_attachments_record` (`record_id`),
  KEY `idx_user_record_attachments_company_deleted` (`company_id`, `deleted_at`),
  CONSTRAINT `fk_user_record_attachments_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_attachments_record`
    FOREIGN KEY (`record_id`) REFERENCES `user_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_attachments_uploaded_by_user`
    FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_record_activity` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `record_id` bigint NOT NULL,
  `activity_type` varchar(32) NOT NULL,
  `from_status` varchar(16) DEFAULT NULL,
  `to_status` varchar(16) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `actor_user_id` bigint NOT NULL,
  `actor_name_snapshot` varchar(160) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_record_activity_record` (`record_id`),
  KEY `idx_user_record_activity_company` (`company_id`),
  CONSTRAINT `fk_user_record_activity_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_activity_record`
    FOREIGN KEY (`record_id`) REFERENCES `user_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_record_activity_actor_user`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_assets` (
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
  UNIQUE KEY `uk_user_assets_company_asset_code` (`company_id`, `asset_code`),
  UNIQUE KEY `uk_user_assets_company_serial_number` (`company_id`, `serial_number`),
  KEY `idx_user_assets_company_status` (`company_id`, `status`),
  KEY `idx_user_assets_company_responsible` (`company_id`, `responsible_user_company_id`),
  KEY `idx_user_assets_company_unit` (`company_id`, `unit_id`),
  KEY `idx_user_assets_company_type` (`company_id`, `asset_type`),
  KEY `idx_user_assets_company_updated_at` (`company_id`, `updated_at`),
  CONSTRAINT `fk_user_assets_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_assets_responsible_user_company`
    FOREIGN KEY (`responsible_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_responsible_user`
    FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_assets_updated_by_user`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_user_assets_status`
    CHECK (`status` IN ('available', 'assigned', 'maintenance', 'custody', 'inactive')),
  CONSTRAINT `chk_user_assets_value_amount`
    CHECK (`value_amount` IS NULL OR `value_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_asset_assignments` (
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
  KEY `idx_user_asset_assignments_asset_started` (`company_id`, `asset_id`, `started_at`),
  KEY `idx_user_asset_assignments_asset_ended` (`asset_id`, `ended_at`),
  KEY `idx_user_asset_assignments_user_started` (`company_id`, `responsible_user_company_id`, `started_at`),
  CONSTRAINT `fk_user_asset_assignments_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_asset_assignments_asset`
    FOREIGN KEY (`asset_id`) REFERENCES `user_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_asset_assignments_responsible_user_company`
    FOREIGN KEY (`responsible_user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_responsible_user`
    FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_asset_assignments_ended_by_user`
    FOREIGN KEY (`ended_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_user_asset_assignments_status`
    CHECK (`assignment_status` IN ('assigned', 'custody'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_asset_status_history` (
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
  KEY `idx_user_asset_status_history_asset_changed` (`company_id`, `asset_id`, `changed_at`),
  KEY `idx_user_asset_status_history_to_status_changed` (`company_id`, `to_status`, `changed_at`),
  CONSTRAINT `fk_user_asset_status_history_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_asset_status_history_asset`
    FOREIGN KEY (`asset_id`) REFERENCES `user_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_asset_status_history_changed_by_user`
    FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_user_asset_status_history_from_status`
    CHECK (`from_status` IS NULL OR `from_status` IN ('available', 'assigned', 'maintenance', 'custody', 'inactive')),
  CONSTRAINT `chk_user_asset_status_history_to_status`
    CHECK (`to_status` IN ('available', 'assigned', 'maintenance', 'custody', 'inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payroll_preferences` (
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
  CONSTRAINT `fk_payroll_preferences_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payroll_runs` (
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
  KEY `idx_payroll_runs_company_period` (`company_id`, `period_start_date`, `period_end_date`),
  KEY `idx_payroll_runs_company_status` (`company_id`, `status`),
  CONSTRAINT `fk_payroll_runs_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payroll_run_lines` (
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
  UNIQUE KEY `uq_payroll_run_lines_run_user` (`run_id`, `user_company_id`),
  KEY `idx_payroll_run_lines_company` (`company_id`),
  KEY `idx_payroll_run_lines_user` (`company_id`, `user_id`),
  CONSTRAINT `fk_payroll_run_lines_run`
    FOREIGN KEY (`run_id`) REFERENCES `payroll_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_run_lines_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_run_lines_user_company`
    FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_run_lines_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payroll_run_line_items` (
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
  CONSTRAINT `fk_payroll_run_line_items_line`
    FOREIGN KEY (`run_line_id`) REFERENCES `payroll_run_lines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `user_number_sequences` (`company_id`, `prefix`, `padding`, `next_number`)
SELECT `company_id`, 'USR', `padding`, `next_number`
FROM `hr_employee_number_sequences`
ON DUPLICATE KEY UPDATE
  `padding` = VALUES(`padding`),
  `next_number` = GREATEST(`user_number_sequences`.`next_number`, VALUES(`next_number`));

INSERT INTO `user_work_profiles`
(`company_id`, `user_company_id`, `user_id`, `user_code`, `position`, `department`, `unit_id`, `business_id`,
 `hire_date`, `salary`, `pay_period`, `salary_type`, `hourly_rate`, `contract_type`, `contract_start_date`,
 `contract_end_date`, `termination_date`, `last_working_day`, `termination_reason_type`, `termination_reason_code`,
 `termination_summary`, `date_of_birth`, `address`, `national_id`, `tax_id`, `social_security_number`,
 `registration_country`, `state_province`, `city`, `postal_code`, `alternate_phone`, `emergency_contact_name`,
 `emergency_contact_relationship`, `emergency_contact_phone`, `workday_hours`, `status`, `created_by`, `created_at`, `updated_at`)
SELECT e.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       e.`employee_number`,
       e.`position`,
       e.`department`,
       e.`unit_id`,
       e.`business_id`,
       e.`hire_date`,
       e.`salary`,
       COALESCE(NULLIF(e.`pay_period`, ''), 'weekly'),
       COALESCE(NULLIF(e.`salary_type`, ''), 'daily'),
       e.`hourly_rate`,
       COALESCE(NULLIF(e.`contract_type`, ''), 'permanent'),
       e.`contract_start_date`,
       e.`contract_end_date`,
       e.`termination_date`,
       e.`last_working_day`,
       e.`termination_reason_type`,
       e.`termination_reason_code`,
       e.`termination_summary`,
       p.`date_of_birth`,
       p.`address`,
       p.`national_id`,
       p.`tax_id`,
       p.`social_security_number`,
       p.`registration_country`,
       p.`state_province`,
       p.`city`,
       p.`postal_code`,
       p.`alternate_phone`,
       p.`emergency_contact_name`,
       p.`emergency_contact_relationship`,
       p.`emergency_contact_phone`,
       COALESCE(p.`workday_hours`, 8.00),
       COALESCE(NULLIF(e.`status`, ''), 'active'),
       e.`created_by`,
       e.`created_at`,
       e.`updated_at`
FROM `hr_employees` e
LEFT JOIN `hr_employee_profiles` p
  ON p.`company_id` = e.`company_id`
 AND p.`employee_id` = e.`id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_id` = VALUES(`user_id`),
  `user_code` = VALUES(`user_code`),
  `position` = VALUES(`position`),
  `department` = VALUES(`department`),
  `unit_id` = VALUES(`unit_id`),
  `business_id` = VALUES(`business_id`),
  `hire_date` = VALUES(`hire_date`),
  `salary` = VALUES(`salary`),
  `pay_period` = VALUES(`pay_period`),
  `salary_type` = VALUES(`salary_type`),
  `hourly_rate` = VALUES(`hourly_rate`),
  `contract_type` = VALUES(`contract_type`),
  `contract_start_date` = VALUES(`contract_start_date`),
  `contract_end_date` = VALUES(`contract_end_date`),
  `termination_date` = VALUES(`termination_date`),
  `last_working_day` = VALUES(`last_working_day`),
  `termination_reason_type` = VALUES(`termination_reason_type`),
  `termination_reason_code` = VALUES(`termination_reason_code`),
  `termination_summary` = VALUES(`termination_summary`),
  `date_of_birth` = VALUES(`date_of_birth`),
  `address` = VALUES(`address`),
  `national_id` = VALUES(`national_id`),
  `tax_id` = VALUES(`tax_id`),
  `social_security_number` = VALUES(`social_security_number`),
  `registration_country` = VALUES(`registration_country`),
  `state_province` = VALUES(`state_province`),
  `city` = VALUES(`city`),
  `postal_code` = VALUES(`postal_code`),
  `alternate_phone` = VALUES(`alternate_phone`),
  `emergency_contact_name` = VALUES(`emergency_contact_name`),
  `emergency_contact_relationship` = VALUES(`emergency_contact_relationship`),
  `emergency_contact_phone` = VALUES(`emergency_contact_phone`),
  `workday_hours` = VALUES(`workday_hours`),
  `status` = VALUES(`status`);

INSERT INTO `attendance_locations`
(`id`, `company_id`, `unit_id`, `business_id`, `contract_start_date`, `contract_end_date`, `name`, `latitude`, `longitude`,
 `radius_meters`, `required_hours_per_day`, `required_start_time`, `required_end_time`, `required_days_per_week`, `status`,
 `managed_source`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `company_id`, `unit_id`, `business_id`, `contract_start_date`, `contract_end_date`, `name`, `latitude`, `longitude`,
       `radius_meters`, `required_hours_per_day`, `required_start_time`, `required_end_time`, `required_days_per_week`, `status`,
       `managed_source`, `created_by`, `created_at`, `updated_at`
FROM `hr_attendance_locations`
ON DUPLICATE KEY UPDATE
  `unit_id` = VALUES(`unit_id`),
  `business_id` = VALUES(`business_id`),
  `contract_start_date` = VALUES(`contract_start_date`),
  `contract_end_date` = VALUES(`contract_end_date`),
  `name` = VALUES(`name`),
  `latitude` = VALUES(`latitude`),
  `longitude` = VALUES(`longitude`),
  `radius_meters` = VALUES(`radius_meters`),
  `required_hours_per_day` = VALUES(`required_hours_per_day`),
  `required_start_time` = VALUES(`required_start_time`),
  `required_end_time` = VALUES(`required_end_time`),
  `required_days_per_week` = VALUES(`required_days_per_week`),
  `status` = VALUES(`status`),
  `managed_source` = VALUES(`managed_source`);

INSERT INTO `attendance_schedule_templates`
(`id`, `company_id`, `name`, `status`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `company_id`, `name`, `status`, `created_by`, `created_at`, `updated_at`
FROM `hr_schedule_templates`
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `status` = VALUES(`status`);

INSERT INTO `attendance_schedule_template_days`
(`id`, `template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`, `created_at`)
SELECT `id`, `template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`, `created_at`
FROM `hr_schedule_template_days`
ON DUPLICATE KEY UPDATE
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`),
  `late_after_minutes` = VALUES(`late_after_minutes`),
  `is_rest_day` = VALUES(`is_rest_day`);

INSERT INTO `attendance_kiosk_devices`
(`id`, `company_id`, `unit_id`, `business_id`, `location_id`, `code`, `name`, `status`, `public_access_token`,
 `metadata_json`, `created_by`, `created_at`, `updated_at`)
SELECT `id`, `company_id`, `unit_id`, `business_id`, `location_id`, `code`, `name`, `status`, `public_access_token`,
       `metadata_json`, `created_by`, `created_at`, `updated_at`
FROM `hr_kiosk_devices`
ON DUPLICATE KEY UPDATE
  `unit_id` = VALUES(`unit_id`),
  `business_id` = VALUES(`business_id`),
  `location_id` = VALUES(`location_id`),
  `code` = VALUES(`code`),
  `name` = VALUES(`name`),
  `status` = VALUES(`status`),
  `public_access_token` = VALUES(`public_access_token`),
  `metadata_json` = VALUES(`metadata_json`);

INSERT INTO `user_schedule_assignments`
(`id`, `company_id`, `user_company_id`, `user_id`, `template_id`, `effective_start_date`, `effective_end_date`, `status`, `created_by`, `created_at`, `updated_at`)
SELECT a.`id`,
       a.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       a.`template_id`,
       a.`effective_start_date`,
       a.`effective_end_date`,
       a.`status`,
       a.`created_by`,
       a.`created_at`,
       a.`updated_at`
FROM `hr_employee_schedule_assignments` a
JOIN `hr_employees` e
  ON e.`company_id` = a.`company_id`
 AND e.`id` = a.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `template_id` = VALUES(`template_id`),
  `effective_start_date` = VALUES(`effective_start_date`),
  `effective_end_date` = VALUES(`effective_end_date`),
  `status` = VALUES(`status`);

INSERT INTO `user_access_profiles`
(`id`, `company_id`, `user_company_id`, `user_id`, `status`, `default_method`, `last_enrolled_at`, `metadata_json`, `created_by`, `created_at`, `updated_at`)
SELECT p.`id`,
       p.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       p.`status`,
       p.`default_method`,
       p.`last_enrolled_at`,
       p.`metadata_json`,
       p.`created_by`,
       p.`created_at`,
       p.`updated_at`
FROM `hr_employee_access_profiles` p
JOIN `hr_employees` e
  ON e.`company_id` = p.`company_id`
 AND e.`id` = p.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `status` = VALUES(`status`),
  `default_method` = VALUES(`default_method`),
  `last_enrolled_at` = VALUES(`last_enrolled_at`),
  `metadata_json` = VALUES(`metadata_json`);

INSERT INTO `user_access_methods`
(`id`, `company_id`, `access_profile_id`, `method_type`, `credential_ref`, `secret_hash`, `status`, `priority`, `metadata_json`, `created_at`, `updated_at`)
SELECT m.`id`, m.`company_id`, m.`access_profile_id`, m.`method_type`, m.`credential_ref`, m.`secret_hash`, m.`status`,
       m.`priority`, m.`metadata_json`, m.`created_at`, m.`updated_at`
FROM `hr_employee_access_methods` m
JOIN `user_access_profiles` p
  ON p.`id` = m.`access_profile_id`
 AND p.`company_id` = m.`company_id`
ON DUPLICATE KEY UPDATE
  `access_profile_id` = VALUES(`access_profile_id`),
  `method_type` = VALUES(`method_type`),
  `credential_ref` = VALUES(`credential_ref`),
  `secret_hash` = VALUES(`secret_hash`),
  `status` = VALUES(`status`),
  `priority` = VALUES(`priority`),
  `metadata_json` = VALUES(`metadata_json`);

INSERT INTO `user_documents`
(`id`, `company_id`, `user_company_id`, `user_id`, `document_type`, `original_filename`, `mime_type`, `size_bytes`,
 `object_key`, `status`, `uploaded_by_user_id`, `created_at`, `updated_at`)
SELECT d.`id`,
       d.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       d.`document_type`,
       d.`original_filename`,
       d.`mime_type`,
       d.`size_bytes`,
       d.`object_key`,
       d.`status`,
       d.`uploaded_by_user_id`,
       d.`created_at`,
       d.`updated_at`
FROM `hr_employee_documents` d
JOIN `hr_employees` e
  ON e.`company_id` = d.`company_id`
 AND e.`id` = d.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `original_filename` = VALUES(`original_filename`),
  `mime_type` = VALUES(`mime_type`),
  `size_bytes` = VALUES(`size_bytes`),
  `object_key` = VALUES(`object_key`),
  `status` = VALUES(`status`);

INSERT INTO `user_attendance_events`
(`id`, `company_id`, `user_company_id`, `user_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`,
 `kiosk_device_id`, `latitude`, `longitude`, `photo_url`, `source`, `auth_method`, `result_status`, `event_kind`,
 `notes`, `metadata_json`, `supersedes_event_id`, `created_by`, `created_at`)
SELECT e.`id`,
       e.`company_id`,
       COALESCE(e.`user_company_id`, uc.`id`) AS `user_company_id`,
       e.`user_id`,
       e.`event_type`,
       e.`event_timestamp`,
       e.`attendance_date`,
       e.`location_id`,
       e.`kiosk_device_id`,
       e.`latitude`,
       e.`longitude`,
       e.`photo_url`,
       e.`source`,
       e.`auth_method`,
       e.`result_status`,
       e.`event_kind`,
       e.`notes`,
       e.`metadata_json`,
       NULL,
       e.`created_by`,
       e.`created_at`
FROM `hr_user_attendance_events` e
LEFT JOIN `user_companies` uc
  ON uc.`company_id` = e.`company_id`
 AND uc.`user_id` = e.`user_id`
WHERE COALESCE(e.`user_company_id`, uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `event_type` = VALUES(`event_type`),
  `event_timestamp` = VALUES(`event_timestamp`),
  `attendance_date` = VALUES(`attendance_date`),
  `location_id` = VALUES(`location_id`),
  `kiosk_device_id` = VALUES(`kiosk_device_id`),
  `latitude` = VALUES(`latitude`),
  `longitude` = VALUES(`longitude`),
  `photo_url` = VALUES(`photo_url`),
  `source` = VALUES(`source`),
  `auth_method` = VALUES(`auth_method`),
  `result_status` = VALUES(`result_status`),
  `event_kind` = VALUES(`event_kind`),
  `notes` = VALUES(`notes`),
  `metadata_json` = VALUES(`metadata_json`),
  `supersedes_event_id` = VALUES(`supersedes_event_id`);

UPDATE `user_attendance_events` user_event
JOIN `hr_user_attendance_events` old_event
  ON old_event.`id` = user_event.`id`
JOIN `user_attendance_events` superseded_event
  ON superseded_event.`id` = old_event.`supersedes_event_id`
SET user_event.`supersedes_event_id` = superseded_event.`id`
WHERE user_event.`supersedes_event_id` IS NULL
  AND old_event.`supersedes_event_id` IS NOT NULL;

INSERT INTO `user_attendance_daily_records`
(`id`, `company_id`, `user_company_id`, `user_id`, `attendance_date`, `system_status`, `corrected_status`, `corrected_by`,
 `corrected_at`, `first_check_in_at`, `last_check_out_at`, `first_location_id`, `last_location_id`, `minutes_late`,
 `notes`, `created_at`, `updated_at`)
SELECT r.`id`,
       r.`company_id`,
       COALESCE(r.`user_company_id`, uc.`id`) AS `user_company_id`,
       r.`user_id`,
       r.`attendance_date`,
       r.`system_status`,
       r.`corrected_status`,
       CASE WHEN corrected_user.`id` IS NULL THEN NULL ELSE r.`corrected_by` END,
       r.`corrected_at`,
       r.`first_check_in_at`,
       r.`last_check_out_at`,
       r.`first_location_id`,
       r.`last_location_id`,
       r.`minutes_late`,
       r.`notes`,
       r.`created_at`,
       r.`updated_at`
FROM `hr_user_attendance_daily_records` r
LEFT JOIN `user_companies` uc
  ON uc.`company_id` = r.`company_id`
 AND uc.`user_id` = r.`user_id`
LEFT JOIN `users` corrected_user
  ON corrected_user.`id` = r.`corrected_by`
WHERE COALESCE(r.`user_company_id`, uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_id` = VALUES(`user_id`),
  `system_status` = VALUES(`system_status`),
  `corrected_status` = VALUES(`corrected_status`),
  `corrected_by` = VALUES(`corrected_by`),
  `corrected_at` = VALUES(`corrected_at`),
  `first_check_in_at` = VALUES(`first_check_in_at`),
  `last_check_out_at` = VALUES(`last_check_out_at`),
  `first_location_id` = VALUES(`first_location_id`),
  `last_location_id` = VALUES(`last_location_id`),
  `minutes_late` = VALUES(`minutes_late`),
  `notes` = VALUES(`notes`),
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `user_allowed_locations`
(`id`, `company_id`, `user_company_id`, `user_id`, `location_id`, `status`, `created_by`, `created_at`, `updated_at`)
SELECT a.`id`,
       a.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       a.`location_id`,
       a.`status`,
       a.`created_by`,
       a.`created_at`,
       a.`updated_at`
FROM `hr_employee_allowed_locations` a
JOIN `hr_employees` e
  ON e.`company_id` = a.`company_id`
 AND e.`id` = a.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `location_id` = VALUES(`location_id`),
  `status` = VALUES(`status`);

INSERT INTO `user_work_site_assignments`
(`id`, `company_id`, `user_company_id`, `user_id`, `location_id`, `effective_start_date`, `effective_end_date`, `status`, `created_by`, `created_at`, `updated_at`)
SELECT a.`id`,
       a.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       a.`location_id`,
       a.`effective_start_date`,
       a.`effective_end_date`,
       a.`status`,
       a.`created_by`,
       a.`created_at`,
       a.`updated_at`
FROM `hr_employee_work_site_assignments` a
JOIN `hr_employees` e
  ON e.`company_id` = a.`company_id`
 AND e.`id` = a.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `location_id` = VALUES(`location_id`),
  `effective_start_date` = VALUES(`effective_start_date`),
  `effective_end_date` = VALUES(`effective_end_date`),
  `status` = VALUES(`status`);

INSERT INTO `user_face_enrollments`
(`id`, `company_id`, `user_company_id`, `user_id`, `status`, `enrolled_at`, `deleted_at`, `created_by`, `created_at`, `updated_at`)
SELECT f.`id`,
       f.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       f.`status`,
       f.`enrolled_at`,
       f.`deleted_at`,
       f.`created_by`,
       f.`created_at`,
       f.`updated_at`
FROM `hr_face_enrollments` f
JOIN `hr_employees` e
  ON e.`company_id` = f.`company_id`
 AND e.`id` = f.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `status` = VALUES(`status`),
  `enrolled_at` = VALUES(`enrolled_at`),
  `deleted_at` = VALUES(`deleted_at`);

INSERT INTO `user_face_enrollment_captures`
(`id`, `enrollment_id`, `capture_step`, `object_key`, `embedding_json`, `capture_metadata_json`, `status`, `processed_at`, `created_at`)
SELECT c.`id`, c.`enrollment_id`, c.`capture_step`, c.`object_key`, c.`embedding_json`, c.`capture_metadata_json`,
       c.`status`, c.`processed_at`, c.`created_at`
FROM `hr_face_enrollment_captures` c
JOIN `user_face_enrollments` e
  ON e.`id` = c.`enrollment_id`
ON DUPLICATE KEY UPDATE
  `object_key` = VALUES(`object_key`),
  `embedding_json` = VALUES(`embedding_json`),
  `capture_metadata_json` = VALUES(`capture_metadata_json`),
  `status` = VALUES(`status`),
  `processed_at` = VALUES(`processed_at`);

INSERT INTO `user_face_verification_sessions`
(`id`, `company_id`, `user_company_id`, `user_id`, `status`, `auth_method`, `challenge_sequence_json`, `liveness_result`,
 `verification_result`, `matched_score`, `failure_reason`, `created_by`, `expires_at`, `completed_at`, `consumed_at`, `created_at`, `updated_at`)
SELECT s.`id`,
       s.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       s.`status`,
       s.`auth_method`,
       s.`challenge_sequence_json`,
       s.`liveness_result`,
       s.`verification_result`,
       s.`matched_score`,
       s.`failure_reason`,
       s.`created_by`,
       s.`expires_at`,
       s.`completed_at`,
       s.`consumed_at`,
       s.`created_at`,
       s.`updated_at`
FROM `hr_face_verification_sessions` s
JOIN `hr_employees` e
  ON e.`company_id` = s.`company_id`
 AND e.`id` = s.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `status` = VALUES(`status`),
  `liveness_result` = VALUES(`liveness_result`),
  `verification_result` = VALUES(`verification_result`),
  `matched_score` = VALUES(`matched_score`),
  `failure_reason` = VALUES(`failure_reason`),
  `completed_at` = VALUES(`completed_at`),
  `consumed_at` = VALUES(`consumed_at`);

INSERT INTO `user_face_verification_events`
(`id`, `session_id`, `company_id`, `user_company_id`, `user_id`, `event_type`, `status`, `detail_json`, `created_at`)
SELECT ev.`id`, ev.`session_id`, ev.`company_id`, s.`user_company_id`, s.`user_id`, ev.`event_type`, ev.`status`,
       ev.`detail_json`, ev.`created_at`
FROM `hr_face_verification_events` ev
JOIN `user_face_verification_sessions` s
  ON s.`id` = ev.`session_id`
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `event_type` = VALUES(`event_type`),
  `status` = VALUES(`status`),
  `detail_json` = VALUES(`detail_json`);

INSERT INTO `user_records`
(`id`, `company_id`, `record_number`, `user_company_id`, `user_id`, `user_name_snapshot`, `user_position_snapshot`,
 `user_department_snapshot`, `user_unit_id_snapshot`, `user_unit_name_snapshot`, `user_business_id_snapshot`,
 `user_business_name_snapshot`, `record_type`, `severity`, `status`, `title`, `description`, `actions_taken`,
 `event_date`, `reported_by_user_id`, `reported_by_user_company_id`, `reported_by_name_snapshot`, `created_by_user_id`,
 `updated_by_user_id`, `created_at`, `updated_at`, `deleted_at`)
SELECT r.`id`,
       r.`company_id`,
       r.`record_number`,
       COALESCE(target_access_uc.`id`, target_email_uc.`id`) AS `user_company_id`,
       COALESCE(target_access_ref.`linked_user_id`, target_email_uc.`user_id`) AS `user_id`,
       r.`employee_name_snapshot`,
       r.`employee_position_snapshot`,
       r.`employee_department_snapshot`,
       r.`employee_unit_id_snapshot`,
       r.`employee_unit_name_snapshot`,
       r.`employee_business_id_snapshot`,
       r.`employee_business_name_snapshot`,
       r.`record_type`,
       r.`severity`,
       r.`status`,
       r.`title`,
       r.`description`,
       r.`actions_taken`,
       r.`event_date`,
       r.`reported_by_user_id`,
       reported_uc.`id`,
       r.`reported_by_name_snapshot`,
       r.`created_by_user_id`,
       r.`updated_by_user_id`,
       r.`created_at`,
       r.`updated_at`,
       r.`deleted_at`
FROM `hr_employee_records` r
JOIN `hr_employees` target_e
  ON target_e.`company_id` = r.`company_id`
 AND target_e.`id` = r.`employee_id`
LEFT JOIN `hr_employee_portal_access` target_access_ref
  ON target_access_ref.`company_id` = target_e.`company_id`
 AND target_access_ref.`employee_id` = target_e.`id`
LEFT JOIN `user_companies` target_access_uc
  ON target_access_uc.`company_id` = target_e.`company_id`
 AND target_access_uc.`user_id` = target_access_ref.`linked_user_id`
LEFT JOIN `users` target_email_user
  ON LOWER(target_email_user.`email`) = LOWER(target_e.`email`)
LEFT JOIN `user_companies` target_email_uc
  ON target_email_uc.`company_id` = target_e.`company_id`
 AND target_email_uc.`user_id` = target_email_user.`id`
LEFT JOIN `hr_employee_portal_access` reported_access_ref
  ON reported_access_ref.`company_id` = r.`company_id`
 AND reported_access_ref.`employee_id` = r.`reported_by_employee_id`
LEFT JOIN `user_companies` reported_uc
  ON reported_uc.`company_id` = r.`company_id`
 AND reported_uc.`user_id` = COALESCE(reported_access_ref.`linked_user_id`, r.`reported_by_user_id`)
WHERE COALESCE(target_access_uc.`id`, target_email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `status` = VALUES(`status`),
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `actions_taken` = VALUES(`actions_taken`),
  `reported_by_user_company_id` = VALUES(`reported_by_user_company_id`),
  `updated_at` = VALUES(`updated_at`),
  `deleted_at` = VALUES(`deleted_at`);

INSERT INTO `user_record_witnesses`
(`id`, `company_id`, `record_id`, `witness_user_company_id`, `witness_user_id`, `witness_name_snapshot`, `created_at`)
SELECT w.`id`,
       w.`company_id`,
       w.`record_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `witness_user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `witness_user_id`,
       w.`witness_name_snapshot`,
       w.`created_at`
FROM `hr_employee_record_witnesses` w
JOIN `user_records` r
  ON r.`id` = w.`record_id`
LEFT JOIN `hr_employees` e
  ON e.`company_id` = w.`company_id`
 AND e.`id` = w.`witness_employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
ON DUPLICATE KEY UPDATE
  `witness_user_company_id` = VALUES(`witness_user_company_id`),
  `witness_user_id` = VALUES(`witness_user_id`),
  `witness_name_snapshot` = VALUES(`witness_name_snapshot`);

INSERT INTO `user_record_attachments`
(`id`, `company_id`, `record_id`, `original_filename`, `mime_type`, `size_bytes`, `object_key`, `uploaded_by_user_id`, `created_at`, `deleted_at`)
SELECT a.`id`, a.`company_id`, a.`record_id`, a.`original_filename`, a.`mime_type`, a.`size_bytes`, a.`object_key`,
       a.`uploaded_by_user_id`, a.`created_at`, a.`deleted_at`
FROM `hr_employee_record_attachments` a
JOIN `user_records` r
  ON r.`id` = a.`record_id`
ON DUPLICATE KEY UPDATE
  `original_filename` = VALUES(`original_filename`),
  `mime_type` = VALUES(`mime_type`),
  `size_bytes` = VALUES(`size_bytes`),
  `object_key` = VALUES(`object_key`),
  `deleted_at` = VALUES(`deleted_at`);

INSERT INTO `user_record_activity`
(`id`, `company_id`, `record_id`, `activity_type`, `from_status`, `to_status`, `note`, `actor_user_id`, `actor_name_snapshot`, `created_at`)
SELECT a.`id`, a.`company_id`, a.`record_id`, a.`activity_type`, a.`from_status`, a.`to_status`, a.`note`, a.`actor_user_id`,
       a.`actor_name_snapshot`, a.`created_at`
FROM `hr_employee_record_activity` a
JOIN `user_records` r
  ON r.`id` = a.`record_id`
ON DUPLICATE KEY UPDATE
  `activity_type` = VALUES(`activity_type`),
  `from_status` = VALUES(`from_status`),
  `to_status` = VALUES(`to_status`),
  `note` = VALUES(`note`);

INSERT INTO `user_assets`
(`id`, `company_id`, `asset_code`, `asset_type`, `name`, `model`, `serial_number`, `responsible_user_company_id`,
 `responsible_user_id`, `unit_id`, `status`, `assigned_at`, `value_amount`, `notes`, `created_by_user_id`, `updated_by_user_id`,
 `created_at`, `updated_at`)
SELECT a.`id`,
       a.`company_id`,
       a.`asset_code`,
       a.`asset_type`,
       a.`name`,
       a.`model`,
       a.`serial_number`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `responsible_user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `responsible_user_id`,
       a.`unit_id`,
       a.`status`,
       a.`assigned_at`,
       a.`value_amount`,
       a.`notes`,
       a.`created_by_user_id`,
       a.`updated_by_user_id`,
       a.`created_at`,
       a.`updated_at`
FROM `hr_assets` a
LEFT JOIN `hr_employees` e
  ON e.`company_id` = a.`company_id`
 AND e.`id` = a.`responsible_employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
ON DUPLICATE KEY UPDATE
  `asset_code` = VALUES(`asset_code`),
  `asset_type` = VALUES(`asset_type`),
  `name` = VALUES(`name`),
  `model` = VALUES(`model`),
  `serial_number` = VALUES(`serial_number`),
  `responsible_user_company_id` = VALUES(`responsible_user_company_id`),
  `responsible_user_id` = VALUES(`responsible_user_id`),
  `unit_id` = VALUES(`unit_id`),
  `status` = VALUES(`status`),
  `assigned_at` = VALUES(`assigned_at`),
  `value_amount` = VALUES(`value_amount`),
  `notes` = VALUES(`notes`);

INSERT INTO `user_asset_assignments`
(`id`, `company_id`, `asset_id`, `responsible_user_company_id`, `responsible_user_id`, `unit_id`, `assignment_status`,
 `started_at`, `ended_at`, `notes`, `created_by_user_id`, `ended_by_user_id`, `created_at`, `updated_at`)
SELECT a.`id`,
       a.`company_id`,
       a.`asset_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `responsible_user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `responsible_user_id`,
       a.`unit_id`,
       a.`assignment_status`,
       a.`started_at`,
       a.`ended_at`,
       a.`notes`,
       a.`created_by_user_id`,
       a.`ended_by_user_id`,
       a.`created_at`,
       a.`updated_at`
FROM `hr_asset_assignments` a
JOIN `user_assets` ua
  ON ua.`id` = a.`asset_id`
LEFT JOIN `hr_employees` e
  ON e.`company_id` = a.`company_id`
 AND e.`id` = a.`responsible_employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
ON DUPLICATE KEY UPDATE
  `responsible_user_company_id` = VALUES(`responsible_user_company_id`),
  `responsible_user_id` = VALUES(`responsible_user_id`),
  `unit_id` = VALUES(`unit_id`),
  `assignment_status` = VALUES(`assignment_status`),
  `started_at` = VALUES(`started_at`),
  `ended_at` = VALUES(`ended_at`),
  `notes` = VALUES(`notes`);

INSERT INTO `user_asset_status_history`
(`id`, `company_id`, `asset_id`, `from_status`, `to_status`, `change_reason`, `notes`, `changed_by_user_id`, `changed_at`, `created_at`)
SELECT h.`id`, h.`company_id`, h.`asset_id`, h.`from_status`, h.`to_status`, h.`change_reason`, h.`notes`,
       h.`changed_by_user_id`, h.`changed_at`, h.`created_at`
FROM `hr_asset_status_history` h
JOIN `user_assets` ua
  ON ua.`id` = h.`asset_id`
ON DUPLICATE KEY UPDATE
  `from_status` = VALUES(`from_status`),
  `to_status` = VALUES(`to_status`),
  `change_reason` = VALUES(`change_reason`),
  `notes` = VALUES(`notes`);

INSERT INTO `payroll_preferences`
(`id`, `company_id`, `grouping_mode`, `default_daily_hours`, `pay_leave_days`, `isr_rate`, `imss_user_rate`,
 `infonavit_user_rate`, `imss_employer_rate`, `infonavit_employer_rate`, `sar_employer_rate`, `created_at`, `updated_at`)
SELECT `id`, `company_id`, `grouping_mode`, `default_daily_hours`, `pay_leave_days`, `isr_rate`, `imss_employee_rate`,
       `infonavit_employee_rate`, `imss_employer_rate`, `infonavit_employer_rate`, `sar_employer_rate`, `created_at`, `updated_at`
FROM `hr_payroll_preferences`
ON DUPLICATE KEY UPDATE
  `grouping_mode` = VALUES(`grouping_mode`),
  `default_daily_hours` = VALUES(`default_daily_hours`),
  `pay_leave_days` = VALUES(`pay_leave_days`),
  `isr_rate` = VALUES(`isr_rate`),
  `imss_user_rate` = VALUES(`imss_user_rate`),
  `infonavit_user_rate` = VALUES(`infonavit_user_rate`),
  `imss_employer_rate` = VALUES(`imss_employer_rate`),
  `infonavit_employer_rate` = VALUES(`infonavit_employer_rate`),
  `sar_employer_rate` = VALUES(`sar_employer_rate`);

INSERT INTO `payroll_runs`
(`id`, `company_id`, `grouping_mode`, `grouping_key`, `grouping_label`, `pay_period`, `period_start_date`, `period_end_date`,
 `status`, `users_count`, `gross_amount`, `deductions_amount`, `employer_contributions_amount`, `net_amount`, `created_by`,
 `processed_by`, `processed_at`, `approved_by`, `approved_at`, `paid_by`, `paid_at`, `cancelled_by`, `cancelled_at`, `created_at`, `updated_at`)
SELECT `id`, `company_id`, `grouping_mode`, `grouping_key`, `grouping_label`, `pay_period`, `period_start_date`, `period_end_date`,
       `status`, `employees_count`, `gross_amount`, `deductions_amount`, `employer_contributions_amount`, `net_amount`, `created_by`,
       `processed_by`, `processed_at`, `approved_by`, `approved_at`, `paid_by`, `paid_at`, `cancelled_by`, `cancelled_at`, `created_at`, `updated_at`
FROM `hr_payroll_runs`
ON DUPLICATE KEY UPDATE
  `grouping_mode` = VALUES(`grouping_mode`),
  `grouping_key` = VALUES(`grouping_key`),
  `grouping_label` = VALUES(`grouping_label`),
  `pay_period` = VALUES(`pay_period`),
  `period_start_date` = VALUES(`period_start_date`),
  `period_end_date` = VALUES(`period_end_date`),
  `status` = VALUES(`status`),
  `users_count` = VALUES(`users_count`),
  `gross_amount` = VALUES(`gross_amount`),
  `deductions_amount` = VALUES(`deductions_amount`),
  `employer_contributions_amount` = VALUES(`employer_contributions_amount`),
  `net_amount` = VALUES(`net_amount`);

INSERT INTO `payroll_run_lines`
(`id`, `run_id`, `company_id`, `user_company_id`, `user_id`, `user_code_snapshot`, `user_name_snapshot`, `position_title_snapshot`,
 `department_snapshot`, `unit_id_snapshot`, `unit_name_snapshot`, `business_id_snapshot`, `business_name_snapshot`,
 `pay_period_snapshot`, `salary_type_snapshot`, `base_salary_amount`, `hourly_rate_amount`, `days_payable`, `leave_days`,
 `absence_days`, `rest_days`, `late_count`, `regular_hours`, `overtime_hours`, `include_in_fiscal`, `gross_amount`,
 `deductions_amount`, `employer_contributions_amount`, `net_amount`, `notes`, `created_at`, `updated_at`)
SELECT l.`id`,
       l.`run_id`,
       l.`company_id`,
       COALESCE(access_uc.`id`, email_uc.`id`) AS `user_company_id`,
       COALESCE(access_ref.`linked_user_id`, email_uc.`user_id`) AS `user_id`,
       l.`employee_number_snapshot`,
       l.`employee_name_snapshot`,
       l.`position_title_snapshot`,
       l.`department_snapshot`,
       l.`unit_id_snapshot`,
       l.`unit_name_snapshot`,
       l.`business_id_snapshot`,
       l.`business_name_snapshot`,
       l.`pay_period_snapshot`,
       l.`salary_type_snapshot`,
       l.`base_salary_amount`,
       l.`hourly_rate_amount`,
       l.`days_payable`,
       l.`leave_days`,
       l.`absence_days`,
       l.`rest_days`,
       l.`late_count`,
       l.`regular_hours`,
       l.`overtime_hours`,
       l.`include_in_fiscal`,
       l.`gross_amount`,
       l.`deductions_amount`,
       l.`employer_contributions_amount`,
       l.`net_amount`,
       l.`notes`,
       l.`created_at`,
       l.`updated_at`
FROM `hr_payroll_run_lines` l
JOIN `payroll_runs` run_ref
  ON run_ref.`id` = l.`run_id`
JOIN `hr_employees` e
  ON e.`company_id` = l.`company_id`
 AND e.`id` = l.`employee_id`
LEFT JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`id`
LEFT JOIN `user_companies` access_uc
  ON access_uc.`company_id` = e.`company_id`
 AND access_uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` email_user
  ON LOWER(email_user.`email`) = LOWER(e.`email`)
LEFT JOIN `user_companies` email_uc
  ON email_uc.`company_id` = e.`company_id`
 AND email_uc.`user_id` = email_user.`id`
WHERE COALESCE(access_uc.`id`, email_uc.`id`) IS NOT NULL
ON DUPLICATE KEY UPDATE
  `user_company_id` = VALUES(`user_company_id`),
  `user_id` = VALUES(`user_id`),
  `user_code_snapshot` = VALUES(`user_code_snapshot`),
  `user_name_snapshot` = VALUES(`user_name_snapshot`),
  `position_title_snapshot` = VALUES(`position_title_snapshot`),
  `department_snapshot` = VALUES(`department_snapshot`),
  `gross_amount` = VALUES(`gross_amount`),
  `deductions_amount` = VALUES(`deductions_amount`),
  `employer_contributions_amount` = VALUES(`employer_contributions_amount`),
  `net_amount` = VALUES(`net_amount`);

INSERT INTO `payroll_run_line_items`
(`id`, `run_line_id`, `code`, `category`, `label`, `amount`, `source_type`, `display_order`, `created_at`, `updated_at`)
SELECT i.`id`, i.`run_line_id`, i.`code`, i.`category`, i.`label`, i.`amount`, i.`source_type`, i.`display_order`,
       i.`created_at`, i.`updated_at`
FROM `hr_payroll_run_line_items` i
JOIN `payroll_run_lines` l
  ON l.`id` = i.`run_line_id`
ON DUPLICATE KEY UPDATE
  `code` = VALUES(`code`),
  `category` = VALUES(`category`),
  `label` = VALUES(`label`),
  `amount` = VALUES(`amount`),
  `source_type` = VALUES(`source_type`),
  `display_order` = VALUES(`display_order`);

SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND COLUMN_NAME = 'assigned_user_company_id'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN assigned_user_company_id BIGINT NULL AFTER assigned_user_id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND COLUMN_NAME = 'completed_by_user_company_id'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD COLUMN completed_by_user_company_id BIGINT NULL AFTER completed_by_user_id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'projects'
          AND COLUMN_NAME = 'owner_user_company_id'
    ),
    'SELECT 1',
    'ALTER TABLE projects ADD COLUMN owner_user_company_id BIGINT NULL AFTER owner_user_id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE process_tasks task
LEFT JOIN user_companies assigned_uc
  ON assigned_uc.company_id = task.company_id
 AND assigned_uc.user_id = task.assigned_user_id
LEFT JOIN hr_employee_portal_access assigned_access
  ON assigned_access.company_id = task.company_id
 AND assigned_access.employee_id = task.assigned_employee_id
LEFT JOIN user_companies assigned_legacy_uc
  ON assigned_legacy_uc.company_id = task.company_id
 AND assigned_legacy_uc.user_id = assigned_access.linked_user_id
LEFT JOIN user_companies completed_uc
  ON completed_uc.company_id = task.company_id
 AND completed_uc.user_id = task.completed_by_user_id
LEFT JOIN hr_employee_portal_access completed_access
  ON completed_access.company_id = task.company_id
 AND completed_access.employee_id = task.completed_by_employee_id
LEFT JOIN user_companies completed_legacy_uc
  ON completed_legacy_uc.company_id = task.company_id
 AND completed_legacy_uc.user_id = completed_access.linked_user_id
SET task.assigned_user_company_id = COALESCE(task.assigned_user_company_id, assigned_uc.id, assigned_legacy_uc.id),
    task.completed_by_user_company_id = COALESCE(task.completed_by_user_company_id, completed_uc.id, completed_legacy_uc.id)
WHERE task.assigned_user_company_id IS NULL
   OR task.completed_by_user_company_id IS NULL;

UPDATE projects project
LEFT JOIN user_companies owner_uc
  ON owner_uc.company_id = project.company_id
 AND owner_uc.user_id = project.owner_user_id
LEFT JOIN hr_employee_portal_access owner_access
  ON owner_access.company_id = project.company_id
 AND owner_access.employee_id = project.owner_employee_id
LEFT JOIN user_companies owner_legacy_uc
  ON owner_legacy_uc.company_id = project.company_id
 AND owner_legacy_uc.user_id = owner_access.linked_user_id
SET project.owner_user_company_id = COALESCE(project.owner_user_company_id, owner_uc.id, owner_legacy_uc.id)
WHERE project.owner_user_company_id IS NULL;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND INDEX_NAME = 'idx_process_tasks_assigned_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_assigned_user_company (assigned_user_company_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND INDEX_NAME = 'idx_process_tasks_completed_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_completed_user_company (completed_by_user_company_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'projects'
          AND INDEX_NAME = 'idx_projects_owner_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE projects ADD INDEX idx_projects_owner_user_company (owner_user_company_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND CONSTRAINT_NAME = 'fk_process_tasks_assigned_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD CONSTRAINT fk_process_tasks_assigned_user_company FOREIGN KEY (assigned_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND CONSTRAINT_NAME = 'fk_process_tasks_completed_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD CONSTRAINT fk_process_tasks_completed_user_company FOREIGN KEY (completed_by_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'projects'
          AND CONSTRAINT_NAME = 'fk_projects_owner_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE projects ADD CONSTRAINT fk_projects_owner_user_company FOREIGN KEY (owner_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
