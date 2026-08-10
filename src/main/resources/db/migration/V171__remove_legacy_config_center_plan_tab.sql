-- The legacy static plan comparison was replaced by the connected billing surface.
DELETE FROM user_company_tab_permissions
WHERE module_slug = 'config_center'
  AND tab_key = 'plan';

DELETE FROM user_invitation_tab_permissions
WHERE module_slug = 'config_center'
  AND tab_key = 'plan';
