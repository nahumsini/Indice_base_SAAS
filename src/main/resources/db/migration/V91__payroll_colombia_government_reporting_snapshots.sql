CREATE TABLE IF NOT EXISTS `payroll_government_reporting_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_id` bigint DEFAULT NULL,
  `run_line_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `country_code` varchar(8) NOT NULL,
  `report_type` varchar(40) NOT NULL,
  `report_period_start` date NOT NULL,
  `report_period_end` date NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'draft_internal',
  `payload_hash` varchar(128) DEFAULT NULL,
  `payload_json` json NOT NULL,
  `validation_json` json NOT NULL,
  `response_json` json DEFAULT NULL,
  `generated_by_source` varchar(120) DEFAULT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_government_reporting_line_type` (`run_line_id`, `report_type`),
  KEY `idx_payroll_government_reporting_run` (`run_id`, `country_code`, `report_type`),
  KEY `idx_payroll_government_reporting_company_period` (`company_id`, `country_code`, `report_period_start`, `report_period_end`),
  CONSTRAINT `fk_payroll_government_reporting_run`
    FOREIGN KEY (`run_id`) REFERENCES `payroll_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_government_reporting_line`
    FOREIGN KEY (`run_line_id`) REFERENCES `payroll_run_lines` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payroll_government_reporting_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
