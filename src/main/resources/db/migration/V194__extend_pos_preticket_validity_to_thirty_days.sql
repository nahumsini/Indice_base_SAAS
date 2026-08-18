ALTER TABLE pos_self_service_kiosks
    DROP CHECK chk_pos_self_service_kiosks_limits;

ALTER TABLE pos_self_service_kiosks
    ADD CONSTRAINT chk_pos_self_service_kiosks_limits
        CHECK (
            max_items_per_ticket BETWEEN 1 AND 100
            AND preticket_ttl_minutes BETWEEN 15 AND 43200
        );
