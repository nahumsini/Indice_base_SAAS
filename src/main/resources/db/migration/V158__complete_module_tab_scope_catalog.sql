CREATE TEMPORARY TABLE indice_tab_scope_catalog (
  module_slug varchar(100) NOT NULL,
  tab_key varchar(120) NOT NULL,
  protected_scope tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (module_slug, tab_key)
);

INSERT INTO indice_tab_scope_catalog (module_slug, tab_key, protected_scope) VALUES
  ('config_center', 'profile', 0),
  ('config_center', 'business-structure', 0),
  ('config_center', 'business-profile', 0),
  ('config_center', 'personal-performance', 0),
  ('config_center', 'users', 0),
  ('config_center', 'plan', 1),
  ('human_resources', 'collaborators', 0),
  ('human_resources', 'attendance', 0),
  ('human_resources', 'control', 0),
  ('human_resources', 'payroll', 0),
  ('human_resources', 'announcements', 0),
  ('human_resources', 'assets', 0),
  ('human_resources', 'records', 0),
  ('human_resources', 'permissions', 0),
  ('human_resources', 'incentives', 0),
  ('human_resources', 'kpis', 0),
  ('processes', 'calendar', 0),
  ('processes', 'projects', 0),
  ('processes', 'processes', 0),
  ('processes', 'kpis', 0),
  ('expenses', 'expenses', 0),
  ('expenses', 'budgets', 0),
  ('expenses', 'providers', 0),
  ('expenses', 'accounting', 0),
  ('expenses', 'payment-accounts', 0),
  ('expenses', 'kpis', 0),
  ('petty_cash', 'cash', 0),
  ('petty_cash', 'control', 0),
  ('petty_cash', 'statements', 0),
  ('petty_cash', 'kpis', 0),
  ('crm', 'leads', 0),
  ('crm', 'contacts', 0),
  ('crm', 'quotes', 0),
  ('crm', 'sales', 0),
  ('crm', 'contracts', 0),
  ('crm', 'kpis', 0),
  ('pos', 'sale', 0),
  ('pos', 'cortes', 0),
  ('pos', 'clientes', 0),
  ('pos', 'facturacion', 0),
  ('pos', 'descuentos', 0),
  ('pos', 'kpis', 0),
  ('pos', 'kiosks', 0),
  ('inventory', 'products', 0),
  ('inventory', 'inventory', 0),
  ('inventory', 'providers', 0),
  ('inventory', 'purchase-orders', 0),
  ('receivables', 'credit-sales', 0),
  ('receivables', 'accounts-receivable', 0),
  ('receivables', 'payments', 0),
  ('receivables', 'credit-customers', 0),
  ('kpis', 'kpis', 0),
  ('kpis', 'accounting-reports', 0),
  ('kpis', 'automated-reports', 0);

INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
SELECT DISTINCT
  module_role.user_company_id,
  scope_catalog.module_slug,
  scope_catalog.tab_key,
  CASE
    WHEN scope_catalog.protected_scope = 1
      AND LOWER(COALESCE(user_company.role, 'user')) NOT IN ('root', 'superadmin', 'super admin') THEN 0
    WHEN LOWER(COALESCE(user_company.role, 'user')) = 'user'
      AND scope_catalog.module_slug IN ('config_center', 'human_resources')
      AND CONCAT(scope_catalog.module_slug, '.', scope_catalog.tab_key) NOT IN (
        'config_center.profile',
        'config_center.personal-performance',
        'human_resources.attendance',
        'human_resources.control',
        'human_resources.announcements',
        'human_resources.assets',
        'human_resources.permissions'
      ) THEN 0
    ELSE 1
  END
FROM user_company_module_roles module_role
JOIN user_companies user_company
  ON user_company.id = module_role.user_company_id
JOIN indice_tab_scope_catalog scope_catalog
  ON scope_catalog.module_slug = module_role.module_slug
LEFT JOIN user_company_tab_permissions existing_permission
  ON existing_permission.user_company_id = module_role.user_company_id
 AND existing_permission.module_slug = scope_catalog.module_slug
 AND existing_permission.tab_key = scope_catalog.tab_key
WHERE existing_permission.id IS NULL;

INSERT INTO user_invitation_tab_permissions (invitation_id, module_slug, tab_key, can_view)
SELECT
  invitation.id,
  scope_catalog.module_slug,
  scope_catalog.tab_key,
  CASE
    WHEN scope_catalog.protected_scope = 1
      AND LOWER(COALESCE(invitation.role, 'user')) NOT IN ('root', 'superadmin', 'super admin') THEN 0
    WHEN LOWER(COALESCE(invitation.role, 'user')) = 'user'
      AND scope_catalog.module_slug IN ('config_center', 'human_resources')
      AND CONCAT(scope_catalog.module_slug, '.', scope_catalog.tab_key) NOT IN (
        'config_center.profile',
        'config_center.personal-performance',
        'human_resources.attendance',
        'human_resources.control',
        'human_resources.announcements',
        'human_resources.assets',
        'human_resources.permissions'
      ) THEN 0
    ELSE 1
  END
FROM user_invitations invitation
JOIN indice_tab_scope_catalog scope_catalog
  ON JSON_CONTAINS(
    COALESCE(invitation.module_slugs_json, JSON_ARRAY()),
    JSON_QUOTE(scope_catalog.module_slug)
  )
LEFT JOIN user_invitation_tab_permissions existing_permission
  ON existing_permission.invitation_id = invitation.id
 AND existing_permission.module_slug = scope_catalog.module_slug
 AND existing_permission.tab_key = scope_catalog.tab_key
WHERE LOWER(COALESCE(invitation.status, 'pending')) = 'pending'
  AND existing_permission.id IS NULL;

DROP TEMPORARY TABLE indice_tab_scope_catalog;
