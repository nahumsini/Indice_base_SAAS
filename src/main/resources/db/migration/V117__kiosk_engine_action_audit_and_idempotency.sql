CREATE TABLE IF NOT EXISTS kiosk_engine_action_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action_id VARCHAR(36) NOT NULL,
    request_id VARCHAR(128) NULL,
    owner_module VARCHAR(80) NOT NULL,
    capability_key VARCHAR(180) NOT NULL,
    capability_version INT NOT NULL,
    channel VARCHAR(40) NOT NULL,
    access_reference_hash CHAR(64) NOT NULL,
    resource_id BIGINT NULL,
    outcome VARCHAR(24) NOT NULL,
    error_type VARCHAR(160) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_kiosk_engine_action_audit_action (action_id),
    KEY idx_kiosk_engine_action_audit_module_created (owner_module, created_at),
    KEY idx_kiosk_engine_action_audit_capability_created (capability_key, created_at),
    KEY idx_kiosk_engine_action_audit_access_created (access_reference_hash, created_at),
    CONSTRAINT chk_kiosk_engine_action_audit_outcome
        CHECK (outcome IN ('SUCCEEDED', 'FAILED', 'REPLAYED'))
);

CREATE TABLE IF NOT EXISTS kiosk_engine_idempotency (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_module VARCHAR(80) NOT NULL,
    capability_key VARCHAR(180) NOT NULL,
    access_reference_hash CHAR(64) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    response_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE KEY uq_kiosk_engine_idempotency_scope (
        owner_module,
        capability_key,
        access_reference_hash,
        idempotency_key
    ),
    KEY idx_kiosk_engine_idempotency_expiry (expires_at),
    CONSTRAINT chk_kiosk_engine_idempotency_status
        CHECK (status IN ('PENDING', 'COMPLETED'))
);
