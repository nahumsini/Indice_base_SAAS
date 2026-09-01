CREATE TABLE IF NOT EXISTS ai_oauth_refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    client_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    access_token_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    resource_uri VARCHAR(512) NOT NULL,
    scopes JSON NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_oauth_refresh_tokens_hash (token_hash),
    KEY idx_ai_oauth_refresh_tokens_expiry (expires_at, used_at),
    KEY idx_ai_oauth_refresh_tokens_access (access_token_id, created_at),
    CONSTRAINT fk_ai_oauth_refresh_tokens_client
        FOREIGN KEY (client_id) REFERENCES ai_oauth_clients (client_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ai_oauth_refresh_tokens_access
        FOREIGN KEY (access_token_id) REFERENCES ai_access_tokens (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_oauth_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_oauth_refresh_tokens_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_oauth_refresh_tokens_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
