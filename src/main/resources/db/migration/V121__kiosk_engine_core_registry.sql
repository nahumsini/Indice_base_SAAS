CREATE TABLE IF NOT EXISTS kiosk_definitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    owner_module VARCHAR(80) NOT NULL,
    kiosk_type VARCHAR(80) NOT NULL,
    legacy_reference_id BIGINT NULL,
    code VARCHAR(120) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description VARCHAR(500) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    unit_id BIGINT NULL,
    business_id BIGINT NULL,
    location_id BIGINT NULL,
    access_level VARCHAR(24) NOT NULL DEFAULT 'CONTROLLED',
    expires_at TIMESTAMP NULL,
    public_token_hash CHAR(64) NOT NULL,
    public_token_hint VARCHAR(16) NOT NULL,
    legacy_token_recoverable TINYINT(1) NOT NULL DEFAULT 1,
    theme_key VARCHAR(80) NOT NULL DEFAULT 'process-tasks',
    default_locale VARCHAR(16) NOT NULL DEFAULT 'es-MX',
    configuration_version INT NOT NULL DEFAULT 1,
    adapter_version INT NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_kiosk_definitions_token_hash (public_token_hash),
    UNIQUE KEY uq_kiosk_definitions_owner_legacy (owner_module, legacy_reference_id),
    UNIQUE KEY uq_kiosk_definitions_company_code (company_id, owner_module, code),
    KEY idx_kiosk_definitions_company_status (company_id, status),
    KEY idx_kiosk_definitions_scope (company_id, unit_id, business_id),
    CONSTRAINT chk_kiosk_definitions_status
        CHECK (status IN ('ACTIVE', 'DISABLED', 'EXPIRED', 'REVOKED', 'DELETED')),
    CONSTRAINT chk_kiosk_definitions_access_level
        CHECK (access_level IN ('PUBLIC', 'IDENTIFIED', 'VERIFIED', 'CONTROLLED'))
);

CREATE TABLE IF NOT EXISTS kiosk_capabilities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    capability_key VARCHAR(180) NOT NULL,
    capability_version INT NOT NULL,
    owner_module VARCHAR(80) NOT NULL,
    operation_policy VARCHAR(40) NOT NULL,
    access_level VARCHAR(24) NOT NULL,
    `sensitive` TINYINT(1) NOT NULL DEFAULT 0,
    mutation TINYINT(1) NOT NULL DEFAULT 0,
    input_contract_json JSON NULL,
    result_contract_json JSON NULL,
    file_policy_json JSON NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_kiosk_capability_version (capability_key, capability_version),
    KEY idx_kiosk_capabilities_owner_enabled (owner_module, enabled)
);

CREATE TABLE IF NOT EXISTS kiosk_definition_capabilities (
    kiosk_definition_id BIGINT NOT NULL,
    kiosk_capability_id BIGINT NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    configuration_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kiosk_definition_id, kiosk_capability_id),
    CONSTRAINT fk_kiosk_definition_capability_definition
        FOREIGN KEY (kiosk_definition_id) REFERENCES kiosk_definitions(id) ON DELETE CASCADE,
    CONSTRAINT fk_kiosk_definition_capability_capability
        FOREIGN KEY (kiosk_capability_id) REFERENCES kiosk_capabilities(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS kiosk_identity_credentials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    identity_type VARCHAR(40) NOT NULL,
    identity_id BIGINT NOT NULL,
    credential_type VARCHAR(40) NOT NULL,
    credential_reference VARCHAR(180) NOT NULL,
    secret_hash VARCHAR(255) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP NULL,
    UNIQUE KEY uq_kiosk_identity_credential (company_id, identity_type, identity_id, credential_type),
    KEY idx_kiosk_identity_credential_reference (company_id, credential_type, credential_reference)
);

