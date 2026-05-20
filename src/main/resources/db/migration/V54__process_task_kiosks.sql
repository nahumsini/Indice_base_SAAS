CREATE TABLE IF NOT EXISTS `process_task_kiosks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `public_access_token` varchar(96) NOT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_process_task_kiosks_company_code` (`company_id`, `code`),
  UNIQUE KEY `uq_process_task_kiosks_public_token` (`public_access_token`),
  KEY `idx_process_task_kiosks_company_status` (`company_id`, `status`),
  KEY `idx_process_task_kiosks_unit` (`unit_id`),
  KEY `idx_process_task_kiosks_business` (`business_id`),
  KEY `idx_process_task_kiosks_created_by` (`created_by`),
  CONSTRAINT `fk_process_task_kiosks_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_process_task_kiosks_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_process_task_kiosks_business`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_process_task_kiosks_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
