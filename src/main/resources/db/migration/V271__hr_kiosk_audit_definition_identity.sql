ALTER TABLE hr_kiosk_module_audit
  ADD COLUMN kiosk_definition_id BIGINT NULL AFTER company_id,
  MODIFY COLUMN legacy_reference_id BIGINT NULL;

UPDATE hr_kiosk_module_audit audit_event
INNER JOIN kiosk_definitions definition
  ON definition.company_id = audit_event.company_id
 AND definition.owner_module = 'HUMAN_RESOURCES'
 AND definition.legacy_reference_id = audit_event.legacy_reference_id
SET audit_event.kiosk_definition_id = definition.id
WHERE audit_event.kiosk_definition_id IS NULL;

CREATE INDEX idx_hr_kiosk_module_audit_definition
  ON hr_kiosk_module_audit (company_id, kiosk_definition_id, created_at);
