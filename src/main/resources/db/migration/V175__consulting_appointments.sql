CREATE TABLE consulting_appointments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  booked_by_user_id BIGINT NOT NULL,
  attendee_name VARCHAR(160) NOT NULL,
  attendee_email VARCHAR(190) NOT NULL,
  attendee_phone VARCHAR(40) NULL,
  topic VARCHAR(60) NOT NULL,
  notes VARCHAR(2000) NULL,
  preferred_start_at TIMESTAMP(6) NOT NULL,
  alternative_start_at TIMESTAMP(6) NULL,
  timezone VARCHAR(80) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 50,
  session_kind VARCHAR(24) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
  payment_status VARCHAR(24) NOT NULL,
  amount_cents BIGINT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  confirmed_start_at TIMESTAMP(6) NULL,
  meeting_url TEXT NULL,
  notification_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  cancelled_at TIMESTAMP(6) NULL,
  cancellation_reason VARCHAR(500) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_consulting_appointments_company (company_id, created_at),
  KEY idx_consulting_appointments_status (status, preferred_start_at),
  CONSTRAINT fk_consulting_appointments_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_consulting_appointments_user
    FOREIGN KEY (booked_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
SELECT DISTINCT
  module_role.user_company_id,
  'config_center',
  'consulting',
  CASE
    WHEN LOWER(COALESCE(user_company.role, 'user')) IN
      ('root', 'superadmin', 'super admin', 'admin', 'owner', 'dueno', 'dueño') THEN 1
    ELSE 0
  END
FROM user_company_module_roles module_role
JOIN user_companies user_company ON user_company.id = module_role.user_company_id
LEFT JOIN user_company_tab_permissions existing_permission
  ON existing_permission.user_company_id = module_role.user_company_id
 AND existing_permission.module_slug = 'config_center'
 AND existing_permission.tab_key = 'consulting'
WHERE module_role.module_slug = 'config_center'
  AND existing_permission.id IS NULL;

INSERT INTO user_invitation_tab_permissions (invitation_id, module_slug, tab_key, can_view)
SELECT
  invitation.id,
  'config_center',
  'consulting',
  CASE
    WHEN LOWER(COALESCE(invitation.role, 'user')) IN
      ('root', 'superadmin', 'super admin', 'admin', 'owner', 'dueno', 'dueño') THEN 1
    ELSE 0
  END
FROM user_invitations invitation
LEFT JOIN user_invitation_tab_permissions existing_permission
  ON existing_permission.invitation_id = invitation.id
 AND existing_permission.module_slug = 'config_center'
 AND existing_permission.tab_key = 'consulting'
WHERE LOWER(COALESCE(invitation.status, 'pending')) = 'pending'
  AND JSON_CONTAINS(COALESCE(invitation.module_slugs_json, JSON_ARRAY()), JSON_QUOTE('config_center'))
  AND existing_permission.id IS NULL;
