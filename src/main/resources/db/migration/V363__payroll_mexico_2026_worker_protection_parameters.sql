INSERT INTO payroll_rule_sets (country_code, province_code, rule_code, rule_name, rule_category,
    effective_from, effective_to, version_label, source_name, source_url)
VALUES ('MX', '', 'MINIMUM_WAGE', 'Salarios mínimos generales 2026', 'worker_protection',
    '2026-01-01', '2026-12-31', 'CONASAMI 2026', 'CONASAMI resolución 2026',
    'https://sidof.segob.gob.mx/notas/docFuente/5775534'),
    ('MX', '', 'INFONAVIT_UMI', 'Unidad Mixta INFONAVIT 2026', 'housing_credit',
    '2026-01-01', '2026-12-31', 'INFONAVIT enero 2026', 'INFONAVIT modalidades de amortización enero 2026',
    'https://portalmx.infonavit.org.mx/wps/wcm/connect/3849bacf-4041-461a-924a-2dafdf9097a0/Modalidades_calculo_amortizaciones_2022.pdf?MOD=AJPERES');

INSERT INTO payroll_rule_parameters (rule_set_id, parameter_key, parameter_value, value_type, unit_label, display_order)
SELECT id, 'general_daily', 315.04, 'money', 'MXN', 10 FROM payroll_rule_sets
WHERE country_code='MX' AND rule_code='MINIMUM_WAGE' AND version_label='CONASAMI 2026';
INSERT INTO payroll_rule_parameters (rule_set_id, parameter_key, parameter_value, value_type, unit_label, display_order)
SELECT id, 'border_daily', 440.87, 'money', 'MXN', 20 FROM payroll_rule_sets
WHERE country_code='MX' AND rule_code='MINIMUM_WAGE' AND version_label='CONASAMI 2026';
INSERT INTO payroll_rule_parameters (rule_set_id, parameter_key, parameter_value, value_type, unit_label, display_order)
SELECT id, 'daily_value', 100.81, 'money', 'MXN', 10 FROM payroll_rule_sets
WHERE country_code='MX' AND rule_code='INFONAVIT_UMI' AND version_label='INFONAVIT enero 2026';
