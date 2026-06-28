UPDATE user_company_tab_permissions tp
JOIN user_companies uc ON uc.id = tp.user_company_id
SET tp.can_view = 0
WHERE LOWER(COALESCE(uc.role, 'user')) = 'user'
  AND tp.module_slug = 'human_resources'
  AND tp.tab_key = 'records';

UPDATE user_invitation_tab_permissions tp
JOIN user_invitations invitation ON invitation.id = tp.invitation_id
SET tp.can_view = 0
WHERE LOWER(COALESCE(invitation.role, 'user')) = 'user'
  AND tp.module_slug = 'human_resources'
  AND tp.tab_key = 'records';
