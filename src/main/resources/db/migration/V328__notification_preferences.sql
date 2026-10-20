CREATE TABLE notification_preferences (
  company_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_company_id BIGINT NOT NULL,
  quiet_mode BOOLEAN NOT NULL DEFAULT FALSE,
  event_settings JSON NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (company_id, user_id),
  CONSTRAINT fk_notification_preferences_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notification_preferences_membership FOREIGN KEY (user_company_id) REFERENCES user_companies(id)
);
