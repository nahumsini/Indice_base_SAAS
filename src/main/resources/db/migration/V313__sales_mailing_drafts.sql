CREATE TABLE sales_mailing_campaigns (
    id CHAR(36) NOT NULL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    name VARCHAR(180) NOT NULL,
    subject VARCHAR(240) NOT NULL DEFAULT '',
    sender_name VARCHAR(160) NOT NULL DEFAULT '',
    reply_to VARCHAR(240) NOT NULL DEFAULT '',
    preview_text VARCHAR(240) NOT NULL DEFAULT '',
    body_text MEDIUMTEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    version BIGINT NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uq_mailing_campaign_tenant (company_id,id),
    KEY idx_mailing_campaign_list (company_id,updated_at),
    CONSTRAINT fk_mailing_campaign_company FOREIGN KEY(company_id) REFERENCES companies(id),
    CONSTRAINT fk_mailing_campaign_creator FOREIGN KEY(created_by) REFERENCES users(id),
    CONSTRAINT fk_mailing_campaign_editor FOREIGN KEY(updated_by) REFERENCES users(id),
    CONSTRAINT chk_mailing_campaign_status CHECK (status = 'DRAFT')
);
CREATE TABLE sales_mailing_recipients (
    company_id BIGINT NOT NULL,
    campaign_id CHAR(36) NOT NULL,
    contact_id BIGINT NOT NULL,
    PRIMARY KEY(company_id,campaign_id,contact_id),
    CONSTRAINT fk_mailing_recipient_campaign FOREIGN KEY(company_id,campaign_id) REFERENCES sales_mailing_campaigns(company_id,id),
    CONSTRAINT fk_mailing_recipient_contact FOREIGN KEY(contact_id) REFERENCES sales_contacts(id)
);
CREATE TABLE sales_mailing_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    campaign_id CHAR(36) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    campaign_version BIGINT NOT NULL,
    action VARCHAR(40) NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_mailing_audit_campaign FOREIGN KEY(company_id,campaign_id) REFERENCES sales_mailing_campaigns(company_id,id),
    CONSTRAINT fk_mailing_audit_actor FOREIGN KEY(actor_user_id) REFERENCES users(id)
);
