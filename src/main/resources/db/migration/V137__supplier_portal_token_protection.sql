ALTER TABLE pos_supplier_portal_access
    MODIFY portal_code VARCHAR(255) NOT NULL,
    ADD COLUMN portal_code_hash CHAR(64) NULL AFTER portal_code,
    ADD COLUMN portal_code_hint VARCHAR(16) NULL AFTER portal_code_hash;

UPDATE pos_supplier_portal_access
SET portal_code_hash = SHA2(UPPER(TRIM(portal_code)), 256),
    portal_code_hint = RIGHT(UPPER(TRIM(portal_code)), 8)
WHERE portal_code IS NOT NULL
  AND portal_code <> '';

ALTER TABLE pos_supplier_portal_access
    DROP INDEX uk_pos_supplier_portal_access_global_code,
    MODIFY portal_code_hash CHAR(64) NOT NULL,
    MODIFY portal_code_hint VARCHAR(16) NOT NULL,
    ADD UNIQUE KEY uk_pos_supplier_portal_access_code_hash (portal_code_hash);
