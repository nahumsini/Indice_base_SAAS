CREATE TABLE IF NOT EXISTS company_module_entitlements (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  module_slug VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  source VARCHAR(40) NOT NULL DEFAULT 'subscription',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_company_module_entitlements_company_module (company_id, module_slug),
  KEY idx_company_module_entitlements_module (module_slug),
  CONSTRAINT fk_company_module_entitlements_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_company_module_entitlements_module
    FOREIGN KEY (module_slug) REFERENCES modules (slug) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS company_subscription_plan_modules (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  module_slug VARCHAR(50) NOT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'signup',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_company_subscription_plan_modules (company_id, module_slug),
  KEY idx_company_subscription_plan_modules_module (module_slug),
  CONSTRAINT fk_company_subscription_plan_modules_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_company_subscription_plan_modules_module
    FOREIGN KEY (module_slug) REFERENCES modules (slug) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS billing_payment_audit_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NULL,
  user_id BIGINT NULL,
  user_company_id BIGINT NULL,
  signup_intent_id BIGINT NULL,
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  stripe_checkout_session_id VARCHAR(255) NULL,
  stripe_invoice_id VARCHAR(255) NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  stripe_event_id VARCHAR(255) NULL,
  event_type VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL,
  source VARCHAR(40) NOT NULL,
  amount_cents INT NULL,
  currency VARCHAR(3) NULL,
  failure_code VARCHAR(120) NULL,
  failure_message VARCHAR(500) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  metadata_json JSON NULL,
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_billing_payment_audit_company_created (company_id, created_at),
  KEY idx_billing_payment_audit_subscription_created (stripe_subscription_id, created_at),
  KEY idx_billing_payment_audit_checkout (stripe_checkout_session_id),
  KEY idx_billing_payment_audit_invoice (stripe_invoice_id),
  KEY idx_billing_payment_audit_stripe_event (stripe_event_id),
  KEY idx_billing_payment_audit_type_status (event_type, status),
  CONSTRAINT fk_billing_payment_audit_company
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
  CONSTRAINT fk_billing_payment_audit_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_billing_payment_audit_user_company
    FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TEMPORARY TABLE tmp_seed_superadmin_user_companies AS
SELECT uc.id AS user_company_id
FROM user_companies uc
JOIN users u ON u.id = uc.user_id
JOIN companies c ON c.id = uc.company_id
WHERE LOWER(u.email) = 'demo@example.com'
  AND u.id = 1
  AND c.id = 1
  AND LOWER(c.name) = 'empresa demo spring';

UPDATE user_companies uc
JOIN tmp_seed_superadmin_user_companies target
  ON target.user_company_id = uc.id
SET uc.role = 'superadmin',
    uc.status = 'active',
    uc.visibility = 'all';

INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
SELECT target.user_company_id, module_row.slug, 'admin', 100
FROM tmp_seed_superadmin_user_companies target
JOIN modules module_row ON module_row.is_active = 1
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  skill_level = VALUES(skill_level);

INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
SELECT target.user_company_id, tab_seed.module_slug, tab_seed.tab_key, 1
FROM tmp_seed_superadmin_user_companies target
CROSS JOIN (
  SELECT 'config_center' AS module_slug, 'profile' AS tab_key UNION ALL
  SELECT 'config_center', 'business-structure' UNION ALL
  SELECT 'config_center', 'business-profile' UNION ALL
  SELECT 'config_center', 'personal-performance' UNION ALL
  SELECT 'config_center', 'users' UNION ALL
  SELECT 'human_resources', 'collaborators' UNION ALL
  SELECT 'human_resources', 'attendance' UNION ALL
  SELECT 'human_resources', 'control' UNION ALL
  SELECT 'human_resources', 'payroll' UNION ALL
  SELECT 'human_resources', 'announcements' UNION ALL
  SELECT 'human_resources', 'assets' UNION ALL
  SELECT 'human_resources', 'records' UNION ALL
  SELECT 'human_resources', 'permissions' UNION ALL
  SELECT 'human_resources', 'incentives' UNION ALL
  SELECT 'human_resources', 'kpis'
) tab_seed
WHERE TRUE
ON DUPLICATE KEY UPDATE
  can_view = VALUES(can_view);

DROP TEMPORARY TABLE IF EXISTS tmp_seed_superadmin_user_companies;

INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
SELECT DISTINCT user_company.company_id, module_role.module_slug, 'active', 'legacy_backfill'
FROM user_companies user_company
JOIN user_company_module_roles module_role
  ON module_role.user_company_id = user_company.id
JOIN modules module_row
  ON module_row.slug = module_role.module_slug
WHERE COALESCE(module_row.is_active, 1) = 1
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  source = VALUES(source);

INSERT INTO company_subscription_plan_modules (company_id, module_slug, source, status)
SELECT entitlement.company_id, entitlement.module_slug, 'legacy_backfill', 'active'
FROM company_module_entitlements entitlement
LEFT JOIN company_subscription_plan_modules plan_module
  ON plan_module.company_id = entitlement.company_id
 AND plan_module.module_slug = entitlement.module_slug
WHERE entitlement.status = 'active'
  AND plan_module.id IS NULL;
