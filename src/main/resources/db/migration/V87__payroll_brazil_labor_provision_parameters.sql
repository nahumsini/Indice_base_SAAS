INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'vacation_provision_rate' AS parameter_key, 0.08333333 AS parameter_value, 'rate' AS value_type, NULL AS unit_label, 70 AS display_order UNION ALL
  SELECT 'vacation_bonus_provision_rate', 0.02777778, 'rate', NULL, 80 UNION ALL
  SELECT 'thirteenth_salary_provision_rate', 0.08333333, 'rate', NULL, 90 UNION ALL
  SELECT 'fgts_fine_provision_rate', 0.03200000, 'rate', NULL, 100
) seeded_parameters
WHERE `country_code` = 'BR'
  AND `province_code` = ''
  AND `rule_code` = 'EMPLOYER_SOCIAL_CONTRIBUTIONS';
