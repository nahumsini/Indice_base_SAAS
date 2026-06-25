UPDATE user_company_tab_permissions tp
JOIN user_companies uc ON uc.id = tp.user_company_id
JOIN user_company_module_roles mr
  ON mr.user_company_id = uc.id
 AND mr.module_slug = 'human_resources'
SET tp.can_view = 1
WHERE LOWER(COALESCE(uc.role, 'user')) = 'user'
  AND tp.module_slug = 'human_resources'
  AND tp.tab_key IN ('announcements', 'assets', 'attendance', 'permissions', 'records');

UPDATE user_invitation_tab_permissions tp
JOIN user_invitations invitation ON invitation.id = tp.invitation_id
SET tp.can_view = 1
WHERE LOWER(COALESCE(invitation.role, 'user')) = 'user'
  AND JSON_CONTAINS(COALESCE(invitation.module_slugs_json, JSON_ARRAY()), JSON_QUOTE('human_resources'))
  AND tp.module_slug = 'human_resources'
  AND tp.tab_key IN ('announcements', 'assets', 'attendance', 'permissions', 'records');
