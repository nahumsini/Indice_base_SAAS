UPDATE user_company_tab_permissions tp
JOIN user_companies uc ON uc.id = tp.user_company_id
JOIN user_company_module_roles mr
  ON mr.user_company_id = uc.id
 AND mr.module_slug = 'human_resources'
SET tp.can_view = 1
WHERE LOWER(COALESCE(uc.role, 'user')) = 'user'
  AND tp.module_slug = 'human_resources'
  AND tp.tab_key = 'control';

INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
SELECT uc.id, 'human_resources', 'control', 1
FROM user_companies uc
JOIN user_company_module_roles mr
  ON mr.user_company_id = uc.id
 AND mr.module_slug = 'human_resources'
LEFT JOIN user_company_tab_permissions tp
  ON tp.user_company_id = uc.id
 AND tp.module_slug = 'human_resources'
 AND tp.tab_key = 'control'
WHERE LOWER(COALESCE(uc.role, 'user')) = 'user'
  AND tp.id IS NULL;

UPDATE user_invitation_tab_permissions tp
JOIN user_invitations invitation ON invitation.id = tp.invitation_id
SET tp.can_view = 1
WHERE LOWER(COALESCE(invitation.role, 'user')) = 'user'
  AND JSON_CONTAINS(COALESCE(invitation.module_slugs_json, JSON_ARRAY()), JSON_QUOTE('human_resources'))
  AND tp.module_slug = 'human_resources'
  AND tp.tab_key = 'control';

INSERT INTO user_invitation_tab_permissions (invitation_id, module_slug, tab_key, can_view)
SELECT invitation.id, 'human_resources', 'control', 1
FROM user_invitations invitation
LEFT JOIN user_invitation_tab_permissions tp
  ON tp.invitation_id = invitation.id
 AND tp.module_slug = 'human_resources'
 AND tp.tab_key = 'control'
WHERE LOWER(COALESCE(invitation.role, 'user')) = 'user'
  AND JSON_CONTAINS(COALESCE(invitation.module_slugs_json, JSON_ARRAY()), JSON_QUOTE('human_resources'))
  AND tp.id IS NULL;
