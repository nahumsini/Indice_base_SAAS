INSERT IGNORE INTO `payroll_rule_sets`
(`country_code`, `province_code`, `rule_code`, `rule_name`, `rule_category`, `effective_from`, `effective_to`, `version_label`, `source_name`, `source_url`)
VALUES
('BR', '', 'INSS_EMPLOYEE', 'INSS segurado - tabela progressiva', 'social_security', '2026-01-01', '2026-12-31', 'Portaria Interministerial MPS/MF 13/2026', 'Ministério da Previdência Social / Ministério da Fazenda', 'https://www.gov.br/previdencia/pt-br/assuntos/rpps/documentos/PortariaInterministerialMPSMF13de9dejaneirode2026.pdf'),
('BR', '', 'IRRF_MONTHLY', 'IRRF mensal - tabela progressiva', 'income_tax', '2026-01-01', '2026-12-31', 'Receita Federal 2026', 'Receita Federal - Tributação de 2026', 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026'),
('BR', '', 'EMPLOYER_SOCIAL_CONTRIBUTIONS', 'Encargos patronais Brasil', 'employer_contribution', '2026-01-01', '2026-12-31', 'Lei 8.212/1991 / Lei 8.036/1990', 'Planalto / Governo Federal', 'https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm'),
('BR', '', 'BENEFITS', 'Benefícios e descontos Brasil', 'benefits', '2026-01-01', '2026-12-31', 'CLT / Vale-Transporte', 'Planalto', 'https://www.planalto.gov.br/ccivil_03.old/decreto-lei/del5452.htm');

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'min_contribution_base' AS parameter_key, 1621.00000000 AS parameter_value, 'money' AS value_type, 'BRL' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'max_contribution_base', 8475.55000000, 'money', 'BRL', 20
) seeded_parameters
WHERE `country_code` = 'BR' AND `province_code` = '' AND `rule_code` = 'INSS_EMPLOYEE';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, 0, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.00000000 AS lower_limit, 1621.00000000 AS upper_limit, 0.07500000 AS rate, 10 AS display_order UNION ALL
  SELECT 1621.00000000, 2902.84000000, 0.09000000, 20 UNION ALL
  SELECT 2902.84000000, 4354.27000000, 0.12000000, 30 UNION ALL
  SELECT 4354.27000000, 8475.55000000, 0.14000000, 40
) seeded_brackets
WHERE `country_code` = 'BR' AND `province_code` = '' AND `rule_code` = 'INSS_EMPLOYEE';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'simplified_monthly_deduction' AS parameter_key, 607.20000000 AS parameter_value, 'money' AS value_type, 'BRL' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'dependent_monthly_deduction', 189.59000000, 'money', 'BRL', 20 UNION ALL
  SELECT 'default_dependents', 0.00000000, 'count', NULL, 30 UNION ALL
  SELECT 'reduction_full_limit', 5000.00000000, 'money', 'BRL', 40 UNION ALL
  SELECT 'reduction_phaseout_limit', 7350.00000000, 'money', 'BRL', 50 UNION ALL
  SELECT 'max_monthly_reduction', 312.89000000, 'money', 'BRL', 60 UNION ALL
  SELECT 'reduction_phaseout_intercept', 978.62000000, 'money', 'BRL', 70 UNION ALL
  SELECT 'reduction_phaseout_rate', 0.13314500, 'rate', NULL, 80
) seeded_parameters
WHERE `country_code` = 'BR' AND `province_code` = '' AND `rule_code` = 'IRRF_MONTHLY';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, fixed_amount, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.00000000 AS lower_limit, 2428.80000000 AS upper_limit, 0.00000000 AS fixed_amount, 0.00000000 AS rate, 10 AS display_order UNION ALL
  SELECT 2428.80000000, 2826.65000000, 182.16000000, 0.07500000, 20 UNION ALL
  SELECT 2826.65000000, 3751.05000000, 394.16000000, 0.15000000, 30 UNION ALL
  SELECT 3751.05000000, 4664.68000000, 675.49000000, 0.22500000, 40 UNION ALL
  SELECT 4664.68000000, NULL, 908.73000000, 0.27500000, 50
) seeded_brackets
WHERE `country_code` = 'BR' AND `province_code` = '' AND `rule_code` = 'IRRF_MONTHLY';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'employer_inss_rate' AS parameter_key, 0.20000000 AS parameter_value, 'rate' AS value_type, NULL AS unit_label, 10 AS display_order UNION ALL
  SELECT 'fgts_standard_rate', 0.08000000, 'rate', NULL, 20 UNION ALL
  SELECT 'fgts_apprentice_rate', 0.02000000, 'rate', NULL, 30 UNION ALL
  SELECT 'rat_rate', 0.02000000, 'rate', NULL, 40 UNION ALL
  SELECT 'fap_multiplier', 1.00000000, 'factor', NULL, 50 UNION ALL
  SELECT 'third_parties_rate', 0.05800000, 'rate', NULL, 60
) seeded_parameters
WHERE `country_code` = 'BR' AND `province_code` = '' AND `rule_code` = 'EMPLOYER_SOCIAL_CONTRIBUTIONS';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'transportation_voucher_employee_rate' AS parameter_key, 0.00000000 AS parameter_value, 'rate' AS value_type, NULL AS unit_label, 10 AS display_order UNION ALL
  SELECT 'transportation_voucher_employee_rate_cap', 0.06000000, 'rate', NULL, 20 UNION ALL
  SELECT 'meal_benefits_employee_rate', 0.00000000, 'rate', NULL, 30
) seeded_parameters
WHERE `country_code` = 'BR' AND `province_code` = '' AND `rule_code` = 'BENEFITS';
