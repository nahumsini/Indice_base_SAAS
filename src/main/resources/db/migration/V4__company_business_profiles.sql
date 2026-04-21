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
