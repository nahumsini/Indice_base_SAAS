CREATE TABLE user_workspace_states (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    module_key VARCHAR(80) NOT NULL,
    tab_key VARCHAR(80) NOT NULL,
    state_json JSON NOT NULL,
    schema_version INT NOT NULL DEFAULT 1,
    last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_workspace_scope (company_id, user_id, module_key, tab_key),
    KEY idx_user_workspace_expiry (expires_at),
    CONSTRAINT fk_user_workspace_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_workspace_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
