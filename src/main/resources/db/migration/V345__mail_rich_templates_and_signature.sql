-- Shared Sales templates and private per-account signature formatting. Existing text remains authoritative fallback.
ALTER TABLE sales_mailing_templates ADD COLUMN body_html MEDIUMTEXT NULL;
ALTER TABLE sales_mailing_campaigns ADD COLUMN body_html MEDIUMTEXT NULL;
ALTER TABLE email_mailboxes
 ADD COLUMN signature_html MEDIUMTEXT NULL,
 ADD COLUMN signature_new BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN signature_reply BOOLEAN NOT NULL DEFAULT FALSE;
