CREATE TABLE IF NOT EXISTS `payroll_company_country_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `country_code` varchar(8) NOT NULL,
  `default_arl_class` decimal(5,2) DEFAULT NULL,
  `compensation_fund_code` varchar(40) DEFAULT NULL,
  `compensation_fund_name` varchar(180) DEFAULT NULL,
  `employer_health_exemption_applies` tinyint(1) DEFAULT NULL,
  `sena_applies` tinyint(1) DEFAULT NULL,
  `icbf_applies` tinyint(1) DEFAULT NULL,
  `ccf_applies` tinyint(1) DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_company_country_configs` (`company_id`, `country_code`),
  KEY `idx_payroll_company_country_configs_company` (`company_id`),
  CONSTRAINT `fk_payroll_company_country_configs_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payroll_employee_country_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `country_code` varchar(8) NOT NULL,
  `contributor_type` varchar(40) DEFAULT NULL,
  `contributor_subtype` varchar(40) DEFAULT NULL,
  `integral_salary` tinyint(1) NOT NULL DEFAULT '0',
  `arl_class` decimal(5,2) DEFAULT NULL,
  `eps_code` varchar(40) DEFAULT NULL,
  `eps_name` varchar(180) DEFAULT NULL,
  `afp_code` varchar(40) DEFAULT NULL,
  `afp_name` varchar(180) DEFAULT NULL,
  `compensation_fund_code` varchar(40) DEFAULT NULL,
  `compensation_fund_name` varchar(180) DEFAULT NULL,
  `employer_health_exemption_applies` tinyint(1) DEFAULT NULL,
  `sena_applies` tinyint(1) DEFAULT NULL,
  `icbf_applies` tinyint(1) DEFAULT NULL,
  `ccf_applies` tinyint(1) DEFAULT NULL,
  `withholding_procedure` varchar(30) NOT NULL DEFAULT 'procedure_1',
  `dependents_monthly_deduction` decimal(14,2) NOT NULL DEFAULT '0.00',
  `prepaid_medicine_monthly` decimal(14,2) NOT NULL DEFAULT '0.00',
  `housing_interest_monthly` decimal(14,2) NOT NULL DEFAULT '0.00',
  `voluntary_pension_monthly` decimal(14,2) NOT NULL DEFAULT '0.00',
  `afc_monthly` decimal(14,2) NOT NULL DEFAULT '0.00',
  `other_exempt_income_monthly` decimal(14,2) NOT NULL DEFAULT '0.00',
  `procedure_2_fixed_rate` decimal(10,8) NOT NULL DEFAULT '0.00000000',
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_employee_country_profiles` (`company_id`, `user_company_id`, `country_code`),
  KEY `idx_payroll_employee_country_profiles_company` (`company_id`, `country_code`),
  KEY `idx_payroll_employee_country_profiles_user` (`user_company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payroll_employee_country_novelties` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_company_id` bigint NOT NULL,
  `country_code` varchar(8) NOT NULL,
  `novelty_code` varchar(40) NOT NULL,
  `novelty_label` varchar(180) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `days` decimal(8,2) NOT NULL DEFAULT '0.00',
  `hours` decimal(8,2) NOT NULL DEFAULT '0.00',
  `paid` tinyint(1) NOT NULL DEFAULT '0',
  `affects_ibc` tinyint(1) NOT NULL DEFAULT '0',
  `ibc_impact_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `source` varchar(40) NOT NULL DEFAULT 'manual',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_employee_country_novelties_period` (`company_id`, `country_code`, `start_date`, `end_date`),
  KEY `idx_payroll_employee_country_novelties_user` (`user_company_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `payroll_rule_sets`
(`country_code`, `province_code`, `rule_code`, `rule_name`, `rule_category`, `effective_from`, `effective_to`, `version_label`, `source_name`, `source_url`)
VALUES
('CO', '', 'WITHHOLDING_TAX', 'Retención en la fuente laboral Colombia', 'income_tax', '2026-01-01', '2026-12-31', 'UVT 2026 / Artículo 383 Estatuto Tributario', 'DIAN / Departamento Administrativo de la Función Pública', 'https://www.dian.gov.co/normatividad/Normatividad/Resoluci%C3%B3n%20000238%20de%2015-12-2025.pdf');

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'uvt_value' AS parameter_key, 52374.00000000 AS parameter_value, 'money' AS value_type, 'COP' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'procedure_1_enabled', 1.00000000, 'boolean', NULL, 20 UNION ALL
  SELECT 'procedure_2_enabled', 0.00000000, 'boolean', NULL, 30 UNION ALL
  SELECT 'dependent_deduction_rate', 0.10000000, 'rate', NULL, 40 UNION ALL
  SELECT 'dependent_deduction_max_uvt', 32.00000000, 'uvt', 'UVT mensual', 50 UNION ALL
  SELECT 'prepaid_medicine_max_uvt', 16.00000000, 'uvt', 'UVT mensual', 60 UNION ALL
  SELECT 'exempt_income_general_cap_rate', 0.40000000, 'rate', NULL, 70 UNION ALL
  SELECT 'exempt_income_general_cap_uvt_monthly', 420.00000000, 'uvt', 'UVT mensual', 80 UNION ALL
  SELECT 'labor_exempt_income_rate', 0.25000000, 'rate', NULL, 90 UNION ALL
  SELECT 'labor_exempt_income_cap_uvt_monthly', 65.83333333, 'uvt', 'UVT mensual', 100
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'WITHHOLDING_TAX';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, fixed_amount, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.00000000 AS lower_limit, 95.00000000 AS upper_limit, 0.00000000 AS fixed_amount, 0.00000000 AS rate, 10 AS display_order UNION ALL
  SELECT 95.00000000, 150.00000000, 0.00000000, 0.19000000, 20 UNION ALL
  SELECT 150.00000000, 360.00000000, 10.00000000, 0.28000000, 30 UNION ALL
  SELECT 360.00000000, NULL, 69.00000000, 0.33000000, 40
) seeded_brackets
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'WITHHOLDING_TAX';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'integral_salary_minimum_smmlv' AS parameter_key, 13.00000000 AS parameter_value, 'factor' AS value_type, 'SMMLV' AS unit_label, 110 AS display_order UNION ALL
  SELECT 'integral_salary_ibc_factor', 0.70000000, 'factor', NULL, 120
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'SOCIAL_SECURITY';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'integral_salary_disables_cesantias' AS parameter_key, 1.00000000 AS parameter_value, 'boolean' AS value_type, NULL AS unit_label, 50 AS display_order UNION ALL
  SELECT 'integral_salary_disables_prima', 1.00000000, 'boolean', NULL, 60 UNION ALL
  SELECT 'integral_salary_vacation_base_factor', 0.70000000, 'factor', NULL, 70
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'LABOR_PROVISIONS';
