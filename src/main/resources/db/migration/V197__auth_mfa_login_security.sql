ALTER TABLE user_login_audit
  ADD COLUMN event_type VARCHAR(64) NOT NULL DEFAULT 'LOGIN' AFTER id,
  ADD COLUMN stage VARCHAR(32) NOT NULL DEFAULT 'PASSWORD' AFTER event_type,
  ADD COLUMN outcome VARCHAR(32) NOT NULL DEFAULT 'FAILURE' AFTER stage,
  ADD COLUMN email_normalized VARCHAR(255) NULL AFTER email,
  ADD COLUMN company_name_normalized VARCHAR(255) NULL AFTER email_normalized,
  ADD COLUMN user_company_id BIGINT NULL AFTER company_id,
  ADD COLUMN failure_reason_code VARCHAR(64) NULL AFTER failure_reason,
  ADD COLUMN failure_message_safe VARCHAR(255) NULL AFTER failure_reason_code,
  ADD COLUMN request_id VARCHAR(100) NULL AFTER session_id,
  ADD COLUMN lockout_until DATETIME(6) NULL AFTER request_id,
  ADD COLUMN attempts_used INT NULL AFTER lockout_until,
  ADD KEY idx_user_login_audit_company_name_created (company_name_normalized, created_at),
  ADD KEY idx_user_login_audit_user_company_created (user_company_id, created_at),
  ADD KEY idx_user_login_audit_reason_created (failure_reason_code, created_at),
  ADD KEY idx_user_login_audit_ip_created (ip_address, created_at),
  ADD KEY idx_user_login_audit_outcome_created (outcome, created_at),
  ADD CONSTRAINT fk_user_login_audit_user_company
    FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL;

UPDATE user_login_audit
SET email_normalized = LOWER(TRIM(email)),
    outcome = CASE WHEN success = 1 THEN 'SUCCESS' ELSE 'FAILURE' END,
    failure_reason_code = CASE
      WHEN success = 1 THEN NULL
      WHEN failure_reason IS NULL OR failure_reason = '' THEN 'AUTHENTICATION_FAILED'
      ELSE UPPER(REPLACE(REPLACE(LEFT(failure_reason, 64), ' ', '_'), '.', ''))
    END,
    failure_message_safe = failure_reason
WHERE email_normalized IS NULL;

CREATE TABLE auth_login_lockouts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  lockout_key_hash CHAR(64) NOT NULL,
  email_normalized VARCHAR(255) NOT NULL,
  company_name_normalized VARCHAR(255) NOT NULL,
  user_id BIGINT NULL,
  company_id BIGINT NULL,
  user_company_id BIGINT NULL,
  failure_count INT NOT NULL DEFAULT 0,
  locked_until DATETIME(6) NULL,
  last_failure_reason_code VARCHAR(64) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_login_lockouts_key (lockout_key_hash),
  KEY idx_auth_login_lockouts_email_updated (email_normalized, updated_at),
  KEY idx_auth_login_lockouts_company_updated (company_name_normalized, updated_at),
  KEY idx_auth_login_lockouts_user_updated (user_id, updated_at),
  KEY idx_auth_login_lockouts_company_id_updated (company_id, updated_at),
  KEY idx_auth_login_lockouts_locked_until (locked_until),
  CONSTRAINT fk_auth_login_lockouts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_login_lockouts_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_login_lockouts_user_company
    FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL
);

CREATE TABLE auth_rate_limit_buckets (
  id BIGINT NOT NULL AUTO_INCREMENT,
  purpose VARCHAR(64) NOT NULL,
  rate_limit_key_hash CHAR(64) NOT NULL,
  email_normalized VARCHAR(255) NOT NULL,
  company_name_normalized VARCHAR(255) NOT NULL,
  user_id BIGINT NULL,
  company_id BIGINT NULL,
  user_company_id BIGINT NULL,
  request_count INT NOT NULL DEFAULT 0,
  window_started_at DATETIME(6) NOT NULL,
  window_ends_at DATETIME(6) NOT NULL,
  blocked_until DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_rate_limit_bucket_key (purpose, rate_limit_key_hash),
  KEY idx_auth_rate_limit_email_purpose_updated (email_normalized, purpose, updated_at),
  KEY idx_auth_rate_limit_company_purpose_updated (company_name_normalized, purpose, updated_at),
  KEY idx_auth_rate_limit_blocked_until (blocked_until),
  CONSTRAINT fk_auth_rate_limit_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_rate_limit_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_rate_limit_user_company
    FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL
);

CREATE TABLE auth_mfa_challenges (
  id BIGINT NOT NULL AUTO_INCREMENT,
  challenge_reference CHAR(64) NOT NULL,
  session_id_hash CHAR(64) NOT NULL,
  user_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  user_company_id BIGINT NOT NULL,
  role VARCHAR(64) NULL,
  full_name VARCHAR(255) NOT NULL,
  email_normalized VARCHAR(255) NOT NULL,
  company_name_normalized VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  delivery_channel VARCHAR(32) NOT NULL DEFAULT 'EMAIL',
  destination_hint VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  resend_count INT NOT NULL DEFAULT 0,
  last_sent_at DATETIME(6) NULL,
  expires_at DATETIME(6) NOT NULL,
  used_at DATETIME(6) NULL,
  locked_at DATETIME(6) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_mfa_challenge_reference (challenge_reference),
  KEY idx_auth_mfa_user_created (user_id, created_at),
  KEY idx_auth_mfa_company_created (company_id, created_at),
  KEY idx_auth_mfa_email_created (email_normalized, created_at),
  KEY idx_auth_mfa_status_expires (status, expires_at),
  CONSTRAINT fk_auth_mfa_challenge_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_auth_mfa_challenge_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_auth_mfa_challenge_user_company
    FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE CASCADE
);
