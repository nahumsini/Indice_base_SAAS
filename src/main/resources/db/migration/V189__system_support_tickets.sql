-- Central support queue shared by distributor accounts and the Indice Root team.
-- Distributor ownership is stored on every ticket so tenant isolation does not
-- depend on the reporter retaining access to the original company.

CREATE TABLE system_support_tickets (
    id BIGINT NOT NULL AUTO_INCREMENT,
    folio VARCHAR(40) NOT NULL,
    distributor_company_id BIGINT NOT NULL,
    reported_by_user_id BIGINT NOT NULL,
    ticket_type VARCHAR(24) NOT NULL,
    priority VARCHAR(24) NOT NULL DEFAULT 'MEDIUM',
    module_name VARCHAR(120) NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    root_response TEXT NULL,
    last_updated_by_user_id BIGINT NOT NULL,
    resolved_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_system_support_tickets_folio (folio),
    KEY idx_system_support_tickets_distributor_status (distributor_company_id, status, updated_at),
    KEY idx_system_support_tickets_root_queue (status, priority, updated_at),
    CONSTRAINT fk_system_support_tickets_distributor
        FOREIGN KEY (distributor_company_id) REFERENCES companies (id) ON DELETE RESTRICT,
    CONSTRAINT fk_system_support_tickets_reporter
        FOREIGN KEY (reported_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_system_support_tickets_last_updater
        FOREIGN KEY (last_updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_system_support_tickets_type
        CHECK (ticket_type IN ('FAILURE', 'IMPROVEMENT')),
    CONSTRAINT chk_system_support_tickets_priority
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_system_support_tickets_status
        CHECK (status IN ('OPEN', 'IN_REVIEW', 'PLANNED', 'RESOLVED', 'CLOSED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_support_ticket_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ticket_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    event_type VARCHAR(24) NOT NULL,
    previous_status VARCHAR(24) NULL,
    new_status VARCHAR(24) NULL,
    note TEXT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_system_support_ticket_events_ticket (ticket_id, created_at),
    CONSTRAINT fk_system_support_ticket_events_ticket
        FOREIGN KEY (ticket_id) REFERENCES system_support_tickets (id) ON DELETE CASCADE,
    CONSTRAINT fk_system_support_ticket_events_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_system_support_ticket_events_type
        CHECK (event_type IN ('CREATED', 'ROOT_UPDATED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
