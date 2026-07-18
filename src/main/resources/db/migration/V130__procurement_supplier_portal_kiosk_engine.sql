CREATE TABLE IF NOT EXISTS procurement_kiosk_module_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    action_id VARCHAR(36) NULL,
    request_id VARCHAR(128) NULL,
    company_id BIGINT NOT NULL,
    legacy_reference_id BIGINT NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    actor_type VARCHAR(40) NULL,
    actor_id BIGINT NULL,
    module_record_type VARCHAR(80) NULL,
    module_record_id BIGINT NULL,
    detail_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_procurement_kiosk_module_audit_event (event_id),
    KEY idx_procurement_kiosk_module_audit_kiosk (
        company_id, legacy_reference_id, created_at
    ),
    KEY idx_procurement_kiosk_module_audit_action (action_id),
    KEY idx_procurement_kiosk_module_audit_request (request_id),
    CONSTRAINT chk_procurement_kiosk_module_audit_outcome
        CHECK (outcome IN ('SUCCEEDED', 'FAILED', 'REJECTED'))
);

UPDATE pos_supplier_portal_access
SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
WHERE status = 'ACTIVE'
  AND expires_at IS NOT NULL
  AND expires_at <= CURRENT_TIMESTAMP
  AND deleted_at IS NULL;

UPDATE pos_supplier_portal_access
SET allowed_capabilities_json = JSON_ARRAY(
    'procurement.catalog.read',
    'procurement.submission.create',
    'procurement.invoice.document.presign',
    'procurement.invoice.document.register',
    'procurement.invoice.submit'
)
WHERE deleted_at IS NULL;

INSERT INTO kiosk_definitions (
    company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
    status, unit_id, business_id, access_level, expires_at,
    public_token_hash, public_token_hint, legacy_token_recoverable,
    theme_key, default_locale, configuration_version, adapter_version,
    created_by, created_at, updated_by, updated_at
)
SELECT access.company_id,
       'PROCUREMENT',
       'supplier_portal',
       access.id,
       access.portal_code,
       CONCAT('Portal de ', provider.name),
       CASE
           WHEN access.status = 'REVOKED' THEN 'REVOKED'
           WHEN access.status = 'EXPIRED'
             OR (access.expires_at IS NOT NULL AND access.expires_at <= CURRENT_TIMESTAMP)
               THEN 'EXPIRED'
           WHEN access.status = 'ACTIVE' THEN 'ACTIVE'
           ELSE 'DISABLED'
       END,
       provider.unit_id,
       provider.business_id,
       'CONTROLLED',
       access.expires_at,
       SHA2(access.portal_code, 256),
       RIGHT(access.portal_code, 8),
       1,
       'procurement',
       'es-MX',
       1,
       1,
       access.created_by_user_id,
       access.created_at,
       access.updated_by_user_id,
       COALESCE(access.updated_at, access.created_at)
FROM pos_supplier_portal_access access
JOIN finance_providers provider
  ON provider.id = access.provider_id
 AND provider.company_id = access.company_id
WHERE access.deleted_at IS NULL
  AND provider.deleted_at IS NULL
  AND access.portal_code IS NOT NULL
  AND access.portal_code <> ''
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    status = IF(
        kiosk_definitions.status IN ('REVOKED', 'DELETED'),
        kiosk_definitions.status,
        VALUES(status)
    ),
    unit_id = VALUES(unit_id),
    business_id = VALUES(business_id),
    expires_at = VALUES(expires_at),
    public_token_hash = VALUES(public_token_hash),
    public_token_hint = VALUES(public_token_hint),
    theme_key = VALUES(theme_key),
    updated_by = VALUES(updated_by),
    updated_at = VALUES(updated_at);

