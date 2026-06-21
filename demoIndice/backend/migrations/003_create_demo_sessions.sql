CREATE TABLE IF NOT EXISTS demo_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_token_hash CHAR(64) NOT NULL UNIQUE,
  account_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  csrf_token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_sessions_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_demo_sessions_user
    FOREIGN KEY (user_id) REFERENCES demo_account_users(id)
    ON DELETE CASCADE,
  INDEX idx_demo_sessions_expiry (expires_at),
  INDEX idx_demo_sessions_user (account_id, user_id)
);
