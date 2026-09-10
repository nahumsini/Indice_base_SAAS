ALTER TABLE finance_kiosk_module_audit
  ADD COLUMN kiosk_definition_id BIGINT NULL AFTER owner_module,
  MODIFY COLUMN legacy_reference_id BIGINT NULL;

UPDATE finance_kiosk_module_audit audit_event
INNER JOIN kiosk_definitions definition
  ON definition.company_id = audit_event.company_id
 AND definition.owner_module = audit_event.owner_module
 AND definition.legacy_reference_id = audit_event.legacy_reference_id
SET audit_event.kiosk_definition_id = definition.id
WHERE audit_event.kiosk_definition_id IS NULL;

CREATE INDEX idx_finance_kiosk_module_audit_definition
  ON finance_kiosk_module_audit (company_id, kiosk_definition_id, created_at);
