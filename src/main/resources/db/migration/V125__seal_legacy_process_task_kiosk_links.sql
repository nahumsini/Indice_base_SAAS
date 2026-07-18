INSERT INTO kiosk_audit_events (
    event_id, kiosk_definition_id, historical_kiosk_id, company_id, owner_module,
    event_type, outcome, actor_type, snapshot_json, retain_until
)
SELECT UUID(), definition.id, definition.id, definition.company_id, definition.owner_module,
       'KIOSK_TOKEN_SEALED', 'SUCCEEDED', 'SYSTEM',
       JSON_OBJECT('public_token_hint', definition.public_token_hint, 'reason', 'legacy-token-migration'),
       CURRENT_TIMESTAMP + INTERVAL 365 DAY
FROM kiosk_definitions definition
WHERE definition.owner_module = 'PROCESS_TASKS'
  AND definition.legacy_token_recoverable = 1;

UPDATE process_task_kiosks kiosk
JOIN kiosk_definitions definition
  ON definition.owner_module = 'PROCESS_TASKS'
 AND definition.legacy_reference_id = kiosk.id
 AND definition.company_id = kiosk.company_id
SET kiosk.public_access_token = CONCAT('opaque:', UUID()),
    definition.legacy_token_recoverable = 0
WHERE definition.legacy_token_recoverable = 1;
