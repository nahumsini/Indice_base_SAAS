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
