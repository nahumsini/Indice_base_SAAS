CREATE TABLE IF NOT EXISTS multi_kiosk_definitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(140) NOT NULL,
    description VARCHAR(500) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    unit_id BIGINT NULL,
    business_id BIGINT NULL,
    theme_key VARCHAR(40) NOT NULL DEFAULT 'indice-blue',
    default_locale VARCHAR(20) NOT NULL DEFAULT 'es-MX',
    expires_at TIMESTAMP NULL,
    public_token_hash CHAR(64) NOT NULL,
    public_token_hint VARCHAR(24) NOT NULL,
    protected_public_token TEXT NOT NULL,
    configuration_version INT NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_multi_kiosk_company_code (company_id, code),
    UNIQUE KEY uq_multi_kiosk_public_token (public_token_hash),
    KEY idx_multi_kiosk_company_status (company_id, status, updated_at),
    KEY idx_multi_kiosk_scope (company_id, unit_id, business_id)
);

CREATE TABLE IF NOT EXISTS multi_kiosk_items (
    multi_kiosk_id BIGINT NOT NULL,
    kiosk_definition_id BIGINT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (multi_kiosk_id, kiosk_definition_id),
    KEY idx_multi_kiosk_items_order (multi_kiosk_id, sort_order),
    CONSTRAINT fk_multi_kiosk_item_definition
        FOREIGN KEY (multi_kiosk_id) REFERENCES multi_kiosk_definitions(id) ON DELETE CASCADE,
    CONSTRAINT fk_multi_kiosk_item_kiosk
        FOREIGN KEY (kiosk_definition_id) REFERENCES kiosk_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS multi_kiosk_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    multi_kiosk_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    granted_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    UNIQUE KEY uq_multi_kiosk_assignment (multi_kiosk_id, user_company_id),
    KEY idx_multi_kiosk_assignment_user (user_company_id, status),
    CONSTRAINT fk_multi_kiosk_assignment_definition
        FOREIGN KEY (multi_kiosk_id) REFERENCES multi_kiosk_definitions(id) ON DELETE CASCADE,
    CONSTRAINT fk_multi_kiosk_assignment_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS multi_kiosk_sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    multi_kiosk_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    access_token_hash CHAR(64) NOT NULL,
    browser_session_hash CHAR(64) NOT NULL,
    verified_factors_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    UNIQUE KEY uq_multi_kiosk_session_token (access_token_hash),
    KEY idx_multi_kiosk_session_definition (multi_kiosk_id, last_activity_at),
    KEY idx_multi_kiosk_session_identity (company_id, user_company_id, expires_at),
    CONSTRAINT fk_multi_kiosk_session_definition
        FOREIGN KEY (multi_kiosk_id) REFERENCES multi_kiosk_definitions(id) ON DELETE CASCADE,
    CONSTRAINT fk_multi_kiosk_session_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS multi_kiosk_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    multi_kiosk_id BIGINT NULL,
    historical_multi_kiosk_id BIGINT NULL,
    company_id BIGINT NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    actor_type VARCHAR(40) NULL,
    actor_id BIGINT NULL,
    snapshot_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retain_until TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_multi_kiosk_audit_event (event_id),
    KEY idx_multi_kiosk_audit_definition (multi_kiosk_id, created_at),
    KEY idx_multi_kiosk_audit_company (company_id, created_at)
);
