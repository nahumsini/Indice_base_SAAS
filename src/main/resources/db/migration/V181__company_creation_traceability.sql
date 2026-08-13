-- Preserve how each company entered Indice independently from its current
-- commercial assignment. Distributor assignment can change; creation origin
-- must remain immutable so platform administrators retain real traceability.

ALTER TABLE companies
    ADD COLUMN creation_origin VARCHAR(24) NOT NULL DEFAULT 'LEGACY_UNKNOWN' AFTER distributor_company_id,
    ADD COLUMN created_by_user_id BIGINT NULL AFTER creation_origin,
    ADD COLUMN created_by_distributor_company_id BIGINT NULL AFTER created_by_user_id,
    ADD COLUMN created_by_distributor_name VARCHAR(160) NULL AFTER created_by_distributor_company_id,
    ADD KEY idx_companies_creation_origin (creation_origin),
    ADD KEY idx_companies_created_by_user (created_by_user_id),
    ADD KEY idx_companies_created_by_distributor (created_by_distributor_company_id),
    ADD CONSTRAINT chk_companies_creation_origin
        CHECK (creation_origin IN ('PLATFORM_ADMIN', 'WEB_SELF_SERVICE', 'DISTRIBUTOR_PORTAL', 'LEGACY_UNKNOWN')),
    ADD CONSTRAINT fk_companies_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_companies_created_by_distributor
        FOREIGN KEY (created_by_distributor_company_id) REFERENCES companies (id) ON DELETE SET NULL;

-- Root-created accounts already have an immutable platform audit event.
UPDATE companies company
JOIN (
    SELECT company_id, MIN(id) AS event_id
    FROM platform_audit_events
    WHERE action_code = 'COMPANY_ACCOUNT_CREATED'
      AND outcome = 'SUCCESS'
      AND company_id IS NOT NULL
    GROUP BY company_id
) first_creation ON first_creation.company_id = company.id
JOIN platform_audit_events creation_event ON creation_event.id = first_creation.event_id
SET company.creation_origin = 'PLATFORM_ADMIN',
    company.created_by_user_id = creation_event.actor_user_id;

-- A verified billing signup without a Root creation event came from the
-- public self-service flow. Keep legacy rows unknown when neither source can
-- be proven from stored evidence.
UPDATE companies company
JOIN company_ownerships ownership ON ownership.company_id = company.id
SET company.creation_origin = 'WEB_SELF_SERVICE',
    company.created_by_user_id = ownership.owner_user_id
WHERE company.creation_origin = 'LEGACY_UNKNOWN'
  AND ownership.source_signup_intent_id IS NOT NULL;
