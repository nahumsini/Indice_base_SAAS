import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard';
import {
  buildDefaultModuleCatalog,
  mapBackendModuleToCard,
  mergeDashboardModules,
  type DashboardModuleCard,
} from '../config/moduleCatalog';

type Translator = Record<string, any>;

export function useAccessibleModuleCatalog(t: Translator) {
  const [availableModules, setAvailableModules] = useState<DashboardModuleCard[]>([]);

  useEffect(() => {
    let active = true;
    const defaultModules = buildDefaultModuleCatalog(t);

    dashboardApi.listModules()
      .then((backendModules) => {
        if (!active) {
          return;
        }

        const mappedModules = backendModules
          .map((module) => mapBackendModuleToCard(module, t))
          .filter((module): module is DashboardModuleCard => module !== null);

        setAvailableModules(mergeDashboardModules(mappedModules, defaultModules, {
          includeMissingFallbacks: false,
        }));
      })
      .catch(() => {
        if (active) {
          setAvailableModules([]);
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  return availableModules;
}
