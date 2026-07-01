CREATE TABLE IF NOT EXISTS hr_incentives (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    incentive_code VARCHAR(40) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NULL,
    incentive_type VARCHAR(40) NOT NULL DEFAULT 'manual',
    calculation_method VARCHAR(40) NOT NULL DEFAULT 'fixed_amount',
    amount DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    currency_code CHAR(3) NOT NULL DEFAULT 'MXN',
    payroll_category VARCHAR(40) NOT NULL DEFAULT 'earning',
    tax_treatment VARCHAR(80) NOT NULL DEFAULT 'taxable_compensation',
    taxable TINYINT(1) NOT NULL DEFAULT 1,
    affects_social_security TINYINT(1) NOT NULL DEFAULT 1,
    affects_employer_cost TINYINT(1) NOT NULL DEFAULT 0,
    source_type VARCHAR(40) NOT NULL DEFAULT 'incentive',
    source_reference_type VARCHAR(80) NULL,
    source_reference_id VARCHAR(120) NULL,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE NULL,
    application_mode VARCHAR(40) NOT NULL DEFAULT 'next_payroll',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_by_user_id BIGINT NULL,
    approved_by_user_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at DATETIME NULL,
    metadata_json JSON NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_hr_incentives_company_code (company_id, incentive_code),
    KEY idx_hr_incentives_company_status (company_id, status),
    KEY idx_hr_incentives_company_effective (company_id, effective_start_date, effective_end_date),
    CONSTRAINT fk_hr_incentives_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hr_incentives_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hr_incentives_approved_by
        FOREIGN KEY (approved_by_user_id) REFERENCES users (id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hr_incentive_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incentive_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    assignment_type VARCHAR(40) NOT NULL,
    user_company_id BIGINT NULL,
    unit_id BIGINT NULL,
    business_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_hr_incentive_assignments_incentive (incentive_id),
    KEY idx_hr_incentive_assignments_company_user (company_id, user_company_id),
    KEY idx_hr_incentive_assignments_company_unit (company_id, unit_id),
    KEY idx_hr_incentive_assignments_company_business (company_id, business_id),
    CONSTRAINT fk_hr_incentive_assignments_incentive
        FOREIGN KEY (incentive_id) REFERENCES hr_incentives (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hr_incentive_assignments_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hr_incentive_assignments_user_company
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hr_incentive_assignments_unit
        FOREIGN KEY (unit_id) REFERENCES units (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hr_incentive_assignments_business
        FOREIGN KEY (business_id) REFERENCES businesses (id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hr_incentive_applications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    incentive_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    payroll_run_id BIGINT NULL,
    payroll_run_line_id BIGINT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    amount DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    currency_code CHAR(3) NOT NULL DEFAULT 'MXN',
    payroll_category VARCHAR(40) NOT NULL DEFAULT 'earning',
    tax_treatment VARCHAR(80) NOT NULL DEFAULT 'taxable_compensation',
    taxable TINYINT(1) NOT NULL DEFAULT 1,
    affects_social_security TINYINT(1) NOT NULL DEFAULT 1,
    affects_employer_cost TINYINT(1) NOT NULL DEFAULT 0,
    source_type VARCHAR(40) NOT NULL DEFAULT 'incentive',
    source_reference_type VARCHAR(80) NULL,
    source_reference_id VARCHAR(120) NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'approved',
    applied_at DATETIME NULL,
    calculation_snapshot_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_hr_incentive_applications_company_user_period (company_id, user_company_id, period_start_date, period_end_date),
    KEY idx_hr_incentive_applications_company_status (company_id, status),
    KEY idx_hr_incentive_applications_run_line (payroll_run_line_id),
    CONSTRAINT fk_hr_incentive_applications_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hr_incentive_applications_incentive
        FOREIGN KEY (incentive_id) REFERENCES hr_incentives (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hr_incentive_applications_user_company
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_hr_incentive_applications_payroll_run
        FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_hr_incentive_applications_payroll_line
        FOREIGN KEY (payroll_run_line_id) REFERENCES payroll_run_lines (id)
        ON DELETE SET NULL
);
