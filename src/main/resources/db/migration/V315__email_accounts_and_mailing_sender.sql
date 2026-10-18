CREATE TABLE email_accounts (
    id CHAR(36) NOT NULL,
    company_id BIGINT NOT NULL,
    owner_user_id BIGINT NOT NULL,
    label VARCHAR(160) NOT NULL,
    email VARCHAR(240) NOT NULL,
    display_name VARCHAR(160) NOT NULL,
    smtp_host VARCHAR(253) NOT NULL,
    smtp_port INT NOT NULL,
    smtp_security VARCHAR(16) NOT NULL,
    smtp_username VARCHAR(240) NOT NULL,
    smtp_secret TEXT NOT NULL,
    receive_protocol VARCHAR(8) NOT NULL DEFAULT 'NONE',
    receive_host VARCHAR(253) NOT NULL DEFAULT '',
    receive_port INT NOT NULL DEFAULT 993,
    receive_username VARCHAR(240) NOT NULL DEFAULT '',
    receive_secret TEXT NULL,
    mailing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    smtp_status VARCHAR(16) NOT NULL DEFAULT 'NOT_TESTED',
    receive_status VARCHAR(16) NOT NULL DEFAULT 'NOT_TESTED',
    smtp_checked_at TIMESTAMP(6) NULL,
    receive_checked_at TIMESTAMP(6) NULL,
    last_test_at TIMESTAMP(6) NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id, id),
    KEY ix_email_account_owner (company_id, owner_user_id, active),
    CONSTRAINT fk_email_account_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_email_account_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
    CONSTRAINT ck_email_smtp_port CHECK (smtp_port IN (465,587)),
    CONSTRAINT ck_email_smtp_security CHECK ((smtp_port=465 AND smtp_security='TLS') OR (smtp_port=587 AND smtp_security='STARTTLS')),
    CONSTRAINT ck_email_receive_protocol CHECK (receive_protocol IN ('NONE','IMAP','POP3')),
    CONSTRAINT ck_email_receive_port CHECK ((receive_protocol IN ('NONE','IMAP') AND receive_port=993) OR (receive_protocol='POP3' AND receive_port=995))
);

CREATE TABLE email_account_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    account_id CHAR(36) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    action VARCHAR(32) NOT NULL,
    account_version BIGINT NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_email_audit_account FOREIGN KEY (company_id, account_id) REFERENCES email_accounts(company_id,id)
);

ALTER TABLE sales_mailing_campaigns
    ADD COLUMN sender_account_id CHAR(36) NULL,
    ADD CONSTRAINT fk_mailing_sender_account FOREIGN KEY (company_id, sender_account_id) REFERENCES email_accounts(company_id,id);
