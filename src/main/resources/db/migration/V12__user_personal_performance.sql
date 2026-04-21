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
