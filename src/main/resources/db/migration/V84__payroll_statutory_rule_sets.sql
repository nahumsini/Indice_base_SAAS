CREATE TABLE IF NOT EXISTS `payroll_rule_sets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `country_code` varchar(8) NOT NULL,
  `province_code` varchar(16) NOT NULL DEFAULT '',
  `rule_code` varchar(80) NOT NULL,
  `rule_name` varchar(180) NOT NULL,
  `rule_category` varchar(80) NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `version_label` varchar(80) NOT NULL,
  `source_name` varchar(220) DEFAULT NULL,
  `source_url` varchar(700) DEFAULT NULL,
  `is_official` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_rule_sets_version` (`country_code`, `province_code`, `rule_code`, `effective_from`, `version_label`),
  KEY `idx_payroll_rule_sets_lookup` (`country_code`, `province_code`, `rule_code`, `effective_from`, `effective_to`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payroll_rule_parameters` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rule_set_id` bigint NOT NULL,
  `parameter_key` varchar(100) NOT NULL,
  `parameter_value` decimal(20,8) NOT NULL,
  `value_type` varchar(40) NOT NULL DEFAULT 'decimal',
  `unit_label` varchar(60) DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_rule_parameters_key` (`rule_set_id`, `parameter_key`),
  CONSTRAINT `fk_payroll_rule_parameters_rule_set`
    FOREIGN KEY (`rule_set_id`) REFERENCES `payroll_rule_sets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payroll_rule_brackets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rule_set_id` bigint NOT NULL,
  `lower_limit` decimal(20,8) NOT NULL DEFAULT 0,
  `upper_limit` decimal(20,8) DEFAULT NULL,
  `fixed_amount` decimal(20,8) NOT NULL DEFAULT 0,
  `rate` decimal(20,8) NOT NULL DEFAULT 0,
  `constant_amount` decimal(20,8) NOT NULL DEFAULT 0,
  `display_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payroll_rule_brackets_order` (`rule_set_id`, `display_order`),
  CONSTRAINT `fk_payroll_rule_brackets_rule_set`
    FOREIGN KEY (`rule_set_id`) REFERENCES `payroll_rule_sets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `payroll_rule_sets`
(`country_code`, `province_code`, `rule_code`, `rule_name`, `rule_category`, `effective_from`, `effective_to`, `version_label`, `source_name`, `source_url`)
VALUES
('MX', '', 'ISR_MONTHLY', 'Tarifa mensual ISR sueldos y salarios', 'income_tax', '2026-01-01', '2026-12-31', 'SAT Anexo 8 RMF 2026', 'SAT Anexo 8 de la Resolución Miscelánea Fiscal para 2026', 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/anexos/Anexo-8-RMF-2026_DOF-28122025.pdf'),
('MX', '', 'UMA', 'Unidad de Medida y Actualización', 'index_value', '2025-02-01', '2026-01-31', 'INEGI UMA 2025', 'INEGI UMA', 'https://www.inegi.org.mx/temas/uma/'),
('MX', '', 'UMA', 'Unidad de Medida y Actualización', 'index_value', '2026-02-01', '2027-01-31', 'INEGI UMA 2026', 'INEGI UMA', 'https://www.inegi.org.mx/temas/uma/'),
('MX', '', 'SOCIAL_SECURITY', 'Cuotas obrero-patronales IMSS e INFONAVIT', 'social_security', '2026-01-01', '2026-12-31', 'LSS/INFONAVIT 2026 v1', 'Ley del Seguro Social / INFONAVIT', 'https://www.imss.gob.mx/sites/all/statics/pdf/leyes/LSS.pdf'),
('MX', '', 'RCV_EMPLOYER', 'Cuota patronal de cesantía en edad avanzada y vejez', 'social_security', '2026-01-01', '2026-12-31', 'RCV transición 2026', 'Ley del Seguro Social', 'https://www.imss.gob.mx/sites/all/statics/pdf/leyes/LSS.pdf'),
('CA', '', 'INCOME_TAX_FEDERAL', 'Federal income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', '', 'CPP', 'Canada Pension Plan', 'pension', '2026-01-01', '2026-12-31', 'CRA CPP 2026', 'CRA CPP contribution rates', 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html'),
('CA', 'QC', 'QPP', 'Québec Pension Plan', 'pension', '2026-01-01', '2026-12-31', 'Revenu Québec QPP 2026', 'Revenu Québec source deductions', 'https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/employers-principal-changes-for-2026/'),
('CA', '', 'EI', 'Employment Insurance', 'employment_insurance', '2026-01-01', '2026-12-31', 'CRA EI 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'QC', 'EI', 'Employment Insurance - Québec reduced rate', 'employment_insurance', '2026-01-01', '2026-12-31', 'CRA EI Québec 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'QC', 'QPIP', 'Québec Parental Insurance Plan', 'parental_insurance', '2026-01-01', '2026-12-31', 'Revenu Québec QPIP 2026', 'Revenu Québec source deductions', 'https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/employers-principal-changes-for-2026/'),
('CA', '', 'VACATION', 'Vacation accrual', 'employment_standard', '2026-01-01', '2026-12-31', 'Canada baseline 2026', 'Government of Canada labour standards', 'https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards/vacation.html');

INSERT IGNORE INTO `payroll_rule_sets`
(`country_code`, `province_code`, `rule_code`, `rule_name`, `rule_category`, `effective_from`, `effective_to`, `version_label`, `source_name`, `source_url`)
VALUES
('CA', 'AB', 'INCOME_TAX_PROVINCIAL', 'Alberta income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'BC', 'INCOME_TAX_PROVINCIAL', 'British Columbia income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'MB', 'INCOME_TAX_PROVINCIAL', 'Manitoba income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'NB', 'INCOME_TAX_PROVINCIAL', 'New Brunswick income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'NL', 'INCOME_TAX_PROVINCIAL', 'Newfoundland and Labrador income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'NS', 'INCOME_TAX_PROVINCIAL', 'Nova Scotia income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'NT', 'INCOME_TAX_PROVINCIAL', 'Northwest Territories income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'NU', 'INCOME_TAX_PROVINCIAL', 'Nunavut income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'ON', 'INCOME_TAX_PROVINCIAL', 'Ontario income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'PE', 'INCOME_TAX_PROVINCIAL', 'Prince Edward Island income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'QC', 'INCOME_TAX_PROVINCIAL', 'Québec income tax', 'income_tax', '2026-01-01', '2026-12-31', 'Revenu Québec 2026', 'Revenu Québec income tax rates', 'https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/'),
('CA', 'SK', 'INCOME_TAX_PROVINCIAL', 'Saskatchewan income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html'),
('CA', 'YT', 'INCOME_TAX_PROVINCIAL', 'Yukon income tax', 'income_tax', '2026-01-01', '2026-12-31', 'CRA T4127 2026', 'CRA Payroll Deductions Formulas T4127', 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, 'daily_value', 113.14000000, 'money', 'MXN', 10 FROM `payroll_rule_sets`
WHERE `country_code` = 'MX' AND `rule_code` = 'UMA' AND `version_label` = 'INEGI UMA 2025';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, 'daily_value', 117.31000000, 'money', 'MXN', 10 FROM `payroll_rule_sets`
WHERE `country_code` = 'MX' AND `rule_code` = 'UMA' AND `version_label` = 'INEGI UMA 2026';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'sdi_min_factor' AS parameter_key, 1.04931507 AS parameter_value, 'factor' AS value_type, NULL AS unit_label, 10 AS display_order UNION ALL
  SELECT 'employee_excess_over_3_uma_rate', 0.00400000, 'rate', NULL, 20 UNION ALL
  SELECT 'employee_fixed_period_rate', 0.00625000, 'rate', NULL, 30 UNION ALL
  SELECT 'employee_pensioners_rate', 0.01125000, 'rate', NULL, 40 UNION ALL
  SELECT 'employer_fixed_uma_rate', 0.20400000, 'rate', NULL, 50 UNION ALL
  SELECT 'employer_excess_over_3_uma_rate', 0.01100000, 'rate', NULL, 60 UNION ALL
  SELECT 'employer_cash_benefits_rate', 0.01750000, 'rate', NULL, 70 UNION ALL
  SELECT 'employer_risk_premium_rate', 0.01000000, 'rate', NULL, 80 UNION ALL
  SELECT 'employer_sar_rate', 0.02000000, 'rate', NULL, 90 UNION ALL
  SELECT 'employer_infonavit_rate', 0.05000000, 'rate', NULL, 100 UNION ALL
  SELECT 'employer_childcare_rate', 0.01000000, 'rate', NULL, 110 UNION ALL
  SELECT 'employer_state_payroll_tax_rate', 0.03000000, 'rate', NULL, 120
) seeded_parameters
WHERE `country_code` = 'MX' AND `rule_code` = 'SOCIAL_SECURITY';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'ympe' AS parameter_key, 74600.00000000 AS parameter_value, 'money' AS value_type, 'CAD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'yampe', 85000.00000000, 'money', 'CAD', 20 UNION ALL
  SELECT 'basic_exemption', 3500.00000000, 'money', 'CAD', 30 UNION ALL
  SELECT 'base_rate', 0.05950000, 'rate', NULL, 40 UNION ALL
  SELECT 'second_rate', 0.04000000, 'rate', NULL, 50
) seeded_parameters
WHERE `country_code` = 'CA' AND `rule_code` = 'CPP';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'ympe' AS parameter_key, 74600.00000000 AS parameter_value, 'money' AS value_type, 'CAD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'yampe', 85000.00000000, 'money', 'CAD', 20 UNION ALL
  SELECT 'basic_exemption', 3500.00000000, 'money', 'CAD', 30 UNION ALL
  SELECT 'base_rate', 0.06300000, 'rate', NULL, 40 UNION ALL
  SELECT 'second_rate', 0.04000000, 'rate', NULL, 50
) seeded_parameters
WHERE `country_code` = 'CA' AND `province_code` = 'QC' AND `rule_code` = 'QPP';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'max_insurable_earnings' AS parameter_key, 68900.00000000 AS parameter_value, 'money' AS value_type, 'CAD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'employee_rate', 0.01630000, 'rate', NULL, 20 UNION ALL
  SELECT 'employer_rate', 0.02282000, 'rate', NULL, 30
) seeded_parameters
WHERE `country_code` = 'CA' AND `province_code` = '' AND `rule_code` = 'EI';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'max_insurable_earnings' AS parameter_key, 68900.00000000 AS parameter_value, 'money' AS value_type, 'CAD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'employee_rate', 0.01300000, 'rate', NULL, 20 UNION ALL
  SELECT 'employer_rate', 0.01820000, 'rate', NULL, 30
) seeded_parameters
WHERE `country_code` = 'CA' AND `province_code` = 'QC' AND `rule_code` = 'EI';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'max_insurable_earnings' AS parameter_key, 103000.00000000 AS parameter_value, 'money' AS value_type, 'CAD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'employee_rate', 0.00430000, 'rate', NULL, 20 UNION ALL
  SELECT 'employer_rate', 0.00602000, 'rate', NULL, 30
) seeded_parameters
WHERE `country_code` = 'CA' AND `province_code` = 'QC' AND `rule_code` = 'QPIP';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, 'accrual_rate', 0.04000000, 'rate', NULL, 10 FROM `payroll_rule_sets`
WHERE `country_code` = 'CA' AND `province_code` = '' AND `rule_code` = 'VACATION';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, fixed_amount, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.01000000 AS lower_limit, 844.59000000 AS upper_limit, 0.00000000 AS fixed_amount, 0.01920000 AS rate, 10 AS display_order UNION ALL
  SELECT 844.60000000, 7168.51000000, 16.22000000, 0.06400000, 20 UNION ALL
  SELECT 7168.52000000, 12598.02000000, 420.95000000, 0.10880000, 30 UNION ALL
  SELECT 12598.03000000, 14644.64000000, 1011.68000000, 0.16000000, 40 UNION ALL
  SELECT 14644.65000000, 17533.64000000, 1339.14000000, 0.17920000, 50 UNION ALL
  SELECT 17533.65000000, 35362.83000000, 1856.84000000, 0.21360000, 60 UNION ALL
  SELECT 35362.84000000, 55736.68000000, 5665.16000000, 0.23520000, 70 UNION ALL
  SELECT 55736.69000000, 106410.50000000, 10457.09000000, 0.30000000, 80 UNION ALL
  SELECT 106410.51000000, 141880.66000000, 25659.23000000, 0.32000000, 90 UNION ALL
  SELECT 141880.67000000, 425641.99000000, 37009.69000000, 0.34000000, 100 UNION ALL
  SELECT 425642.00000000, NULL, 133488.54000000, 0.35000000, 110
) seeded_brackets
WHERE `country_code` = 'MX' AND `rule_code` = 'ISR_MONTHLY';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, 0, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.00000000 AS lower_limit, 1.00000000 AS upper_limit, 0.03150000 AS rate, 10 AS display_order UNION ALL
  SELECT 1.00000001, 1.50000000, 0.03676000, 20 UNION ALL
  SELECT 1.50000001, 2.00000000, 0.04851000, 30 UNION ALL
  SELECT 2.00000001, 2.50000000, 0.05556000, 40 UNION ALL
  SELECT 2.50000001, 3.00000000, 0.06026000, 50 UNION ALL
  SELECT 3.00000001, 3.50000000, 0.06361000, 60 UNION ALL
  SELECT 3.50000001, 4.00000000, 0.06613000, 70 UNION ALL
  SELECT 4.00000001, NULL, 0.07513000, 80
) seeded_brackets
WHERE `country_code` = 'MX' AND `rule_code` = 'RCV_EMPLOYER';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, 0, rate, constant_amount, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.00000000 AS lower_limit, 58523.00000000 AS upper_limit, 0.14000000 AS rate, 0.00000000 AS constant_amount, 10 AS display_order UNION ALL
  SELECT 58523.00000000, 117045.00000000, 0.20500000, 3804.00000000, 20 UNION ALL
  SELECT 117045.00000000, 181440.00000000, 0.26000000, 10241.00000000, 30 UNION ALL
  SELECT 181440.00000000, 258482.00000000, 0.29000000, 15685.00000000, 40 UNION ALL
  SELECT 258482.00000000, NULL, 0.33000000, 26024.00000000, 50
) seeded_brackets
WHERE `country_code` = 'CA' AND `province_code` = '' AND `rule_code` = 'INCOME_TAX_FEDERAL';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, 'basic_credit', 2303.28000000, 'money', 'CAD', 10 FROM `payroll_rule_sets`
WHERE `country_code` = 'CA' AND `province_code` = '' AND `rule_code` = 'INCOME_TAX_FEDERAL';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, 'quebec_abatement_rate', 0.16500000, 'rate', NULL, 20 FROM `payroll_rule_sets`
WHERE `country_code` = 'CA' AND `province_code` = '' AND `rule_code` = 'INCOME_TAX_FEDERAL';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, basic_credit, credit_value, 'money', 'CAD', 10
FROM `payroll_rule_sets`
JOIN (
  SELECT 'AB' AS province_code, 'basic_credit' AS basic_credit, 1821.52000000 AS credit_value UNION ALL
  SELECT 'BC', 'basic_credit', 668.73000000 UNION ALL
  SELECT 'MB', 'basic_credit', 1704.24000000 UNION ALL
  SELECT 'NB', 'basic_credit', 1284.42000000 UNION ALL
  SELECT 'NL', 'basic_credit', 973.36000000 UNION ALL
  SELECT 'NS', 'basic_credit', 1048.82000000 UNION ALL
  SELECT 'NT', 'basic_credit', 1073.68000000 UNION ALL
  SELECT 'NU', 'basic_credit', 786.36000000 UNION ALL
  SELECT 'ON', 'basic_credit', 655.94000000 UNION ALL
  SELECT 'PE', 'basic_credit', 1425.00000000 UNION ALL
  SELECT 'QC', 'basic_credit', 2653.28000000 UNION ALL
  SELECT 'SK', 'basic_credit', 2140.01000000 UNION ALL
  SELECT 'YT', 'basic_credit', 1052.93000000
) provincial_credits USING (`province_code`)
WHERE `country_code` = 'CA' AND `rule_code` = 'INCOME_TAX_PROVINCIAL';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, 0, rate, constant_amount, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'ON' AS province_code, 0.00000000 AS lower_limit, 53891.00000000 AS upper_limit, 0.05050000 AS rate, 0.00000000 AS constant_amount, 10 AS display_order UNION ALL
  SELECT 'ON', 53891.00000000, 107785.00000000, 0.09150000, 2210.00000000, 20 UNION ALL
  SELECT 'ON', 107785.00000000, 150000.00000000, 0.11160000, 4376.00000000, 30 UNION ALL
  SELECT 'ON', 150000.00000000, 220000.00000000, 0.12160000, 5876.00000000, 40 UNION ALL
  SELECT 'ON', 220000.00000000, NULL, 0.13160000, 8076.00000000, 50 UNION ALL
  SELECT 'QC', 0.00000000, 54345.00000000, 0.14000000, 0.00000000, 10 UNION ALL
  SELECT 'QC', 54345.00000000, 108680.00000000, 0.19000000, 2717.25000000, 20 UNION ALL
  SELECT 'QC', 108680.00000000, 132245.00000000, 0.24000000, 8151.25000000, 30 UNION ALL
  SELECT 'QC', 132245.00000000, NULL, 0.25750000, 10465.53750000, 40 UNION ALL
  SELECT 'AB', 0.00000000, 61200.00000000, 0.08000000, 0.00000000, 10 UNION ALL
  SELECT 'AB', 61200.00000000, 154259.00000000, 0.10000000, 1224.00000000, 20 UNION ALL
  SELECT 'AB', 154259.00000000, 185111.00000000, 0.12000000, 4309.00000000, 30 UNION ALL
  SELECT 'AB', 185111.00000000, 246813.00000000, 0.13000000, 6160.00000000, 40 UNION ALL
  SELECT 'AB', 246813.00000000, 370220.00000000, 0.14000000, 8628.00000000, 50 UNION ALL
  SELECT 'AB', 370220.00000000, NULL, 0.15000000, 12331.00000000, 60 UNION ALL
  SELECT 'BC', 0.00000000, 50363.00000000, 0.05060000, 0.00000000, 10 UNION ALL
  SELECT 'BC', 50363.00000000, 100728.00000000, 0.07700000, 1330.00000000, 20 UNION ALL
  SELECT 'BC', 100728.00000000, 115648.00000000, 0.10500000, 4150.00000000, 30 UNION ALL
  SELECT 'BC', 115648.00000000, 140430.00000000, 0.12290000, 6220.00000000, 40 UNION ALL
  SELECT 'BC', 140430.00000000, 190405.00000000, 0.14700000, 9604.00000000, 50 UNION ALL
  SELECT 'BC', 190405.00000000, 265545.00000000, 0.16800000, 13603.00000000, 60 UNION ALL
  SELECT 'BC', 265545.00000000, NULL, 0.20500000, 23428.00000000, 70
) seeded_brackets USING (`province_code`)
WHERE `country_code` = 'CA' AND `rule_code` = 'INCOME_TAX_PROVINCIAL';
