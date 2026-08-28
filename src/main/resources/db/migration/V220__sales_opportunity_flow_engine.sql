CREATE TABLE IF NOT EXISTS `sales_opportunity_flow_stages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `stage_key` VARCHAR(64) NOT NULL,
  `label` VARCHAR(80) NOT NULL,
  `stage_type` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  `color_token` VARCHAR(24) NOT NULL DEFAULT 'SLATE',
  `default_probability_percent` INT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by_user_id` BIGINT DEFAULT NULL,
  `updated_by_user_id` BIGINT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_opportunity_flow_company_key` (`company_id`, `stage_key`),
  KEY `idx_sales_opportunity_flow_company_active_order` (`company_id`, `is_active`, `sort_order`, `id`),
  CONSTRAINT `fk_sales_opportunity_flow_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_flow_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_opportunity_flow_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_opportunity_flow_revisions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `snapshot_json` JSON NOT NULL,
  `created_by_user_id` BIGINT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_opportunity_flow_revision_company_created` (`company_id`, `created_at`, `id`),
  CONSTRAINT `fk_sales_opportunity_flow_revision_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_flow_revision_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
