INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
SELECT mr.user_company_id, tab_catalog.module_slug, tab_catalog.tab_key, 1
FROM user_company_module_roles mr
JOIN (
  SELECT 'config_center' AS module_slug, 'profile' AS tab_key
  UNION ALL SELECT 'config_center', 'business-structure'
  UNION ALL SELECT 'config_center', 'business-profile'
  UNION ALL SELECT 'config_center', 'personal-performance'
  UNION ALL SELECT 'config_center', 'users'
  UNION ALL SELECT 'human_resources', 'collaborators'
  UNION ALL SELECT 'human_resources', 'attendance'
  UNION ALL SELECT 'human_resources', 'control'
  UNION ALL SELECT 'human_resources', 'payroll'
  UNION ALL SELECT 'human_resources', 'announcements'
  UNION ALL SELECT 'human_resources', 'assets'
  UNION ALL SELECT 'human_resources', 'records'
  UNION ALL SELECT 'human_resources', 'permissions'
  UNION ALL SELECT 'human_resources', 'incentives'
  UNION ALL SELECT 'human_resources', 'kpis'
) tab_catalog
  ON tab_catalog.module_slug = mr.module_slug
LEFT JOIN user_company_tab_permissions existing_permission
  ON existing_permission.user_company_id = mr.user_company_id
 AND existing_permission.module_slug = tab_catalog.module_slug
 AND existing_permission.tab_key = tab_catalog.tab_key
WHERE existing_permission.id IS NULL;

INSERT INTO user_invitation_tab_permissions (invitation_id, module_slug, tab_key, can_view)
SELECT invitation.id, tab_catalog.module_slug, tab_catalog.tab_key, 1
FROM user_invitations invitation
JOIN (
  SELECT 'config_center' AS module_slug, 'profile' AS tab_key
  UNION ALL SELECT 'config_center', 'business-structure'
  UNION ALL SELECT 'config_center', 'business-profile'
  UNION ALL SELECT 'config_center', 'personal-performance'
  UNION ALL SELECT 'config_center', 'users'
  UNION ALL SELECT 'human_resources', 'collaborators'
  UNION ALL SELECT 'human_resources', 'attendance'
  UNION ALL SELECT 'human_resources', 'control'
  UNION ALL SELECT 'human_resources', 'payroll'
  UNION ALL SELECT 'human_resources', 'announcements'
  UNION ALL SELECT 'human_resources', 'assets'
  UNION ALL SELECT 'human_resources', 'records'
  UNION ALL SELECT 'human_resources', 'permissions'
  UNION ALL SELECT 'human_resources', 'incentives'
  UNION ALL SELECT 'human_resources', 'kpis'
) tab_catalog
  ON JSON_CONTAINS(COALESCE(invitation.module_slugs_json, JSON_ARRAY()), JSON_QUOTE(tab_catalog.module_slug))
LEFT JOIN user_invitation_tab_permissions existing_permission
  ON existing_permission.invitation_id = invitation.id
 AND existing_permission.module_slug = tab_catalog.module_slug
 AND existing_permission.tab_key = tab_catalog.tab_key
WHERE COALESCE(invitation.status, 'pending') = 'pending'
  AND existing_permission.id IS NULL;
