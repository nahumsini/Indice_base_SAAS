-- Correct the aggregate ordinary contributions without changing an adopted rule version.
-- LSS articles 25, 107, 147 and 168, verified 2026-10-25:
-- https://www.imss.gob.mx/sites/all/statics/pdf/leyes/LSS.pdf
-- employee_fixed_period_rate = medical pensioners 0.375% + cash benefits 0.25%
--                            + disability/life 0.625% = 1.25%.
-- employee_pensioners_rate is a legacy key for the separate worker CEAV 1.125%.
-- employer_cash_benefits_rate = medical pensioners 1.05% + cash benefits 0.70%
--                             + disability/life 1.75% = 3.50%.
-- Approved line snapshots and the v1 rules remain untouched.
INSERT INTO payroll_rule_sets
    (country_code, province_code, rule_code, rule_name, rule_category,
     effective_from, effective_to, version_label, source_name, source_url, is_official, is_active)
SELECT country_code, province_code, rule_code, rule_name, rule_category,
       effective_from, effective_to, 'LSS 2026 complete ordinary contributions v2',
       'Ley del Seguro Social, arts. 25, 107, 147, 168', source_url, is_official, is_active
FROM payroll_rule_sets
WHERE country_code = 'MX' AND province_code = '' AND rule_code = 'SOCIAL_SECURITY'
  AND version_label = 'LSS/INFONAVIT 2026 v1' AND effective_from = '2026-01-01';

INSERT INTO payroll_rule_parameters (rule_set_id, parameter_key, parameter_value, value_type, unit_label, display_order)
SELECT corrected.id, p.parameter_key,
       CASE p.parameter_key
           WHEN 'employee_fixed_period_rate' THEN 0.01250000
           WHEN 'employer_cash_benefits_rate' THEN 0.03500000
           ELSE p.parameter_value
       END,
       p.value_type, p.unit_label, p.display_order
FROM payroll_rule_sets original
JOIN payroll_rule_parameters p ON p.rule_set_id = original.id
JOIN payroll_rule_sets corrected ON corrected.country_code = original.country_code
    AND corrected.province_code = original.province_code AND corrected.rule_code = original.rule_code
    AND corrected.effective_from = original.effective_from
    AND corrected.version_label = 'LSS 2026 complete ordinary contributions v2'
WHERE original.country_code = 'MX' AND original.province_code = '' AND original.rule_code = 'SOCIAL_SECURITY'
  AND original.version_label = 'LSS/INFONAVIT 2026 v1' AND original.effective_from = '2026-01-01';
