UPDATE pos_self_service_kiosks kiosk
JOIN pos_cash_registers cash_register ON cash_register.id = kiosk.cash_register_id
SET kiosk.unit_id = cash_register.unit_id,
    kiosk.business_id = cash_register.business_id
WHERE kiosk.unit_id IS NULL
   OR kiosk.business_id IS NULL;

ALTER TABLE pos_self_service_kiosks
    MODIFY unit_id BIGINT NOT NULL,
    MODIFY business_id BIGINT NOT NULL,
    ADD CONSTRAINT fk_pos_self_service_kiosks_unit
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_pos_self_service_kiosks_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;

ALTER TABLE pos_self_service_pretickets
    ADD COLUMN unit_id BIGINT NULL AFTER company_id,
    ADD COLUMN business_id BIGINT NULL AFTER unit_id;

UPDATE pos_self_service_pretickets preticket
JOIN pos_self_service_kiosks kiosk ON kiosk.id = preticket.kiosk_id
SET preticket.unit_id = kiosk.unit_id,
    preticket.business_id = kiosk.business_id
WHERE preticket.unit_id IS NULL
   OR preticket.business_id IS NULL;

ALTER TABLE pos_self_service_pretickets
    MODIFY unit_id BIGINT NOT NULL,
    MODIFY business_id BIGINT NOT NULL,
    ADD KEY idx_pos_self_service_preticket_scope
        (company_id, unit_id, business_id, status, expires_at);

-- Functional records keep the historical kiosk id as a snapshot value. They do
-- not prevent physical removal of the operational kiosk after revoke/expiry.
ALTER TABLE pos_self_service_pretickets
    DROP FOREIGN KEY fk_pos_self_service_pretickets_kiosk;

ALTER TABLE pos_self_service_audit_events
    DROP FOREIGN KEY fk_pos_self_service_audit_kiosk;
