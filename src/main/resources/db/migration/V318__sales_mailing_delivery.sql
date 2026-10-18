ALTER TABLE sales_mailing_campaigns DROP CHECK chk_mailing_campaign_status;
ALTER TABLE sales_mailing_campaigns ADD CONSTRAINT chk_mailing_campaign_status CHECK(status IN ('DRAFT','SCHEDULED','RUNNING','PAUSED','COMPLETED','CANCELLED'));
CREATE TABLE sales_mailing_permissions (
    company_id BIGINT NOT NULL,
    email VARCHAR(240) NOT NULL,
    status VARCHAR(16) NOT NULL,
    evidence VARCHAR(1000) NOT NULL,
    recorded_by BIGINT NOT NULL,
    recorded_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY(company_id,email),
    CONSTRAINT fk_mailing_permission_company FOREIGN KEY(company_id) REFERENCES companies(id),
    CONSTRAINT ck_mailing_permission_status CHECK(status IN ('CONSENTED','SUPPRESSED'))
);
CREATE TABLE sales_mailing_permission_events (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    email VARCHAR(240) NOT NULL,
    action VARCHAR(24) NOT NULL,
    actor_user_id BIGINT NULL,
    evidence VARCHAR(1000) NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_mailing_permission_event_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE sales_mailing_runs (
    company_id BIGINT NOT NULL,
    campaign_id CHAR(36) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    account_id CHAR(36) NOT NULL,
    account_version BIGINT NOT NULL,
    scheduled_at TIMESTAMP(6) NOT NULL,
    footer VARCHAR(1000) NOT NULL,
    lease_token CHAR(36) NULL,
    lease_until TIMESTAMP(6) NULL,
    next_attempt_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_error VARCHAR(64) NULL,
    PRIMARY KEY(company_id,campaign_id),
    CONSTRAINT fk_mailing_run_campaign FOREIGN KEY(company_id,campaign_id) REFERENCES sales_mailing_campaigns(company_id,id),
    CONSTRAINT fk_mailing_run_account FOREIGN KEY(company_id,account_id) REFERENCES email_accounts(company_id,id)
);
CREATE TABLE sales_mailing_deliveries (
    company_id BIGINT NOT NULL,
    campaign_id CHAR(36) NOT NULL,
    id CHAR(36) NOT NULL,
    contact_id BIGINT NOT NULL,
    email VARCHAR(240) NOT NULL,
    name VARCHAR(240) NOT NULL,
    state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMP(6) NULL,
    completed_at TIMESTAMP(6) NULL,
    PRIMARY KEY(company_id,campaign_id,id),
    UNIQUE KEY uq_mailing_delivery_id(id),
    UNIQUE KEY uq_mailing_delivery_recipient(company_id,campaign_id,email),
    CONSTRAINT fk_mailing_delivery_campaign FOREIGN KEY(company_id,campaign_id) REFERENCES sales_mailing_campaigns(company_id,id),
    CONSTRAINT ck_mailing_delivery_state CHECK(state IN ('PENDING','SUBMITTING','ACCEPTED','FAILED','UNKNOWN','SUPPRESSED','CANCELLED'))
);
