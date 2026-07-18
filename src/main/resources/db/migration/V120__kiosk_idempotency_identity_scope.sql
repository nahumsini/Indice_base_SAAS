ALTER TABLE kiosk_engine_idempotency
    DROP INDEX uq_kiosk_engine_idempotency_scope,
    ADD COLUMN identity_reference_hash CHAR(64) NOT NULL DEFAULT
        '2f183a4e6447b98e1a9cc72c5a0d4f8894f34377d5d9e79c4a6f6f3f3f3a7a14'
        AFTER access_reference_hash;

ALTER TABLE kiosk_engine_idempotency
    ADD UNIQUE KEY uq_kiosk_engine_idempotency_scope (
        owner_module,
        capability_key,
        access_reference_hash,
        identity_reference_hash,
        idempotency_key
    );
