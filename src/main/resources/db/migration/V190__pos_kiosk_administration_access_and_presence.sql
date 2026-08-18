ALTER TABLE kiosk_definitions
    ADD COLUMN protected_public_token TEXT NULL AFTER public_token_hint,
    ADD COLUMN last_seen_at TIMESTAMP NULL AFTER protected_public_token;

CREATE INDEX idx_kiosk_definitions_company_seen
    ON kiosk_definitions (company_id, owner_module, last_seen_at);
