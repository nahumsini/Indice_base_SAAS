INSERT IGNORE INTO `payroll_rule_sets`
(`country_code`, `province_code`, `rule_code`, `rule_name`, `rule_category`, `effective_from`, `effective_to`, `version_label`, `source_name`, `source_url`)
VALUES
('US', '', 'INCOME_TAX_FEDERAL_SINGLE', 'Federal income tax withholding - single standard', 'income_tax', '2026-01-01', '2026-12-31', 'IRS Publication 15-T 2026', 'IRS Publication 15-T Federal Income Tax Withholding Methods', 'https://www.irs.gov/pub/irs-pdf/p15t.pdf'),
('US', '', 'FICA', 'Social Security and Medicare', 'fica', '2026-01-01', '2026-12-31', 'IRS/SSA 2026', 'IRS Publication 15 / Social Security Administration contribution and benefit base', 'https://www.irs.gov/publications/p15'),
('US', '', 'FUTA', 'Federal Unemployment Tax Act', 'unemployment', '2026-01-01', '2026-12-31', 'IRS Publication 15 2026', 'IRS Publication 15 Employer Tax Guide', 'https://www.irs.gov/publications/p15'),
('US', '', 'BENEFIT_LIMITS', 'Retirement and health benefit limits', 'benefits', '2026-01-01', '2026-12-31', 'IRS 2026 benefit limits', 'IRS retirement plan and health benefit limit releases', 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500'),
('US', 'CA', 'STATE_PAYROLL', 'California payroll taxes', 'state_payroll', '2026-01-01', '2026-12-31', 'California EDD 2026', 'California Employment Development Department payroll tax rates', 'https://edd.ca.gov/en/payroll_taxes/rates_and_withholding/'),
('US', 'NY', 'STATE_PAYROLL', 'New York payroll taxes', 'state_payroll', '2026-01-01', '2026-12-31', 'New York 2026', 'New York Department of Labor / Paid Family Leave', 'https://paidfamilyleave.ny.gov/2026'),
('US', 'WA', 'STATE_PAYROLL', 'Washington payroll taxes', 'state_payroll', '2026-01-01', '2026-12-31', 'Washington ESD 2026', 'Washington Employment Security Department PFML and UI', 'https://paidleave.wa.gov/updates/');

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'social_security_wage_base' AS parameter_key, 184500.00000000 AS parameter_value, 'money' AS value_type, 'USD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'social_security_employee_rate', 0.06200000, 'rate', NULL, 20 UNION ALL
  SELECT 'social_security_employer_rate', 0.06200000, 'rate', NULL, 30 UNION ALL
  SELECT 'medicare_employee_rate', 0.01450000, 'rate', NULL, 40 UNION ALL
  SELECT 'medicare_employer_rate', 0.01450000, 'rate', NULL, 50 UNION ALL
  SELECT 'additional_medicare_threshold', 200000.00000000, 'money', 'USD', 60 UNION ALL
  SELECT 'additional_medicare_employee_rate', 0.00900000, 'rate', NULL, 70
) seeded_parameters
WHERE `country_code` = 'US' AND `province_code` = '' AND `rule_code` = 'FICA';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'wage_base' AS parameter_key, 7000.00000000 AS parameter_value, 'money' AS value_type, 'USD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'gross_rate', 0.06000000, 'rate', NULL, 20 UNION ALL
  SELECT 'maximum_state_credit_rate', 0.05400000, 'rate', NULL, 30 UNION ALL
  SELECT 'effective_rate', 0.00600000, 'rate', NULL, 40
) seeded_parameters
WHERE `country_code` = 'US' AND `province_code` = '' AND `rule_code` = 'FUTA';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT '401k_elective_deferral_limit' AS parameter_key, 24500.00000000 AS parameter_value, 'money' AS value_type, 'USD' AS unit_label, 10 AS display_order UNION ALL
  SELECT '401k_catch_up_50_limit', 8000.00000000, 'money', 'USD', 20 UNION ALL
  SELECT 'hsa_self_only_limit', 4400.00000000, 'money', 'USD', 30 UNION ALL
  SELECT 'hsa_family_limit', 8750.00000000, 'money', 'USD', 40 UNION ALL
  SELECT 'health_fsa_salary_reduction_limit', 3400.00000000, 'money', 'USD', 50 UNION ALL
  SELECT 'health_fsa_carryover_limit', 680.00000000, 'money', 'USD', 60
) seeded_parameters
WHERE `country_code` = 'US' AND `province_code` = '' AND `rule_code` = 'BENEFIT_LIMITS';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, fixed_amount, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.00000000 AS lower_limit, 7500.00000000 AS upper_limit, 0.00000000 AS fixed_amount, 0.00000000 AS rate, 10 AS display_order UNION ALL
  SELECT 7500.00000000, 19900.00000000, 0.00000000, 0.10000000, 20 UNION ALL
  SELECT 19900.00000000, 57900.00000000, 1240.00000000, 0.12000000, 30 UNION ALL
  SELECT 57900.00000000, 113200.00000000, 5800.00000000, 0.22000000, 40 UNION ALL
  SELECT 113200.00000000, 209275.00000000, 17966.00000000, 0.24000000, 50 UNION ALL
  SELECT 209275.00000000, 263725.00000000, 41024.00000000, 0.32000000, 60 UNION ALL
  SELECT 263725.00000000, 648100.00000000, 58448.00000000, 0.35000000, 70 UNION ALL
  SELECT 648100.00000000, NULL, 192979.25000000, 0.37000000, 80
) seeded_brackets
WHERE `country_code` = 'US' AND `province_code` = '' AND `rule_code` = 'INCOME_TAX_FEDERAL_SINGLE';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'CA' AS province_code, 'suta_wage_base' AS parameter_key, 7000.00000000 AS parameter_value, 'money' AS value_type, 'USD' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'CA', 'suta_default_rate', 0.03400000, 'rate', NULL, 20 UNION ALL
  SELECT 'CA', 'suta_min_rate', 0.01500000, 'rate', NULL, 30 UNION ALL
  SELECT 'CA', 'suta_max_rate', 0.06200000, 'rate', NULL, 40 UNION ALL
  SELECT 'CA', 'employee_sdi_rate', 0.01300000, 'rate', NULL, 50 UNION ALL
  SELECT 'CA', 'employee_sdi_wage_base', 0.00000000, 'money', 'USD', 60 UNION ALL
  SELECT 'CA', 'employer_training_tax_rate', 0.00100000, 'rate', NULL, 70 UNION ALL
  SELECT 'CA', 'employer_training_tax_wage_base', 7000.00000000, 'money', 'USD', 80 UNION ALL
  SELECT 'CA', 'state_income_withholding_rate', 0.00000000, 'rate', NULL, 90 UNION ALL
  SELECT 'NY', 'suta_wage_base', 17600.00000000, 'money', 'USD', 10 UNION ALL
  SELECT 'NY', 'suta_default_rate', 0.04100000, 'rate', NULL, 20 UNION ALL
  SELECT 'NY', 'suta_normal_new_employer_rate', 0.04025000, 'rate', NULL, 30 UNION ALL
  SELECT 'NY', 'reemployment_services_fund_rate', 0.00075000, 'rate', NULL, 40 UNION ALL
  SELECT 'NY', 'employee_paid_leave_rate', 0.00432000, 'rate', NULL, 50 UNION ALL
  SELECT 'NY', 'employee_paid_leave_wage_base', 95348.76000000, 'money', 'USD', 60 UNION ALL
  SELECT 'NY', 'employee_paid_leave_annual_cap', 411.91000000, 'money', 'USD', 70 UNION ALL
  SELECT 'NY', 'supplemental_state_withholding_rate', 0.11700000, 'rate', NULL, 80 UNION ALL
  SELECT 'NY', 'nyc_supplemental_withholding_rate', 0.04250000, 'rate', NULL, 90 UNION ALL
  SELECT 'NY', 'state_income_withholding_rate', 0.00000000, 'rate', NULL, 100 UNION ALL
  SELECT 'WA', 'suta_wage_base', 78200.00000000, 'money', 'USD', 10 UNION ALL
  SELECT 'WA', 'suta_default_rate', 0.00000000, 'rate', NULL, 20 UNION ALL
  SELECT 'WA', 'employee_pfml_rate', 0.00807159, 'rate', NULL, 30 UNION ALL
  SELECT 'WA', 'employer_pfml_rate', 0.00322841, 'rate', NULL, 40 UNION ALL
  SELECT 'WA', 'employee_pfml_wage_base', 184500.00000000, 'money', 'USD', 50 UNION ALL
  SELECT 'WA', 'employer_pfml_wage_base', 184500.00000000, 'money', 'USD', 60 UNION ALL
  SELECT 'WA', 'state_income_withholding_rate', 0.00000000, 'rate', NULL, 70
) seeded_parameters USING (`province_code`)
WHERE `country_code` = 'US' AND `rule_code` = 'STATE_PAYROLL';
