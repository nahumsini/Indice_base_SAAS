import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard';
import {
  buildDefaultModuleCatalog,
  mapBackendModuleToCard,
  mergeDashboardModules,
  type DashboardModuleCard,
} from '../config/moduleCatalog';
import { useAuthorizationRevision } from './useAuthorizationRevision';

type Translator = Record<string, any>;

export function useAccessibleModuleCatalog(t: Translator) {
  const [availableModules, setAvailableModules] = useState<DashboardModuleCard[]>([]);
  const authorizationRevision = useAuthorizationRevision();

  useEffect(() => {
    let active = true;
    const defaultModules = buildDefaultModuleCatalog(t);
    setAvailableModules([]);

    const loadModules = async () => {
      try {
        const backendModules = await dashboardApi.listModules();
        if (!active) {
          return;
        }

        const mappedModules = backendModules
          .map((module) => mapBackendModuleToCard(module, t))
          .filter((module): module is DashboardModuleCard => module !== null);

        const resolvedModules = mergeDashboardModules(mappedModules, defaultModules, {
          // The backend registry is authoritative. Missing modules may be
          // globally disabled, unassigned, unreleased, or not entitled.
          includeMissingFallbacks: false,
        });

        setAvailableModules(resolvedModules);
      } catch {
        if (active) {
          // Fail closed: a stale local catalog must never resurrect a module
          // that platform administration disabled globally.
          setAvailableModules([]);
        }
      }
    };

    void loadModules();

    return () => {
      active = false;
    };
  }, [authorizationRevision, t]);

  return availableModules;
}
