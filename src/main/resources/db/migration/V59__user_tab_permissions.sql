CREATE TABLE IF NOT EXISTS user_company_tab_permissions (
  id bigint NOT NULL AUTO_INCREMENT,
  user_company_id bigint NOT NULL,
  module_slug varchar(50) NOT NULL,
  tab_key varchar(100) NOT NULL,
  can_view tinyint(1) NOT NULL DEFAULT 1,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_company_tab_permissions_tab (user_company_id, module_slug, tab_key),
  KEY idx_user_company_tab_permissions_module_tab (module_slug, tab_key),
  CONSTRAINT fk_user_company_tab_permissions_access
    FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_company_tab_permissions_module
    FOREIGN KEY (module_slug) REFERENCES modules (slug) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS user_invitation_tab_permissions (
  id bigint NOT NULL AUTO_INCREMENT,
  invitation_id bigint NOT NULL,
  module_slug varchar(50) NOT NULL,
  tab_key varchar(100) NOT NULL,
  can_view tinyint(1) NOT NULL DEFAULT 1,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_invitation_tab_permissions_tab (invitation_id, module_slug, tab_key),
  KEY idx_user_invitation_tab_permissions_module_tab (module_slug, tab_key),
  CONSTRAINT fk_user_invitation_tab_permissions_invitation
    FOREIGN KEY (invitation_id) REFERENCES user_invitations (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_invitation_tab_permissions_module
    FOREIGN KEY (module_slug) REFERENCES modules (slug) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
