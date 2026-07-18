CREATE TABLE IF NOT EXISTS process_task_kiosk_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    historical_kiosk_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    request_id VARCHAR(128) NULL,
    action_id VARCHAR(36) NULL,
    module_reference VARCHAR(180) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    actor_user_company_id BIGINT NOT NULL,
    snapshot_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_process_task_kiosk_audit_kiosk (company_id, historical_kiosk_id, created_at),
    KEY idx_process_task_kiosk_audit_task (company_id, task_id, created_at),
    KEY idx_process_task_kiosk_audit_action (action_id)
);
