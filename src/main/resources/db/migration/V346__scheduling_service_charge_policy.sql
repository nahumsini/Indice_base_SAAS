-- Scheduling owns the booking offer, independently of an optional Inventory link.
-- Historical/unspecified conditions must never be inferred to be free.
ALTER TABLE scheduling_services
    ADD COLUMN charge_policy VARCHAR(24) NOT NULL DEFAULT 'TO_BE_AGREED',
    ADD CONSTRAINT chk_scheduling_service_charge_policy
        CHECK (charge_policy IN ('NO_CHARGE', 'TO_BE_AGREED'));

ALTER TABLE scheduling_reservations
    ADD COLUMN charge_policy_snapshot VARCHAR(24) NOT NULL DEFAULT 'TO_BE_AGREED',
    ADD CONSTRAINT chk_scheduling_reservation_charge_policy
        CHECK (charge_policy_snapshot IN ('NO_CHARGE', 'TO_BE_AGREED'));
