-- V130 and V133 reached deployed databases before their follow-up hardening.
-- Keep those applied migrations immutable and carry every later schema/data
-- correction here so Flyway validation remains deterministic.

ALTER TABLE pos_self_service_pretickets
    ADD COLUMN personal_data_purged_at TIMESTAMP NULL AFTER claimed_at;

-- Supplier links are canonicalized by the same UPPER(TRIM(...)) hash used by
-- public lookup. This also repairs Engine definitions created by V130 from a
-- non-canonical legacy code without exposing the recoverable portal secret.
UPDATE kiosk_definitions definition
JOIN pos_supplier_portal_access access
  ON access.company_id = definition.company_id
 AND access.id = definition.legacy_reference_id
SET definition.public_token_hash = access.portal_code_hash,
    definition.public_token_hint = access.portal_code_hint,
    definition.updated_at = CURRENT_TIMESTAMP
WHERE definition.owner_module = 'PROCUREMENT'
  AND definition.kiosk_type = 'supplier_portal'
  AND access.portal_code_hash IS NOT NULL
  AND access.portal_code_hint IS NOT NULL
  AND (
      CAST(definition.public_token_hash AS BINARY) <> CAST(access.portal_code_hash AS BINARY)
      OR CAST(definition.public_token_hint AS BINARY) <> CAST(access.portal_code_hint AS BINARY)
  );

-- A paused link is disabled operationally, but its provider grant remains
-- available for a later reactivation. V130 originally revoked these grants.
UPDATE kiosk_grants grant_record
JOIN kiosk_definitions definition
  ON definition.id = grant_record.kiosk_definition_id
JOIN pos_supplier_portal_access access
  ON access.company_id = definition.company_id
 AND access.id = definition.legacy_reference_id
 AND access.provider_id = grant_record.identity_id
SET grant_record.status = 'ACTIVE',
    grant_record.revoked_at = NULL
WHERE definition.owner_module = 'PROCUREMENT'
  AND definition.kiosk_type = 'supplier_portal'
  AND grant_record.identity_type = 'PROVIDER'
  AND grant_record.capability_key = '*'
  AND access.status = 'PAUSED'
  AND access.deleted_at IS NULL
  AND (grant_record.status <> 'ACTIVE' OR grant_record.revoked_at IS NOT NULL);

-- Reactivate only a migration-derived personal credential whose exact BCrypt
-- value still belongs to a live active/paused supplier link. Deliberate personal
-- rotations and unrelated provider credentials remain authoritative and untouched.
UPDATE kiosk_identity_credentials credential
SET credential.status = 'ACTIVE'
WHERE credential.identity_type = 'PROVIDER'
  AND credential.credential_type = 'PIN'
  AND credential.credential_origin = 'LEGACY_MIGRATION'
  AND credential.status <> 'ACTIVE'
  AND EXISTS (
      SELECT 1
      FROM pos_supplier_portal_access access
      WHERE access.company_id = credential.company_id
        AND access.provider_id = credential.identity_id
        AND CAST(access.pin_hash AS BINARY) = CAST(credential.secret_hash AS BINARY)
        AND access.status IN ('ACTIVE', 'PAUSED')
        AND access.deleted_at IS NULL
        AND (access.expires_at IS NULL OR access.expires_at > CURRENT_TIMESTAMP)
  );
