ALTER TABLE pos_customer_display_devices
    MODIFY device_token VARCHAR(255) NOT NULL,
    MODIFY pairing_code VARCHAR(255) NULL,
    ADD COLUMN device_token_hash CHAR(64) NULL AFTER device_token,
    ADD COLUMN device_token_hint VARCHAR(16) NULL AFTER device_token_hash,
    ADD COLUMN pairing_code_hash CHAR(64) NULL AFTER pairing_code,
    ADD COLUMN consumed_pairing_code_hash CHAR(64) NULL AFTER pairing_code_hash,
    ADD COLUMN consumed_pairing_code_expires_at TIMESTAMP NULL AFTER pairing_code_expires_at,
    ADD COLUMN last_connection_audit_at TIMESTAMP NULL AFTER last_seen_at;

UPDATE pos_customer_display_devices
SET device_token_hash = SHA2(device_token, 256),
    device_token_hint = RIGHT(device_token, 8),
    pairing_code_hash = CASE
        WHEN pairing_code IS NULL OR pairing_code = '' THEN NULL
        ELSE SHA2(pairing_code, 256)
    END
WHERE device_token IS NOT NULL
  AND device_token <> '';

ALTER TABLE pos_customer_display_devices
    MODIFY device_token_hash CHAR(64) NOT NULL,
    MODIFY device_token_hint VARCHAR(16) NOT NULL,
    ADD UNIQUE KEY uk_pos_customer_display_token_hash (device_token_hash),
    ADD KEY idx_pos_customer_display_pairing_hash (pairing_code_hash),
    ADD KEY idx_pos_customer_display_consumed_pairing_hash (consumed_pairing_code_hash);

INSERT INTO kiosk_definitions (
    company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
    description, status, unit_id, business_id, access_level,
    public_token_hash, public_token_hint, legacy_token_recoverable,
    theme_key, default_locale, configuration_version, adapter_version,
    created_by, created_at, updated_by, updated_at
)
SELECT device.company_id,
       'POINT_OF_SALE',
       'customer_display',
       device.id,
       CONCAT('POS-DISPLAY-', LPAD(device.id, 8, '0')),
       device.name,
       CONCAT('Pantalla de cliente vinculada a la caja ', register.code),
       CASE
           WHEN device.status IN ('ACTIVE', 'PENDING') THEN 'ACTIVE'
           ELSE 'DISABLED'
       END,
       device.unit_id,
       device.business_id,
       'PUBLIC',
       device.device_token_hash,
       device.device_token_hint,
       1,
       'point-of-sale',
       'es-MX',
       1,
       1,
       device.created_by_user_id,
       device.created_at,
       COALESCE(device.updated_by_user_id, device.created_by_user_id),
       device.updated_at
FROM pos_customer_display_devices device
JOIN pos_cash_registers register ON register.id = device.cash_register_id
WHERE device.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
    kiosk_type = VALUES(kiosk_type),
    code = VALUES(code),
    name = VALUES(name),
    description = VALUES(description),
    status = VALUES(status),
    unit_id = VALUES(unit_id),
    business_id = VALUES(business_id),
    access_level = VALUES(access_level),
    public_token_hash = VALUES(public_token_hash),
    public_token_hint = VALUES(public_token_hint),
    theme_key = VALUES(theme_key),
    updated_by = VALUES(updated_by),
    updated_at = VALUES(updated_at);

INSERT INTO kiosk_capabilities (
    capability_key, capability_version, owner_module, operation_policy,
    access_level, `sensitive`, mutation, input_contract_json,
    result_contract_json, file_policy_json, enabled
)
VALUES
    (
        'pos.customer-display.pair', 1, 'POINT_OF_SALE', 'DIRECT', 'PUBLIC', 1, 1,
        JSON_OBJECT('type', 'object', 'required', JSON_ARRAY('pairing_code')),
        JSON_OBJECT('type', 'object'), JSON_OBJECT(), 1
    ),
    (
        'pos.customer-display.state.read', 1, 'POINT_OF_SALE', 'INFORMATION_ONLY', 'PUBLIC', 1, 0,
        JSON_OBJECT('type', 'object'),
        JSON_OBJECT('type', 'object', 'description', 'Customer-safe live POS ticket snapshot'),
        JSON_OBJECT(), 1
    )
ON DUPLICATE KEY UPDATE
    owner_module = VALUES(owner_module),
    operation_policy = VALUES(operation_policy),
    access_level = VALUES(access_level),
    `sensitive` = VALUES(`sensitive`),
    mutation = VALUES(mutation),
    input_contract_json = VALUES(input_contract_json),
    result_contract_json = VALUES(result_contract_json),
    file_policy_json = VALUES(file_policy_json),
    enabled = 1;

INSERT INTO kiosk_definition_capabilities (
    kiosk_definition_id, kiosk_capability_id, enabled
)
SELECT definition.id, capability.id, 1
FROM kiosk_definitions definition
JOIN kiosk_capabilities capability
  ON capability.owner_module = 'POINT_OF_SALE'
 AND capability.capability_key IN (
     'pos.customer-display.pair',
     'pos.customer-display.state.read'
 )
WHERE definition.owner_module = 'POINT_OF_SALE'
  AND definition.kiosk_type = 'customer_display'
ON DUPLICATE KEY UPDATE enabled = 1;

INSERT INTO kiosk_audit_events (
    event_id, kiosk_definition_id, historical_kiosk_id, company_id,
    owner_module, event_type, outcome, actor_type, snapshot_json, retain_until
)
SELECT UUID(), definition.id, definition.id, definition.company_id,
       definition.owner_module, 'KIOSK_LEGACY_MIGRATED', 'SUCCEEDED', 'SYSTEM',
       JSON_OBJECT(
           'legacy_reference_id', definition.legacy_reference_id,
           'kiosk_type', definition.kiosk_type,
           'code', definition.code,
           'unit_id', definition.unit_id,
           'business_id', definition.business_id
       ),
       CURRENT_TIMESTAMP + INTERVAL 1 YEAR
FROM kiosk_definitions definition
WHERE definition.owner_module = 'POINT_OF_SALE'
  AND definition.kiosk_type = 'customer_display'
  AND NOT EXISTS (
      SELECT 1
      FROM kiosk_audit_events event
      WHERE event.historical_kiosk_id = definition.id
        AND event.event_type = 'KIOSK_LEGACY_MIGRATED'
  );
