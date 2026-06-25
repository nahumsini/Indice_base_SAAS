CREATE TABLE IF NOT EXISTS user_login_audit (
  id BIGINT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  user_id BIGINT NULL,
  company_id BIGINT NULL,
  role VARCHAR(64) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  failure_reason VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  session_id VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_login_audit_email_created (email, created_at),
  KEY idx_user_login_audit_user_created (user_id, created_at),
  KEY idx_user_login_audit_company_created (company_id, created_at),
  CONSTRAINT fk_user_login_audit_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_login_audit_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_access_audit (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  actor_user_id BIGINT NULL,
  target_user_id BIGINT NULL,
  target_user_company_id BIGINT NULL,
  target_invitation_id BIGINT NULL,
  event_type VARCHAR(64) NOT NULL,
  old_role VARCHAR(64) NULL,
  new_role VARCHAR(64) NULL,
  old_status VARCHAR(64) NULL,
  new_status VARCHAR(64) NULL,
  old_unit_id BIGINT NULL,
  new_unit_id BIGINT NULL,
  old_business_id BIGINT NULL,
  new_business_id BIGINT NULL,
  old_modules_json JSON NULL,
  new_modules_json JSON NULL,
  old_tab_permissions_json JSON NULL,
  new_tab_permissions_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_access_audit_company_created (company_id, created_at),
  KEY idx_user_access_audit_actor_created (actor_user_id, created_at),
  KEY idx_user_access_audit_target_created (target_user_id, created_at),
  KEY idx_user_access_audit_invitation_created (target_invitation_id, created_at),
  CONSTRAINT fk_user_access_audit_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_access_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_access_audit_target_user
    FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_access_audit_target_user_company
    FOREIGN KEY (target_user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_access_audit_target_invitation
    FOREIGN KEY (target_invitation_id) REFERENCES user_invitations (id) ON DELETE SET NULL
);
