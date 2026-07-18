import { useEffect, useState } from 'react';
import { dashboardApi } from '../../../../api/dashboard';
import { humanResourcesApi } from '../../../../api/humanResources';
import { listProcesses } from '../../Processes/processesApi';
import type {
  ProcessBusinessOption,
  ProcessCollaboratorOption,
  ProcessRecord,
  ProcessUnitOption,
} from '../../Processes/types';
import { listProjects, type ProjectRecord } from '../../Projects/projectsApi';
import {
  normalizeBusinessOption,
  normalizeCollaboratorOption,
  normalizeUnitOption,
} from '../utils/agendaTaskPayloads';

export function useAgendaCatalogs() {
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isProjectsCatalogReady, setIsProjectsCatalogReady] = useState(false);
  const [catalogUnits, setCatalogUnits] = useState<ProcessUnitOption[]>([]);
  const [catalogBusinesses, setCatalogBusinesses] = useState<ProcessBusinessOption[]>([]);
  const [catalogCollaborators, setCatalogCollaborators] = useState<ProcessCollaboratorOption[]>([]);

  useEffect(() => {
    const loadRelationsForTaskForm = async () => {
      const [projectResult, processResult, unitResult, businessResult, hrUserResult] = await Promise.allSettled([
        listProjects(),
        listProcesses(),
        dashboardApi.listUnits(),
        dashboardApi.listBusinesses(),
        humanResourcesApi.listHrUsers(),
      ]);

      setProjects(projectResult.status === 'fulfilled' ? projectResult.value : []);
      setIsProjectsCatalogReady(projectResult.status === 'fulfilled');
      setProcesses(processResult.status === 'fulfilled' ? processResult.value : []);
      setCatalogUnits(
        unitResult.status === 'fulfilled'
          ? unitResult.value
              .map(normalizeUnitOption)
              .filter((option) => option.name.length > 0)
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
      setCatalogBusinesses(
        businessResult.status === 'fulfilled'
          ? businessResult.value
              .map(normalizeBusinessOption)
              .filter((option) => option.name.length > 0)
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
      setCatalogCollaborators(
        hrUserResult.status === 'fulfilled'
          ? hrUserResult.value.items
              .map(normalizeCollaboratorOption)
              .filter((option): option is ProcessCollaboratorOption => option !== null)
              .sort((left, right) => left.name.localeCompare(right.name))
          : [],
      );
    };

    void loadRelationsForTaskForm();
  }, []);

  return {
    catalogBusinesses,
    catalogCollaborators,
    catalogUnits,
    processes,
    projects,
    isProjectsCatalogReady,
  };
}
