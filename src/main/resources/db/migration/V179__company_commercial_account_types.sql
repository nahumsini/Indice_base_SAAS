-- Classify customer accounts without coupling commercial identity to platform
-- authority. ROOT remains derived from an active platform administrator.

ALTER TABLE companies
    ADD COLUMN commercial_account_type VARCHAR(24) NOT NULL DEFAULT 'SUPER_ADMIN' AFTER name,
    ADD KEY idx_companies_commercial_account_type (commercial_account_type),
    ADD CONSTRAINT chk_companies_commercial_account_type
        CHECK (commercial_account_type IN ('SUPER_ADMIN', 'DISTRIBUTOR'));
