import { useEffect, useState } from 'react';
import { authApi, type AuthSessionResponse } from '../api/auth';
import { dashboardApi } from '../api/dashboard';
import { isAdminAccessRole } from '../access/accessRules';
import {
  buildDefaultModuleCatalog,
  mapBackendModuleToCard,
  mergeDashboardModules,
  type DashboardModuleCard,
} from '../config/moduleCatalog';

type Translator = Record<string, any>;

const canUseDefaultCatalogFallback = (session: AuthSessionResponse | null) => {
  return isAdminAccessRole(session?.user.role);
};

export function useAccessibleModuleCatalog(t: Translator) {
  const [availableModules, setAvailableModules] = useState<DashboardModuleCard[]>([]);

  useEffect(() => {
    let active = true;
    const defaultModules = buildDefaultModuleCatalog(t);

    const loadModules = async () => {
      const session = await authApi.getSessionOrNull().catch(() => null);

      try {
        const backendModules = await dashboardApi.listModules();
        if (!active) {
          return;
        }

        const mappedModules = backendModules
          .map((module) => mapBackendModuleToCard(module, t))
          .filter((module): module is DashboardModuleCard => module !== null);

        if (mappedModules.length === 0 && canUseDefaultCatalogFallback(session)) {
          setAvailableModules(defaultModules);
          return;
        }

        setAvailableModules(mergeDashboardModules(mappedModules, defaultModules, {
          includeMissingFallbacks: false,
        }));
      } catch {
        if (active) {
          setAvailableModules(canUseDefaultCatalogFallback(session) ? defaultModules : []);
        }
      }
    };

    void loadModules();

    return () => {
      active = false;
    };
  }, [t]);

  return availableModules;
}
