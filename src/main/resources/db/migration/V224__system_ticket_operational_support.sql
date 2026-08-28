-- Turns the shared system-ticket queue into an operational support workflow.
-- Targets are internal attention goals, not contractual customer SLAs.

ALTER TABLE system_support_tickets
    ADD COLUMN assigned_to_user_id BIGINT NULL AFTER reported_by_user_id,
    ADD COLUMN first_responded_at TIMESTAMP(6) NULL AFTER root_response,
    ADD COLUMN target_resolution_at TIMESTAMP(6) NULL AFTER first_responded_at,
    ADD COLUMN reopened_count INT NOT NULL DEFAULT 0 AFTER target_resolution_at,
    ADD KEY idx_system_support_tickets_assignee_status (assigned_to_user_id, status, target_resolution_at),
    ADD KEY idx_system_support_tickets_target_status (target_resolution_at, status, priority),
    ADD CONSTRAINT fk_system_support_tickets_assignee
        FOREIGN KEY (assigned_to_user_id) REFERENCES users (id) ON DELETE SET NULL;

UPDATE system_support_tickets
SET target_resolution_at = CASE priority
    WHEN 'CRITICAL' THEN DATE_ADD(created_at, INTERVAL 4 HOUR)
    WHEN 'HIGH' THEN DATE_ADD(created_at, INTERVAL 24 HOUR)
    WHEN 'MEDIUM' THEN DATE_ADD(created_at, INTERVAL 72 HOUR)
    ELSE DATE_ADD(created_at, INTERVAL 120 HOUR)
END
WHERE target_resolution_at IS NULL;

ALTER TABLE system_support_tickets
    DROP CHECK chk_system_support_tickets_status,
    ADD CONSTRAINT chk_system_support_tickets_status
        CHECK (status IN ('OPEN', 'IN_REVIEW', 'WAITING_ON_REPORTER', 'PLANNED', 'RESOLVED', 'CLOSED'));

ALTER TABLE system_support_ticket_events
    MODIFY COLUMN event_type VARCHAR(32) NOT NULL,
    ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC' AFTER event_type,
    DROP CHECK chk_system_support_ticket_events_type,
    ADD CONSTRAINT chk_system_support_ticket_events_type
        CHECK (event_type IN (
            'CREATED', 'ROOT_UPDATED', 'ASSIGNED', 'PUBLIC_MESSAGE',
            'INTERNAL_NOTE', 'ATTACHMENT_ADDED', 'REOPENED'
        )),
    ADD CONSTRAINT chk_system_support_ticket_events_visibility
        CHECK (visibility IN ('PUBLIC', 'INTERNAL'));

CREATE TABLE system_support_ticket_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ticket_id BIGINT NOT NULL,
    distributor_company_id BIGINT NOT NULL,
    uploaded_by_user_id BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    object_key VARCHAR(700) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_system_support_ticket_attachments_object (object_key),
    KEY idx_system_support_ticket_attachments_ticket (ticket_id, created_at),
    KEY idx_system_support_ticket_attachments_company (distributor_company_id, created_at),
    CONSTRAINT fk_system_support_ticket_attachments_ticket
        FOREIGN KEY (ticket_id) REFERENCES system_support_tickets (id) ON DELETE RESTRICT,
    CONSTRAINT fk_system_support_ticket_attachments_company
        FOREIGN KEY (distributor_company_id) REFERENCES companies (id) ON DELETE RESTRICT,
    CONSTRAINT fk_system_support_ticket_attachments_uploader
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_system_support_ticket_attachments_size
        CHECK (size_bytes > 0 AND size_bytes <= 10485760)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
