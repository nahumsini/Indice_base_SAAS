CREATE TABLE IF NOT EXISTS ai_tool_usage_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    access_token_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    status_code SMALLINT NOT NULL,
    occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_ai_tool_usage_connection (access_token_id, occurred_at),
    KEY idx_ai_tool_usage_company (company_id, occurred_at),
    KEY idx_ai_tool_usage_tool (tool_name, outcome, occurred_at),
    CONSTRAINT fk_ai_tool_usage_access_token
        FOREIGN KEY (access_token_id) REFERENCES ai_access_tokens (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_tool_usage_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_tool_usage_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_tool_usage_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE CASCADE,
    CONSTRAINT chk_ai_tool_usage_operation CHECK (operation_type IN ('READ')),
    CONSTRAINT chk_ai_tool_usage_outcome CHECK (outcome IN ('SUCCESS', 'FAILURE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
