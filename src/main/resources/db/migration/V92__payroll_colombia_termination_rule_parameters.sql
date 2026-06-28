INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'payroll_days_per_year' AS parameter_key, 360.00000000 AS parameter_value, 'days' AS value_type, 'días' AS unit_label, 80 AS display_order UNION ALL
  SELECT 'payroll_days_per_month', 30.00000000, 'days', 'días', 81 UNION ALL
  SELECT 'vacation_liquidation_divisor', 720.00000000, 'factor', NULL, 82 UNION ALL
  SELECT 'cesantias_interest_annual_rate', 0.12000000, 'rate', NULL, 83 UNION ALL
  SELECT 'termination_high_salary_threshold_smmlv', 10.00000000, 'SMMLV', 'SMMLV', 84 UNION ALL
  SELECT 'termination_fixed_term_minimum_days', 15.00000000, 'days', 'días', 85 UNION ALL
  SELECT 'termination_low_salary_first_year_days', 30.00000000, 'days', 'días', 86 UNION ALL
  SELECT 'termination_low_salary_additional_year_days', 20.00000000, 'days', 'días', 87 UNION ALL
  SELECT 'termination_high_salary_first_year_days', 20.00000000, 'days', 'días', 88 UNION ALL
  SELECT 'termination_high_salary_additional_year_days', 15.00000000, 'days', 'días', 89
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'LABOR_PROVISIONS';
