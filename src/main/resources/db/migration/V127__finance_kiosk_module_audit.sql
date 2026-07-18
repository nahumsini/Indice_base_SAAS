CREATE TABLE IF NOT EXISTS finance_kiosk_module_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    action_id VARCHAR(36) NULL,
    company_id BIGINT NOT NULL,
    owner_module VARCHAR(64) NOT NULL,
    legacy_reference_id BIGINT NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    actor_type VARCHAR(40) NULL,
    actor_id BIGINT NULL,
    module_record_type VARCHAR(80) NULL,
    module_record_id BIGINT NULL,
    detail_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_finance_kiosk_module_audit_event (event_id),
    KEY idx_finance_kiosk_module_audit_kiosk (
        company_id, owner_module, legacy_reference_id, created_at
    ),
    KEY idx_finance_kiosk_module_audit_action (action_id),
    CONSTRAINT chk_finance_kiosk_module_audit_outcome
        CHECK (outcome IN ('SUCCEEDED', 'FAILED', 'REJECTED'))
);
