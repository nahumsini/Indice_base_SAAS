CREATE TABLE IF NOT EXISTS ai_access_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    provider VARCHAR(40) NOT NULL DEFAULT 'generic_mcp',
    label VARCHAR(120) NOT NULL,
    token_prefix VARCHAR(24) NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    last_used_at DATETIME(6) NULL,
    revoked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_access_tokens_hash (token_hash),
    KEY idx_ai_access_tokens_owner (user_id, company_id, revoked_at, expires_at),
    KEY idx_ai_access_tokens_membership (user_company_id),
    CONSTRAINT fk_ai_access_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_access_tokens_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_access_tokens_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_access_token_scopes (
    token_id BIGINT NOT NULL,
    scope_code VARCHAR(100) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (token_id, scope_code),
    KEY idx_ai_access_token_scopes_code (scope_code),
    CONSTRAINT fk_ai_access_token_scopes_token
        FOREIGN KEY (token_id) REFERENCES ai_access_tokens (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
