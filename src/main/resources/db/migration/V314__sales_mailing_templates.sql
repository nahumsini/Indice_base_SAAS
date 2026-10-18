CREATE TABLE sales_mailing_templates (
    company_id BIGINT NOT NULL,
    id CHAR(36) NOT NULL,
    name VARCHAR(180) NOT NULL,
    subject VARCHAR(240) NOT NULL,
    preview_text VARCHAR(240) NOT NULL DEFAULT '',
    body_text MEDIUMTEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    version BIGINT NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id,id),
    KEY idx_mailing_templates_list (company_id,status,updated_at),
    CONSTRAINT fk_mailing_template_company FOREIGN KEY(company_id) REFERENCES companies(id),
    CONSTRAINT fk_mailing_template_creator FOREIGN KEY(created_by) REFERENCES users(id),
    CONSTRAINT fk_mailing_template_editor FOREIGN KEY(updated_by) REFERENCES users(id),
    CONSTRAINT chk_mailing_template_status CHECK (status IN ('ACTIVE','ARCHIVED'))
);
CREATE TABLE sales_mailing_template_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    template_id CHAR(36) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    template_version BIGINT NOT NULL,
    action VARCHAR(40) NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_mailing_template_audit_owner FOREIGN KEY(company_id,template_id) REFERENCES sales_mailing_templates(company_id,id),
    CONSTRAINT fk_mailing_template_audit_actor FOREIGN KEY(actor_user_id) REFERENCES users(id)
);
