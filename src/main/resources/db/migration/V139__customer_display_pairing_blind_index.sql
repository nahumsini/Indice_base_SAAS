ALTER TABLE pos_customer_display_devices
    ADD COLUMN pairing_hash_version TINYINT NOT NULL DEFAULT 1
        AFTER consumed_pairing_code_expires_at,
    ADD CONSTRAINT chk_pos_customer_display_pairing_hash_version
        CHECK (pairing_hash_version IN (1, 2));

-- A consumed legacy pairing code is no longer an active credential. Its
-- low-entropy SHA-256 value cannot be converted to HMAC without the original
-- code, so discard the short idempotency grace instead of retaining an
-- offline-verifiable secret after the blind-index migration.
UPDATE pos_customer_display_devices
SET consumed_pairing_code_hash = NULL,
    consumed_pairing_code_expires_at = NULL
WHERE pairing_hash_version = 1
  AND consumed_pairing_code_hash IS NOT NULL;

-- Version 1 is the legacy SHA-256 lookup. The blocking startup migrator can
-- decrypt active pairing codes with the deployment key and replaces them with
-- a keyed HMAC blind index (version 2) before startup completes.
