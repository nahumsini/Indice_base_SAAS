UPDATE user_company_tab_permissions tp
JOIN user_companies uc ON uc.id = tp.user_company_id
SET tp.can_view = 0
WHERE LOWER(COALESCE(uc.role, 'user')) = 'user'
  AND CONCAT(tp.module_slug, '.', tp.tab_key) NOT IN (
      'config_center.profile',
      'config_center.personal-performance',
      'human_resources.attendance'
  );

UPDATE user_invitation_tab_permissions tp
JOIN user_invitations invitation ON invitation.id = tp.invitation_id
SET tp.can_view = 0
WHERE LOWER(COALESCE(invitation.role, 'user')) = 'user'
  AND CONCAT(tp.module_slug, '.', tp.tab_key) NOT IN (
      'config_center.profile',
      'config_center.personal-performance',
      'human_resources.attendance'
  );
