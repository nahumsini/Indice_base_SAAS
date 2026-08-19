ALTER TABLE pos_self_service_pretickets
    DROP CHECK chk_pos_self_service_pretickets_status;

ALTER TABLE pos_self_service_pretickets
    ADD COLUMN pos_ticket_id BIGINT NULL AFTER claimed_at,
    ADD COLUMN completed_at TIMESTAMP NULL AFTER pos_ticket_id,
    ADD KEY idx_pos_self_service_completed_ticket (company_id, pos_ticket_id),
    ADD CONSTRAINT fk_pos_self_service_pretickets_ticket
        FOREIGN KEY (pos_ticket_id) REFERENCES pos_tickets(id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_pos_self_service_pretickets_status
        CHECK (status IN ('PENDING', 'CLAIMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'));
