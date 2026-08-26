import { useCallback, useEffect, useState } from 'react';
import { canAccessHumanResourcesTab, type HumanResourcesTabId } from '../../../access/accessRules';
import { authApi } from '../../../api/auth';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';

interface HumanResourcesSessionAccess {
  role: string | null;
  tabPermissionKeys: string[];
  tabPermissionsConfigured: boolean;
}

const deniedSessionAccess: HumanResourcesSessionAccess = {
  role: null,
  tabPermissionKeys: [],
  tabPermissionsConfigured: false,
};

export function useHumanResourcesAccess() {
  const [sessionAccess, setSessionAccess] = useState<HumanResourcesSessionAccess>(deniedSessionAccess);
  const [isAccessLoaded, setIsAccessLoaded] = useState(false);
  const authorizationRevision = useAuthorizationRevision();

  useEffect(() => {
    let active = true;
    setIsAccessLoaded(false);

    authApi.getSessionOrNull()
      .then(session => {
        if (!active) return;
        setSessionAccess({
          role: session?.user.role ?? null,
          tabPermissionKeys: session?.user.tab_permission_keys ?? [],
          tabPermissionsConfigured: Boolean(session?.user.tab_permissions_configured),
        });
      })
      .catch(() => {
        if (active) setSessionAccess(deniedSessionAccess);
      })
      .finally(() => {
        if (active) setIsAccessLoaded(true);
      });

    return () => { active = false; };
  }, [authorizationRevision]);

  const canAccessTab = useCallback((tabId: HumanResourcesTabId) => canAccessHumanResourcesTab(
    sessionAccess.role,
    tabId,
    sessionAccess.tabPermissionKeys,
    sessionAccess.tabPermissionsConfigured,
  ), [sessionAccess]);

  return { canAccessTab, isAccessLoaded };
}
