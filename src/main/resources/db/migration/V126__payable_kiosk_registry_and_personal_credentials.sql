INSERT INTO kiosk_definitions (
    company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
    status, unit_id, business_id, access_level, expires_at,
    public_token_hash, public_token_hint, legacy_token_recoverable,
    theme_key, default_locale, configuration_version, adapter_version,
    created_by, created_at, updated_by, updated_at
)
SELECT kiosk.company_id,
       'EXPENSES',
       'accounts_payable',
       kiosk.id,
       kiosk.code,
       kiosk.name,
       CASE WHEN kiosk.status = 'ACTIVE' AND kiosk.deleted_at IS NULL THEN 'ACTIVE' ELSE 'DISABLED' END,
       kiosk.unit_id,
       kiosk.business_id,
       'CONTROLLED',
       NULL,
       SHA2(kiosk.public_access_token, 256),
       RIGHT(kiosk.public_access_token, 8),
       1,
       'expenses',
       'es-MX',
       1,
       1,
       kiosk.created_by_user_id,
       kiosk.created_at,
       kiosk.updated_by_user_id,
       COALESCE(kiosk.updated_at, kiosk.created_at)
FROM finance_payable_kiosks kiosk
WHERE kiosk.deleted_at IS NULL
  AND kiosk.public_access_token IS NOT NULL
  AND kiosk.public_access_token <> ''
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    status = VALUES(status),
    unit_id = VALUES(unit_id),
    business_id = VALUES(business_id),
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
       access.updated_at
FROM finance_payable_kiosk_provider_access access
WHERE NOT EXISTS (
    SELECT 1
    FROM finance_payable_kiosk_provider_access newer
    WHERE newer.company_id = access.company_id
      AND newer.provider_id = access.provider_id
      AND (
          (newer.status = 'ACTIVE' AND access.status <> 'ACTIVE')
          OR (
              (newer.status = 'ACTIVE') = (access.status = 'ACTIVE')
              AND newer.id > access.id
          )
      )
)
ON DUPLICATE KEY UPDATE
    credential_reference = VALUES(credential_reference),
    secret_hash = VALUES(secret_hash),
    status = VALUES(status),
    rotated_at = VALUES(rotated_at);

INSERT INTO kiosk_grants (
    kiosk_definition_id, identity_type, identity_id, capability_key,
    status, source, granted_by, created_at, revoked_at
)
SELECT definition.id,
       'PROVIDER',
       access.provider_id,
       '*',
       access.status,
       'LEGACY_MIGRATION',
       access.created_by_user_id,
       access.created_at,
       access.revoked_at
FROM finance_payable_kiosk_provider_access access
JOIN kiosk_definitions definition
  ON definition.company_id = access.company_id
 AND definition.owner_module = 'EXPENSES'
 AND definition.legacy_reference_id = access.kiosk_id
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    source = VALUES(source),
    revoked_at = VALUES(revoked_at);