CREATE TABLE IF NOT EXISTS kiosk_grants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    kiosk_definition_id BIGINT NOT NULL,
    identity_type VARCHAR(40) NOT NULL,
    identity_id BIGINT NOT NULL,
    capability_key VARCHAR(180) NOT NULL DEFAULT '*',
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    source VARCHAR(40) NOT NULL DEFAULT 'ADMIN',
    granted_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    UNIQUE KEY uq_kiosk_grant_identity_capability (
        kiosk_definition_id, identity_type, identity_id, capability_key
    ),
    KEY idx_kiosk_grants_identity (identity_type, identity_id, status),
    CONSTRAINT fk_kiosk_grants_definition
        FOREIGN KEY (kiosk_definition_id) REFERENCES kiosk_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kiosk_sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    kiosk_definition_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    channel VARCHAR(40) NOT NULL,
    access_level VARCHAR(24) NOT NULL,
    identity_type VARCHAR(40) NULL,
    identity_id BIGINT NULL,
    access_token_hash CHAR(64) NOT NULL,
    browser_session_hash CHAR(64) NULL,
    verified_factors_json JSON NOT NULL,
    granted_capabilities_json JSON NOT NULL,
    scope_snapshot_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    elevated_until TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,
    UNIQUE KEY uq_kiosk_sessions_access_token (access_token_hash),
    KEY idx_kiosk_sessions_definition_activity (kiosk_definition_id, last_activity_at),
    KEY idx_kiosk_sessions_identity (company_id, identity_type, identity_id),
    KEY idx_kiosk_sessions_expiry (expires_at),
    CONSTRAINT fk_kiosk_sessions_definition
        FOREIGN KEY (kiosk_definition_id) REFERENCES kiosk_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kiosk_actions (
    action_id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NULL,
    kiosk_definition_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    capability_key VARCHAR(180) NOT NULL,
    capability_version INT NOT NULL,
    idempotency_key VARCHAR(128) NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    status VARCHAR(24) NOT NULL,
    module_reference VARCHAR(180) NULL,
    public_result_json JSON NULL,
    error_code VARCHAR(120) NULL,
    KEY idx_kiosk_actions_definition_requested (kiosk_definition_id, requested_at),
    KEY idx_kiosk_actions_session_requested (session_id, requested_at),
    KEY idx_kiosk_actions_capability_requested (capability_key, requested_at),
    CONSTRAINT chk_kiosk_actions_status
        CHECK (status IN ('REQUESTED', 'SUCCEEDED', 'FAILED', 'REPLAYED'))
);

CREATE TABLE IF NOT EXISTS kiosk_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(128) NULL,
    action_id VARCHAR(36) NULL,
    session_id VARCHAR(36) NULL,
    kiosk_definition_id BIGINT NULL,
    historical_kiosk_id BIGINT NULL,
    company_id BIGINT NULL,
    owner_module VARCHAR(80) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    actor_type VARCHAR(40) NULL,
    actor_id BIGINT NULL,
    capability_key VARCHAR(180) NULL,
    module_reference VARCHAR(180) NULL,
    snapshot_json JSON NULL,
    technical_detail_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retain_until TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_kiosk_audit_events_event (event_id),
    KEY idx_kiosk_audit_definition_created (kiosk_definition_id, created_at),
    KEY idx_kiosk_audit_company_created (company_id, created_at),
    KEY idx_kiosk_audit_action (action_id),
    KEY idx_kiosk_audit_retention (retain_until)
);

CREATE TABLE IF NOT EXISTS kiosk_file_intents (
    intent_id VARCHAR(36) PRIMARY KEY,
    kiosk_definition_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    session_id VARCHAR(36) NULL,
    action_id VARCHAR(36) NULL,
    capability_key VARCHAR(180) NOT NULL,
    module_reference VARCHAR(180) NOT NULL,
    bucket_name VARCHAR(255) NOT NULL,
    object_key VARCHAR(700) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(160) NOT NULL,
    size_bytes BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    adopted_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL,
    UNIQUE KEY uq_kiosk_file_intents_object (object_key),
    KEY idx_kiosk_file_intents_expiry (status, expires_at),
    CONSTRAINT chk_kiosk_file_intents_status
        CHECK (status IN ('PENDING', 'ADOPTED', 'REJECTED', 'EXPIRED'))
);

INSERT INTO kiosk_definitions (
    company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
    status, unit_id, business_id, access_level, expires_at,
    public_token_hash, public_token_hint, legacy_token_recoverable,
    theme_key, default_locale, configuration_version, adapter_version,
    created_by, created_at, updated_at
)
SELECT kiosk.company_id,
       'PROCESS_TASKS',
       CASE
           WHEN JSON_VALID(kiosk.metadata_json)
               THEN COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(kiosk.metadata_json, '$.kiosk_type')), ''), 'task_access')
           ELSE 'task_access'
       END,
       kiosk.id,
       kiosk.code,
       kiosk.name,
       CASE WHEN LOWER(COALESCE(kiosk.status, 'active')) = 'active' THEN 'ACTIVE' ELSE 'DISABLED' END,
       kiosk.unit_id,
       kiosk.business_id,
       'CONTROLLED',
       kiosk.expires_at,
       SHA2(kiosk.public_access_token, 256),
       RIGHT(kiosk.public_access_token, 8),
       1,
       'process-tasks',
       'es-MX',
       1,
       1,
       kiosk.created_by,
       kiosk.created_at,
       kiosk.updated_at
FROM process_task_kiosks kiosk
ON DUPLICATE KEY UPDATE
    company_id = VALUES(company_id),
    code = VALUES(code),
    name = VALUES(name),
    status = VALUES(status),
    unit_id = VALUES(unit_id),
    business_id = VALUES(business_id),
    expires_at = VALUES(expires_at),
    public_token_hash = VALUES(public_token_hash),
    public_token_hint = VALUES(public_token_hint),
    updated_at = VALUES(updated_at);
