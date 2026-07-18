ALTER TABLE kiosk_file_intents
    ADD COLUMN staging_object_key VARCHAR(700) NULL AFTER object_key;

ALTER TABLE kiosk_identity_credentials
    ADD COLUMN credential_origin VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN' AFTER status;

-- V126/V130 copied per-link BCrypt values into the shared provider credential.
-- Mark only hashes that still exactly equal a legacy row; later explicit rotations
-- produce a distinct BCrypt hash and remain authoritative.
UPDATE kiosk_identity_credentials credential
SET credential.credential_origin = 'LEGACY_MIGRATION'
WHERE credential.identity_type = 'PROVIDER'
  AND credential.credential_type = 'PIN'
  AND (
      EXISTS (
          SELECT 1
          FROM pos_supplier_portal_access access
          WHERE access.company_id = credential.company_id
            AND access.provider_id = credential.identity_id
            AND CAST(access.pin_hash AS BINARY) = CAST(credential.secret_hash AS BINARY)
            AND access.deleted_at IS NULL
      )
      OR EXISTS (
          SELECT 1
          FROM finance_payable_kiosk_provider_access access
          WHERE access.company_id = credential.company_id
            AND access.provider_id = credential.identity_id
            AND CAST(access.pin_hash AS BINARY) = CAST(credential.secret_hash AS BINARY)
      )
  );

-- Business Unit + Business are mandatory. Existing links with incomplete scope
-- are preserved for review but cannot remain operational.
INSERT INTO kiosk_audit_events (
    event_id, kiosk_definition_id, historical_kiosk_id, company_id, owner_module,
    event_type, outcome, snapshot_json, retain_until
)
SELECT UUID(), definition.id, definition.id, definition.company_id, definition.owner_module,
       'KIOSK_DISABLED', 'SUCCEEDED',
       JSON_OBJECT(
           'reason', 'Supplier portal scope is incomplete',
           'unit_id', definition.unit_id,
           'business_id', definition.business_id
       ),
       DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 365 DAY)
FROM kiosk_definitions definition
WHERE definition.owner_module = 'PROCUREMENT'
  AND definition.kiosk_type = 'supplier_portal'
  AND definition.status = 'ACTIVE'
  AND (definition.unit_id IS NULL OR definition.business_id IS NULL);

UPDATE pos_supplier_portal_access access
JOIN finance_providers provider
  ON provider.id = access.provider_id
 AND provider.company_id = access.company_id
SET access.status = 'PAUSED', access.updated_at = CURRENT_TIMESTAMP
WHERE access.status = 'ACTIVE'
  AND access.deleted_at IS NULL
  AND (provider.unit_id IS NULL OR provider.business_id IS NULL);

UPDATE kiosk_definitions definition
SET definition.status = 'DISABLED',
    definition.configuration_version = definition.configuration_version + 1,
    definition.updated_at = CURRENT_TIMESTAMP
WHERE definition.owner_module = 'PROCUREMENT'
  AND definition.kiosk_type = 'supplier_portal'
  AND definition.status = 'ACTIVE'
  AND (definition.unit_id IS NULL OR definition.business_id IS NULL);

UPDATE kiosk_sessions session
JOIN kiosk_definitions definition ON definition.id = session.kiosk_definition_id
SET session.revoked_at = COALESCE(session.revoked_at, CURRENT_TIMESTAMP)
WHERE definition.owner_module = 'PROCUREMENT'
  AND definition.kiosk_type = 'supplier_portal'
  AND definition.status = 'DISABLED'
  AND (definition.unit_id IS NULL OR definition.business_id IS NULL)
  AND session.revoked_at IS NULL;

-- Public access material never belongs in the human-readable registry code or hint.
UPDATE kiosk_definitions definition
JOIN pos_supplier_portal_access access
  ON access.company_id = definition.company_id
 AND access.id = definition.legacy_reference_id
SET definition.code = CONCAT('SUPPLIER-PORTAL-', access.id),
    definition.public_token_hint = CONCAT(
        '...', RIGHT(access.portal_code, LEAST(4, CHAR_LENGTH(access.portal_code))))
WHERE definition.owner_module = 'PROCUREMENT'
  AND definition.kiosk_type = 'supplier_portal'
  AND access.portal_code IS NOT NULL
  AND access.portal_code <> '';

-- Correct the broad V130 backfill boundary without mutating that applied file.
DELETE link
FROM kiosk_definition_capabilities link
JOIN kiosk_definitions definition ON definition.id = link.kiosk_definition_id
JOIN kiosk_capabilities capability ON capability.id = link.kiosk_capability_id
WHERE definition.owner_module = 'PROCUREMENT'
  AND (
      (definition.kiosk_type = 'supplier_portal' AND capability.capability_key NOT IN (
          'procurement.portal.identity.verify',
          'procurement.catalog.read',
          'procurement.submission.create',
          'procurement.invoice.document.presign',
          'procurement.invoice.document.register',
          'procurement.invoice.submit'
      ))
      OR (definition.kiosk_type <> 'supplier_portal' AND capability.capability_key IN (
          'procurement.portal.identity.verify',
          'procurement.catalog.read',
          'procurement.submission.create',
          'procurement.invoice.document.presign',
          'procurement.invoice.document.register',
          'procurement.invoice.submit'
      ))
  );
