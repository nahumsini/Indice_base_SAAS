ALTER TABLE kiosk_sessions
    ADD COLUMN last_face_verified_at TIMESTAMP NULL AFTER elevated_until;

CREATE TABLE IF NOT EXISTS face_identity_templates (
    template_reference VARCHAR(36) PRIMARY KEY,
    company_id BIGINT NOT NULL,
    identity_type VARCHAR(40) NOT NULL,
    identity_id BIGINT NOT NULL,
    embeddings_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_face_identity_template_owner (company_id, identity_type, identity_id, created_at)
);

CREATE TABLE IF NOT EXISTS kiosk_biometric_enrollments (
    enrollment_id VARCHAR(36) PRIMARY KEY,
    company_id BIGINT NOT NULL,
    identity_type VARCHAR(40) NOT NULL,
    identity_id BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL,
    consent_version VARCHAR(80) NOT NULL,
    consent_at TIMESTAMP NOT NULL,
    consent_withdrawn_at TIMESTAMP NULL,
    template_reference VARCHAR(36) NULL,
    expires_at TIMESTAMP NULL,
    enrolled_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_kiosk_biometric_identity (
        company_id, identity_type, identity_id, status, created_at
    ),
    CONSTRAINT chk_kiosk_biometric_enrollment_status
        CHECK (status IN ('PENDING', 'ACTIVE', 'SUPERSEDED', 'REVOKED', 'EXPIRED'))
);

CREATE TABLE IF NOT EXISTS kiosk_biometric_verifications (
    verification_id VARCHAR(36) PRIMARY KEY,
    enrollment_id VARCHAR(36) NOT NULL,
    kiosk_definition_id BIGINT NOT NULL,
    kiosk_session_id VARCHAR(64) NOT NULL,
    company_id BIGINT NOT NULL,
    identity_type VARCHAR(40) NOT NULL,
    identity_id BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL,
    liveness_passed TINYINT(1) NULL,
    matched_score DECIMAL(8,6) NULL,
    failure_reason VARCHAR(500) NULL,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_kiosk_biometric_verification_identity (
        company_id, identity_type, identity_id, created_at
    ),
    KEY idx_kiosk_biometric_verification_session (kiosk_session_id, status),
    CONSTRAINT chk_kiosk_biometric_verification_status
        CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'))
);

CREATE TABLE IF NOT EXISTS kiosk_biometric_captures (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flow_type VARCHAR(24) NOT NULL,
    flow_id VARCHAR(36) NOT NULL,
    capture_step VARCHAR(16) NOT NULL,
    bucket_name VARCHAR(180) NOT NULL,
    object_key VARCHAR(700) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_kiosk_biometric_capture_step (flow_type, flow_id, capture_step),
    KEY idx_kiosk_biometric_capture_expiry (expires_at),
    CONSTRAINT chk_kiosk_biometric_capture_flow
        CHECK (flow_type IN ('ENROLLMENT', 'VERIFICATION')),
    CONSTRAINT chk_kiosk_biometric_capture_step
        CHECK (capture_step IN ('neutral', 'left', 'right'))
);

CREATE TABLE IF NOT EXISTS kiosk_biometric_events (
    event_id VARCHAR(36) PRIMARY KEY,
    company_id BIGINT NOT NULL,
    identity_type VARCHAR(40) NOT NULL,
    identity_id BIGINT NOT NULL,
    kiosk_definition_id BIGINT NULL,
    kiosk_session_id VARCHAR(64) NULL,
    enrollment_id VARCHAR(36) NULL,
    verification_id VARCHAR(36) NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    detail_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retain_until TIMESTAMP NOT NULL,
    KEY idx_kiosk_biometric_event_identity (
        company_id, identity_type, identity_id, created_at
    ),
    KEY idx_kiosk_biometric_event_kiosk (kiosk_definition_id, created_at),
    CONSTRAINT chk_kiosk_biometric_event_outcome
        CHECK (outcome IN ('SUCCEEDED', 'FAILED', 'REJECTED'))
);
