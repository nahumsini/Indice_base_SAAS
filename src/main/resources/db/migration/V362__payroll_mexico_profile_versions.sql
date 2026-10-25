CREATE TABLE payroll_mexico_profile_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    hr_user_id BIGINT NOT NULL,
    revision BIGINT NOT NULL,
    request_id CHAR(36) NOT NULL,
    effective_from DATE NOT NULL,
    profile_json JSON NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payroll_mx_profile_revision (company_id, hr_user_id, revision),
    UNIQUE KEY uq_payroll_mx_profile_request (company_id, hr_user_id, request_id),
    KEY idx_payroll_mx_profile_date (company_id, hr_user_id, effective_from, revision),
    CONSTRAINT fk_payroll_mx_profile_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_payroll_mx_profile_hr_user FOREIGN KEY (hr_user_id) REFERENCES user_companies(id)
);
