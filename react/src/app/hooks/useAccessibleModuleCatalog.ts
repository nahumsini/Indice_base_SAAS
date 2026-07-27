import { useEffect, useState } from 'react';
import { authApi, type AuthSessionResponse } from '../api/auth';
import { dashboardApi } from '../api/dashboard';
import { isAdminAccessRole } from '../access/accessRules';
import {
  buildDefaultModuleCatalog,
  FRONTEND_OWNED_BASIC_MODULE_ROUTES,
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

        const frontendOwnedModules = defaultModules.filter((module) => (
          FRONTEND_OWNED_BASIC_MODULE_ROUTES.includes(module.route)
        ));

        setAvailableModules(mergeDashboardModules([...mappedModules, ...frontendOwnedModules], defaultModules, {
          // Administrators must be able to use the complete frontend catalog
          // while a legacy/local database is still catching up with module
          // entitlement migrations. Regular users remain restricted to the
          // modules explicitly returned by the backend.
          includeMissingFallbacks: canUseDefaultCatalogFallback(session),
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
