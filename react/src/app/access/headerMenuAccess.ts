import type { AuthSessionResponse } from '../api/auth.types';
import { canAccessHomePanelTab, hasUnrestrictedTabAccess, type HomePanelTabId } from './accessRules';

export function canOpenAccountTab(session: AuthSessionResponse | null | undefined, tab: HomePanelTabId) {
  if (!session || session.demoMode) return false;
  return (hasUnrestrictedTabAccess(session.user.role) || Boolean(session.user.module_slugs?.includes('config_center')))
    && canAccessHomePanelTab(session.user.role, tab, session.user.tab_permission_keys, session.user.tab_permissions_configured);
}
