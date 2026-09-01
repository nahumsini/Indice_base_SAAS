CREATE TABLE IF NOT EXISTS ai_action_confirmations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    access_token_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    confirmation_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    normalized_args_json JSON NOT NULL,
    task_title VARCHAR(180) NOT NULL,
    task_description VARCHAR(2000) NULL,
    task_priority VARCHAR(20) NOT NULL,
    task_due_date DATE NULL,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_action_confirmations_hash (confirmation_hash),
    KEY idx_ai_action_confirmations_expiry (expires_at, consumed_at),
    KEY idx_ai_action_confirmations_identity (company_id, user_id, tool_name),
    CONSTRAINT fk_ai_action_confirmations_access_token
        FOREIGN KEY (access_token_id) REFERENCES ai_access_tokens (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_action_confirmations_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_action_confirmations_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_action_confirmations_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_action_executions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    confirmation_id BIGINT NOT NULL,
    access_token_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    idempotency_key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    correlation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    risk_level SMALLINT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL,
    result_task_id BIGINT NULL,
    result_folio VARCHAR(80) NULL,
    result_title VARCHAR(180) NULL,
    result_status VARCHAR(40) NULL,
    result_due_date DATE NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_action_executions_idempotency
        (company_id, user_id, tool_name, idempotency_key_hash),
    KEY idx_ai_action_executions_confirmation (confirmation_id),
    KEY idx_ai_action_executions_created (company_id, created_at),
    CONSTRAINT fk_ai_action_executions_confirmation
        FOREIGN KEY (confirmation_id) REFERENCES ai_action_confirmations (id) ON DELETE RESTRICT,
    CONSTRAINT fk_ai_action_executions_access_token
        FOREIGN KEY (access_token_id) REFERENCES ai_access_tokens (id) ON DELETE RESTRICT,
    CONSTRAINT chk_ai_action_executions_status
        CHECK (status IN ('PENDING', 'COMPLETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_action_audit_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    confirmation_id BIGINT NULL,
    access_token_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    risk_level SMALLINT NOT NULL,
    correlation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    idempotency_key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    normalized_args_json JSON NULL,
    result_json JSON NULL,
    error_code VARCHAR(100) NULL,
    error_message_safe VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_ai_action_audit_identity (company_id, user_id, created_at),
    KEY idx_ai_action_audit_tool (tool_name, outcome, created_at),
    KEY idx_ai_action_audit_correlation (correlation_id),
    CONSTRAINT chk_ai_action_audit_outcome
        CHECK (outcome IN ('SUCCESS', 'FAILURE', 'REPLAY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
