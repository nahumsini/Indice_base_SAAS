ALTER TABLE companies
    ADD COLUMN platform_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' AFTER commercial_account_type,
    ADD COLUMN deleted_at DATETIME(6) NULL AFTER platform_status,
    ADD COLUMN deleted_by_user_id BIGINT NULL AFTER deleted_at,
    ADD COLUMN deletion_reason VARCHAR(500) NULL AFTER deleted_by_user_id,
    ADD KEY idx_companies_platform_status (platform_status),
    ADD CONSTRAINT chk_companies_platform_status
        CHECK (platform_status IN ('ACTIVE', 'DELETED')),
    ADD CONSTRAINT fk_companies_deleted_by_user
        FOREIGN KEY (deleted_by_user_id) REFERENCES users (id) ON DELETE SET NULL;
