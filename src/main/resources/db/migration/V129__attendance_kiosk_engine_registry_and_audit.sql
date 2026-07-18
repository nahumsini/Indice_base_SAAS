CREATE TABLE IF NOT EXISTS hr_kiosk_module_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    action_id VARCHAR(36) NULL,
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
    UNIQUE KEY uq_hr_kiosk_module_audit_event (event_id),
    KEY idx_hr_kiosk_module_audit_kiosk (company_id, legacy_reference_id, created_at),
    KEY idx_hr_kiosk_module_audit_action (action_id),
    CONSTRAINT chk_hr_kiosk_module_audit_outcome
        CHECK (outcome IN ('SUCCEEDED', 'FAILED', 'REJECTED'))
);

INSERT INTO kiosk_definitions (
    company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
    status, unit_id, business_id, location_id, access_level, expires_at,
    public_token_hash, public_token_hint, legacy_token_recoverable,
    theme_key, default_locale, configuration_version, adapter_version,
    created_by, created_at, updated_by, updated_at
)
SELECT device.company_id,
       'HUMAN_RESOURCES',
       COALESCE(
           NULLIF(JSON_UNQUOTE(JSON_EXTRACT(device.metadata_json, '$.kiosk_type')), ''),
           CASE WHEN device.location_id IS NULL AND device.unit_id IS NULL AND device.business_id IS NULL
                THEN 'open_attendance' ELSE 'business_unit' END
       ),
       device.id,
       device.code,
       device.name,
       CASE WHEN COALESCE(LOWER(device.status), 'active') = 'active' THEN 'ACTIVE' ELSE 'DISABLED' END,
       device.unit_id,
       device.business_id,
       device.location_id,
       'CONTROLLED',
       NULL,
       SHA2(device.public_access_token, 256),
       RIGHT(device.public_access_token, 8),
       1,
       'human-resources',
       'es-MX',
       1,
       1,
       device.created_by,
       device.created_at,
       device.created_by,
       COALESCE(device.updated_at, device.created_at)
FROM attendance_kiosk_devices device
WHERE device.public_access_token IS NOT NULL
  AND device.public_access_token <> ''
ON DUPLICATE KEY UPDATE
    kiosk_type = VALUES(kiosk_type),
    code = VALUES(code),
    name = VALUES(name),
    status = VALUES(status),
    unit_id = VALUES(unit_id),
    business_id = VALUES(business_id),
    location_id = VALUES(location_id),
    public_token_hash = VALUES(public_token_hash),
    public_token_hint = VALUES(public_token_hint),
    theme_key = VALUES(theme_key),
    updated_at = VALUES(updated_at);

INSERT INTO kiosk_identity_credentials (
    company_id, identity_type, identity_id, credential_type,
    credential_reference, secret_hash, status, created_at, rotated_at
)
SELECT method.company_id,
       'EMPLOYEE',
       profile.user_company_id,
       'PIN',
       CONCAT('employee:', profile.user_company_id),
       method.secret_hash,
       CASE
           WHEN COALESCE(LOWER(method.status), 'active') = 'active'
            AND COALESCE(LOWER(profile.status), 'active') = 'active'
            AND COALESCE(LOWER(employee.status), 'active') <> 'terminated'
           THEN 'ACTIVE' ELSE 'REVOKED'
       END,
       method.created_at,
       COALESCE(method.updated_at, method.created_at)
FROM user_access_methods method
JOIN user_access_profiles profile ON profile.id = method.access_profile_id
JOIN hr_users employee ON employee.id = profile.user_company_id
WHERE method.method_type = 'pin'
  AND method.secret_hash IS NOT NULL
  AND method.secret_hash <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM user_access_methods preferred
      WHERE preferred.company_id = method.company_id
        AND preferred.access_profile_id = method.access_profile_id
        AND preferred.method_type = 'pin'
        AND (
            preferred.priority < method.priority
            OR (preferred.priority = method.priority AND preferred.id > method.id)
        )
  )
ON DUPLICATE KEY UPDATE
    credential_reference = VALUES(credential_reference),
    secret_hash = VALUES(secret_hash),
    status = VALUES(status),
    rotated_at = VALUES(rotated_at);

INSERT INTO kiosk_grants (
    kiosk_definition_id, identity_type, identity_id, capability_key,
    status, source, created_at, revoked_at
)
SELECT definition.id,
       'EMPLOYEE',
       credential.identity_id,
       '*',
       credential.status,
       'LEGACY_MIGRATION',
       credential.created_at,
       CASE WHEN credential.status = 'REVOKED' THEN CURRENT_TIMESTAMP ELSE NULL END
FROM kiosk_definitions definition
JOIN kiosk_identity_credentials credential
  ON credential.company_id = definition.company_id
 AND credential.identity_type = 'EMPLOYEE'
 AND credential.credential_type = 'PIN'
WHERE definition.owner_module = 'HUMAN_RESOURCES'
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
    ('attendance.identity.verify', 1, 'HUMAN_RESOURCES', 'DIRECT', 'CONTROLLED', 1, 0, JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('attendance.photo.presign', 1, 'HUMAN_RESOURCES', 'DIRECT', 'CONTROLLED', 1, 1, JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('attendance.face.verification.begin', 1, 'HUMAN_RESOURCES', 'DIRECT', 'CONTROLLED', 1, 1, JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('attendance.face.verification.capture.presign', 1, 'HUMAN_RESOURCES', 'DIRECT', 'CONTROLLED', 1, 1, JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('attendance.face.verification.complete', 1, 'HUMAN_RESOURCES', 'DIRECT', 'CONTROLLED', 1, 1, JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1),
    ('attendance.punch.create', 1, 'HUMAN_RESOURCES', 'DIRECT', 'CONTROLLED', 1, 1, JSON_OBJECT(), JSON_OBJECT(), JSON_OBJECT(), 1)
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
  ON capability.owner_module = 'HUMAN_RESOURCES'
WHERE definition.owner_module = 'HUMAN_RESOURCES'
ON DUPLICATE KEY UPDATE enabled = 1;