INSERT INTO kiosk_identity_credentials (
    company_id, identity_type, identity_id, credential_type,
    credential_reference, secret_hash, status, created_at, rotated_at
)
SELECT access.company_id,
       'PROVIDER',
       access.provider_id,
       'PIN',
       CONCAT('provider:', access.provider_id),
       access.pin_hash,
       CASE WHEN access.status = 'ACTIVE' THEN 'ACTIVE' ELSE 'REVOKED' END,
       access.created_at,
       COALESCE(access.updated_at, access.created_at)
FROM pos_supplier_portal_access access
WHERE access.pin_hash IS NOT NULL
  AND access.pin_hash <> ''
  AND access.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM pos_supplier_portal_access preferred
      WHERE preferred.company_id = access.company_id
        AND preferred.provider_id = access.provider_id
        AND preferred.deleted_at IS NULL
        AND (
            (preferred.status = 'ACTIVE' AND access.status <> 'ACTIVE')
            OR ((preferred.status = 'ACTIVE') = (access.status = 'ACTIVE') AND preferred.id > access.id)
        )
  )
ON DUPLICATE KEY UPDATE
    credential_reference = kiosk_identity_credentials.credential_reference,
    secret_hash = kiosk_identity_credentials.secret_hash,
    status = kiosk_identity_credentials.status,
    rotated_at = kiosk_identity_credentials.rotated_at;

INSERT INTO kiosk_grants (
    kiosk_definition_id, identity_type, identity_id, capability_key,
    status, source, granted_by, created_at, revoked_at
)
SELECT definition.id,
       'PROVIDER',
       access.provider_id,
       '*',
       CASE WHEN access.status = 'ACTIVE' THEN 'ACTIVE' ELSE 'REVOKED' END,
       'LEGACY_MIGRATION',
       access.created_by_user_id,
       access.created_at,
       CASE WHEN access.status = 'ACTIVE' THEN NULL ELSE COALESCE(access.updated_at, CURRENT_TIMESTAMP) END
FROM pos_supplier_portal_access access
JOIN kiosk_definitions definition
  ON definition.owner_module = 'PROCUREMENT'
 AND definition.legacy_reference_id = access.id
WHERE access.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    source = VALUES(source),
    revoked_at = VALUES(revoked_at);

INSERT INTO kiosk_capabilities (
    capability_key, capability_version, owner_module, operation_policy,
    access_level, `sensitive`, mutation, input_contract_json,
    result_contract_json, file_policy_json, enabled
)
VALUES
    ('procurement.portal.identity.verify', 1, 'PROCUREMENT', 'DIRECT', 'CONTROLLED', 1, 0,
     JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('procurement.catalog.read', 1, 'PROCUREMENT', 'INFORMATION_ONLY', 'CONTROLLED', 1, 0,
     JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('procurement.submission.create', 1, 'PROCUREMENT', 'REVIEW_REQUIRED', 'CONTROLLED', 1, 1,
     JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('procurement.invoice.document.presign', 1, 'PROCUREMENT', 'DIRECT', 'CONTROLLED', 1, 1,
     JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('procurement.invoice.document.register', 1, 'PROCUREMENT', 'DIRECT', 'CONTROLLED', 1, 1,
     JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('procurement.invoice.submit', 1, 'PROCUREMENT', 'REVIEW_REQUIRED', 'CONTROLLED', 1, 1,
     JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1)
ON DUPLICATE KEY UPDATE
    owner_module = VALUES(owner_module),
    operation_policy = VALUES(operation_policy),
    access_level = VALUES(access_level),
    `sensitive` = VALUES(`sensitive`),
    mutation = VALUES(mutation),
    enabled = 1;

INSERT INTO kiosk_definition_capabilities (
    kiosk_definition_id, kiosk_capability_id, enabled
)
SELECT definition.id, capability.id, 1
FROM kiosk_definitions definition
JOIN kiosk_capabilities capability
  ON capability.owner_module = 'PROCUREMENT'
WHERE definition.owner_module = 'PROCUREMENT'
ON DUPLICATE KEY UPDATE enabled = 1;
