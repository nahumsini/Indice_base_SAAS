CREATE TABLE IF NOT EXISTS app_notifications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  recipient_user_company_id BIGINT NOT NULL,
  source_module VARCHAR(80) NOT NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id BIGINT DEFAULT NULL,
  event_type VARCHAR(120) NOT NULL,
  event_key VARCHAR(220) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT DEFAULT NULL,
  action_url VARCHAR(500) DEFAULT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'delivered',
  read_at DATETIME DEFAULT NULL,
  dismissed_at DATETIME DEFAULT NULL,
  dismissed_by BIGINT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_app_notifications_event_recipient (company_id, recipient_user_company_id, event_key),
  KEY idx_app_notifications_inbox (company_id, recipient_user_company_id, dismissed_at, status, created_at),
  KEY idx_app_notifications_source (company_id, source_module, source_type, source_id),
  CONSTRAINT fk_app_notifications_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_app_notifications_recipient_user_company
    FOREIGN KEY (recipient_user_company_id) REFERENCES user_companies(id)
    ON DELETE CASCADE
);
