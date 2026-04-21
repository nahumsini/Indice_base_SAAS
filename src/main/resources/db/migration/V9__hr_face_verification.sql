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
