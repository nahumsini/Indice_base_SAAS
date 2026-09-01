CREATE TABLE IF NOT EXISTS ai_oauth_clients (
    client_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    client_name VARCHAR(120) NOT NULL,
    metadata_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    redirect_uris JSON NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_used_at DATETIME(6) NULL,
    disabled_at DATETIME(6) NULL,
    PRIMARY KEY (client_id),
    UNIQUE KEY uq_ai_oauth_clients_metadata_hash (metadata_hash),
    KEY idx_ai_oauth_clients_status (disabled_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ai_oauth_authorization_codes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    client_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    redirect_uri VARCHAR(2048) NOT NULL,
    resource_uri VARCHAR(512) NOT NULL,
    scopes JSON NOT NULL,
    code_challenge VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_oauth_authorization_codes_hash (code_hash),
    KEY idx_ai_oauth_authorization_codes_expiry (expires_at, used_at),
    KEY idx_ai_oauth_authorization_codes_owner (user_id, company_id, created_at),
    CONSTRAINT fk_ai_oauth_authorization_codes_client
        FOREIGN KEY (client_id) REFERENCES ai_oauth_clients (client_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ai_oauth_authorization_codes_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_oauth_authorization_codes_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_oauth_authorization_codes_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
