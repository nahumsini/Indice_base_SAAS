ALTER TABLE kiosk_file_intents
    ADD COLUMN owner_module VARCHAR(80) NULL AFTER company_id;

UPDATE kiosk_file_intents intent
LEFT JOIN kiosk_definitions definition
  ON definition.id = intent.kiosk_definition_id
SET intent.owner_module = COALESCE(definition.owner_module, 'UNKNOWN')
WHERE intent.owner_module IS NULL;

ALTER TABLE kiosk_file_intents
    MODIFY COLUMN owner_module VARCHAR(80) NOT NULL;
