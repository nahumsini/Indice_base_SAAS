-- Additive mailbox capabilities; existing mail/draft/account identities remain intact.
ALTER TABLE email_mailboxes
    ADD COLUMN background_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN next_sync_at TIMESTAMP(6) NULL,
    ADD COLUMN sync_failures INT NOT NULL DEFAULT 0,
    ADD COLUMN sent_folder VARCHAR(512) NULL,
    ADD COLUMN preferences_version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE email_messages
    ADD COLUMN body_html MEDIUMTEXT NULL,
    ADD COLUMN sent_copy_state VARCHAR(24) NOT NULL DEFAULT 'NONE',
    ADD COLUMN sent_copy_started_at TIMESTAMP(6) NULL;
CREATE TABLE email_attachments (
    company_id BIGINT NOT NULL,
    account_id CHAR(36) NOT NULL,
    message_id CHAR(36) NOT NULL,
    id CHAR(36) NOT NULL,
    filename VARCHAR(180) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id,account_id,message_id,id),
    UNIQUE KEY uq_email_attachment_object(object_key),
    CONSTRAINT fk_email_attachment_message FOREIGN KEY(company_id,account_id,message_id) REFERENCES email_messages(company_id,account_id,id),
    CONSTRAINT ck_email_attachment_status CHECK(status IN ('PENDING','READY','REMOVED'))
);
