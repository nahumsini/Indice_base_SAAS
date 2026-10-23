CREATE TABLE sales_mailing_files (
    company_id BIGINT NOT NULL,
    id CHAR(36) NOT NULL,
    created_by BIGINT NOT NULL,
    filename VARCHAR(180) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY(company_id,id),
    KEY idx_mailing_file_pending(company_id,created_by,status,created_at),
    CONSTRAINT fk_mailing_file_company FOREIGN KEY(company_id) REFERENCES companies(id),
    CONSTRAINT fk_mailing_file_creator FOREIGN KEY(created_by) REFERENCES users(id),
    CONSTRAINT chk_mailing_file_status CHECK(status IN ('PENDING','READY')),
    CONSTRAINT chk_mailing_file_size CHECK(size_bytes BETWEEN 1 AND 10485760)
);
CREATE TABLE sales_mailing_template_files (
    company_id BIGINT NOT NULL,
    template_id CHAR(36) NOT NULL,
    file_id CHAR(36) NOT NULL,
    position INT NOT NULL,
    PRIMARY KEY(company_id,template_id,file_id),
    CONSTRAINT fk_template_file_template FOREIGN KEY(company_id,template_id) REFERENCES sales_mailing_templates(company_id,id),
    CONSTRAINT fk_template_file_asset FOREIGN KEY(company_id,file_id) REFERENCES sales_mailing_files(company_id,id)
);
CREATE TABLE sales_mailing_campaign_files (
    company_id BIGINT NOT NULL,
    campaign_id CHAR(36) NOT NULL,
    file_id CHAR(36) NOT NULL,
    position INT NOT NULL,
    PRIMARY KEY(company_id,campaign_id,file_id),
    CONSTRAINT fk_campaign_file_campaign FOREIGN KEY(company_id,campaign_id) REFERENCES sales_mailing_campaigns(company_id,id),
    CONSTRAINT fk_campaign_file_asset FOREIGN KEY(company_id,file_id) REFERENCES sales_mailing_files(company_id,id)
);
ALTER TABLE sales_mailing_templates
    ADD COLUMN save_request_id CHAR(36) NULL,
    ADD COLUMN save_request_hash CHAR(64) NULL;

-- Several private messages may reference one company-owned immutable asset.
-- The message-scoped primary key still prevents duplicate attachment registrations.
ALTER TABLE email_attachments
    DROP INDEX uq_email_attachment_object,
    ADD KEY idx_email_attachment_object(object_key);
