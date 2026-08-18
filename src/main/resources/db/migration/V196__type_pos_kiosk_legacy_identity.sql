ALTER TABLE kiosk_definitions
    DROP INDEX uq_kiosk_definitions_owner_legacy,
    ADD UNIQUE KEY uq_kiosk_definitions_owner_type_legacy (
        company_id,
        owner_module,
        kiosk_type,
        legacy_reference_id
    );
