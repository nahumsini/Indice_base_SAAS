-- Platform lead diagnosis flow; follows production schema V287.
CREATE TABLE platform_leads (
    id BIGINT NOT NULL AUTO_INCREMENT,
    submission_id CHAR(36) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    company_name VARCHAR(160) NOT NULL,
    email VARCHAR(180) NOT NULL,
    phone VARCHAR(40) NULL,
    country VARCHAR(80) NULL,
    challenge TEXT NOT NULL,
    landing_path VARCHAR(255) NULL,
    source_channel VARCHAR(32) NOT NULL,
    utm_source VARCHAR(100) NULL,
    utm_medium VARCHAR(100) NULL,
    utm_campaign VARCHAR(150) NULL,
    contact_consent_at TIMESTAMP(6) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'NEW',
    assigned_admin_id BIGINT NULL,
    next_action_at TIMESTAMP(6) NULL,
    diagnosis_completed_at TIMESTAMP(6) NULL,
    trial_started_at TIMESTAMP(6) NULL,
    trial_ends_at TIMESTAMP(6) NULL,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_leads_submission (submission_id),
    KEY idx_platform_leads_status_created (status, created_at),
    KEY idx_platform_leads_assignee_action (assigned_admin_id, next_action_at),
    CONSTRAINT fk_platform_leads_assignee
        FOREIGN KEY (assigned_admin_id) REFERENCES platform_administrators (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE platform_lead_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    lead_id BIGINT NOT NULL,
    actor_user_id BIGINT NULL,
    event_type VARCHAR(32) NOT NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NULL,
    note VARCHAR(2000) NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_platform_lead_events_lead_time (lead_id, occurred_at),
    CONSTRAINT fk_platform_lead_events_lead
        FOREIGN KEY (lead_id) REFERENCES platform_leads (id),
    CONSTRAINT fk_platform_lead_events_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
