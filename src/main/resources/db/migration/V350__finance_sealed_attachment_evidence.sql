-- Old registered metadata remains readable; new browser URLs can only write staging objects.
CREATE TABLE finance_attachment_uploads (
 company_id BIGINT NOT NULL,
 staging_key VARCHAR(500) NOT NULL,
 bucket_name VARCHAR(255) NOT NULL,
 owner_type VARCHAR(24) NOT NULL,
 owner_id BIGINT NOT NULL,
 size_bytes BIGINT NOT NULL,
 content_type VARCHAR(190) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'PENDING',
 final_key VARCHAR(500) NULL,
 content_sha256 CHAR(64) NULL,
 upload_expires_at DATETIME(6) NOT NULL,
 registration_expires_at DATETIME(6) NOT NULL,
 cleaned_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,staging_key),
 KEY ix_finance_upload_cleanup(cleaned_at,state,registration_expires_at),
 CONSTRAINT fk_finance_upload_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT ck_finance_upload_state CHECK(state IN ('PENDING','SEALED','EXPIRED'))
) ENGINE=InnoDB;
ALTER TABLE finance_expense_attachments ADD COLUMN content_sha256 CHAR(64) NULL;
ALTER TABLE finance_budget_line_attachments ADD COLUMN content_sha256 CHAR(64) NULL;
ALTER TABLE finance_petty_cash_settlement_line_attachments ADD COLUMN content_sha256 CHAR(64) NULL;
