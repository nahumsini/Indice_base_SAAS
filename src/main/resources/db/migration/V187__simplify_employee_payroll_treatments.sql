UPDATE user_work_profiles
SET payroll_treatment = 'no_payroll'
WHERE LOWER(REPLACE(TRIM(payroll_treatment), '-', '_')) IN (
    'accounts_payable',
    'cuenta_por_pagar',
    'cuenta por pagar',
    'expense',
    'expenses'
);

UPDATE user_work_profiles
SET payroll_treatment = 'operational_payroll'
WHERE payroll_treatment IS NULL OR TRIM(payroll_treatment) = '';

ALTER TABLE user_work_profiles
    MODIFY COLUMN payroll_treatment VARCHAR(32) NOT NULL DEFAULT 'operational_payroll';
