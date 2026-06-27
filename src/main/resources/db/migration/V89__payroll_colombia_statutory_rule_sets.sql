INSERT IGNORE INTO `payroll_rule_sets`
(`country_code`, `province_code`, `rule_code`, `rule_name`, `rule_category`, `effective_from`, `effective_to`, `version_label`, `source_name`, `source_url`)
VALUES
('CO', '', 'SOCIAL_SECURITY', 'IBC, EPS y pensión Colombia', 'social_security', '2026-01-01', '2026-12-31', 'SMMLV 2026 / PILA 2025', 'UGPP / Ministerio de Salud y Protección Social', 'https://www.ugpp.gov.co/calculadora-ibc'),
('CO', '', 'SOLIDARITY_FUND', 'Fondo de Solidaridad Pensional', 'social_security', '2026-01-01', '2026-12-31', 'Ley 2381 de 2024', 'Departamento Administrativo de la Función Pública', 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=246356'),
('CO', '', 'ARL', 'Riesgos laborales ARL Colombia', 'occupational_risk', '2026-01-01', '2026-12-31', 'Resolución 2388 de 2016 / Anexo Técnico PILA', 'Ministerio de Salud y Protección Social', 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/OT/anexo-tecnico1-glosario.pdf'),
('CO', '', 'PARAFISCAL', 'Aportes parafiscales Colombia', 'parafiscal', '2026-01-01', '2026-12-31', 'Resolución 2388 de 2016 / Ley 1819 de 2016', 'Ministerio de Salud y Protección Social / Función Pública', 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/DIJ/resolucion-2388-2016.pdf'),
('CO', '', 'LABOR_PROVISIONS', 'Prestaciones sociales Colombia', 'labor_provision', '2026-01-01', '2026-12-31', 'Código Sustantivo del Trabajo / MinTrabajo', 'Ministerio del Trabajo', 'https://app2.mintrabajo.gov.co/calculadoralaboral/');

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'smmlv_monthly' AS parameter_key, 1750905.00000000 AS parameter_value, 'money' AS value_type, 'COP' AS unit_label, 10 AS display_order UNION ALL
  SELECT 'ibc_min_smmlv', 1.00000000, 'factor', 'SMMLV', 20 UNION ALL
  SELECT 'ibc_max_smmlv', 25.00000000, 'factor', 'SMMLV', 30 UNION ALL
  SELECT 'employee_health_rate', 0.04000000, 'rate', NULL, 40 UNION ALL
  SELECT 'employee_pension_rate', 0.04000000, 'rate', NULL, 50 UNION ALL
  SELECT 'employer_health_rate', 0.08500000, 'rate', NULL, 60 UNION ALL
  SELECT 'employer_pension_rate', 0.12000000, 'rate', NULL, 70 UNION ALL
  SELECT 'employer_exemption_threshold_smmlv', 10.00000000, 'factor', 'SMMLV', 80 UNION ALL
  SELECT 'apply_employer_exemption_under_threshold', 1.00000000, 'boolean', NULL, 90 UNION ALL
  SELECT 'solidarity_subaccount_rate', 0.00500000, 'rate', NULL, 100
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'SOCIAL_SECURITY';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, 0, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 0.00000000 AS lower_limit, 3.99999999 AS upper_limit, 0.00000000 AS rate, 10 AS display_order UNION ALL
  SELECT 4.00000000, 6.99999999, 0.01500000, 20 UNION ALL
  SELECT 7.00000000, 10.99999999, 0.01800000, 30 UNION ALL
  SELECT 11.00000000, 18.99999999, 0.02500000, 40 UNION ALL
  SELECT 19.00000000, 20.00000000, 0.02800000, 50 UNION ALL
  SELECT 20.00000001, NULL, 0.03000000, 60
) seeded_brackets
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'SOLIDARITY_FUND';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'default_arl_class' AS parameter_key, 1.00000000 AS parameter_value, 'class' AS value_type, NULL AS unit_label, 10 AS display_order UNION ALL
  SELECT 'default_arl_rate', 0.00000000, 'rate', NULL, 20
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'ARL';

INSERT IGNORE INTO `payroll_rule_brackets` (`rule_set_id`, `lower_limit`, `upper_limit`, `fixed_amount`, `rate`, `constant_amount`, `display_order`)
SELECT `id`, lower_limit, upper_limit, 0, rate, 0, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 1.00000000 AS lower_limit, 1.00000000 AS upper_limit, 0.00522000 AS rate, 10 AS display_order UNION ALL
  SELECT 2.00000000, 2.00000000, 0.01044000, 20 UNION ALL
  SELECT 3.00000000, 3.00000000, 0.02436000, 30 UNION ALL
  SELECT 4.00000000, 4.00000000, 0.04350000, 40 UNION ALL
  SELECT 5.00000000, 5.00000000, 0.06960000, 50
) seeded_brackets
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'ARL';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'ccf_rate' AS parameter_key, 0.04000000 AS parameter_value, 'rate' AS value_type, NULL AS unit_label, 10 AS display_order UNION ALL
  SELECT 'icbf_rate', 0.03000000, 'rate', NULL, 20 UNION ALL
  SELECT 'sena_rate', 0.02000000, 'rate', NULL, 30
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'PARAFISCAL';

INSERT IGNORE INTO `payroll_rule_parameters` (`rule_set_id`, `parameter_key`, `parameter_value`, `value_type`, `unit_label`, `display_order`)
SELECT `id`, parameter_key, parameter_value, value_type, unit_label, display_order
FROM `payroll_rule_sets`
JOIN (
  SELECT 'cesantias_rate' AS parameter_key, 0.08333333 AS parameter_value, 'rate' AS value_type, NULL AS unit_label, 10 AS display_order UNION ALL
  SELECT 'cesantias_interest_monthly_rate', 0.01000000, 'rate', NULL, 20 UNION ALL
  SELECT 'prima_services_rate', 0.08333333, 'rate', NULL, 30 UNION ALL
  SELECT 'vacation_rate', 0.04166667, 'rate', NULL, 40
) seeded_parameters
WHERE `country_code` = 'CO' AND `province_code` = '' AND `rule_code` = 'LABOR_PROVISIONS';
