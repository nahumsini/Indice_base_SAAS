-- Keep the commercial relationship at company level. A client may have one
-- active distributor, while each consulting request preserves a snapshot of
-- the preference expressed by the client.

ALTER TABLE companies
    ADD COLUMN distributor_company_id BIGINT NULL AFTER commercial_account_type,
    ADD KEY idx_companies_distributor_company (distributor_company_id),
    ADD CONSTRAINT fk_companies_distributor_company
        FOREIGN KEY (distributor_company_id) REFERENCES companies (id) ON DELETE SET NULL;

ALTER TABLE consulting_appointments
    ADD COLUMN consultant_preference VARCHAR(24) NOT NULL DEFAULT 'INDICE_TEAM' AFTER booked_by_user_id,
    ADD COLUMN requested_distributor_company_id BIGINT NULL AFTER consultant_preference,
    ADD COLUMN requested_distributor_name VARCHAR(160) NULL AFTER requested_distributor_company_id,
    ADD COLUMN request_source VARCHAR(24) NOT NULL DEFAULT 'CLIENT_PORTAL' AFTER requested_distributor_name,
    ADD KEY idx_consulting_appointments_preference (consultant_preference, status),
    ADD KEY idx_consulting_appointments_requested_distributor (requested_distributor_company_id, created_at),
    ADD CONSTRAINT chk_consulting_appointments_consultant_preference
        CHECK (consultant_preference IN ('DISTRIBUTOR', 'INDICE_TEAM')),
    ADD CONSTRAINT chk_consulting_appointments_request_source
        CHECK (request_source IN ('CLIENT_PORTAL', 'DISTRIBUTOR_PORTAL', 'PLATFORM_ADMIN')),
    ADD CONSTRAINT fk_consulting_appointments_requested_distributor
        FOREIGN KEY (requested_distributor_company_id) REFERENCES companies (id) ON DELETE SET NULL;
