import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCachedAuthSession } from '../../../api/authSessionStore';
import type { HumanResourcesGuidanceTabId } from './types';
import type {
  EmployeeLearningExemptibleRequirementId,
  EmployeeLearningException,
} from './humanResourcesLearningModel';
import {
  buildHumanResourcesLearningProgressKey,
  defaultHumanResourcesLearningProgress,
  normalizeHumanResourcesLearningProgress,
  type HumanResourcesLearningProgress,
} from './humanResourcesLearningProgress';

export function getHumanResourcesLearningProgressStorageKey() {
  const session = getCachedAuthSession();
  return session
    ? buildHumanResourcesLearningProgressKey(session)
    : 'indice.learningMode.humanResources:unscoped';
}

const readProgress = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return { ...defaultHumanResourcesLearningProgress };
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue
      ? normalizeHumanResourcesLearningProgress(JSON.parse(storedValue))
      : { ...defaultHumanResourcesLearningProgress };
  } catch {
    return { ...defaultHumanResourcesLearningProgress };
  }
};

export function useHumanResourcesLearningProgress() {
  const storageKey = getHumanResourcesLearningProgressStorageKey();
  const [storedState, setStoredState] = useState(() => ({
    storageKey,
    value: readProgress(storageKey),
  }));
  const progress = storedState.storageKey === storageKey
    ? storedState.value
    : readProgress(storageKey);

  const updateProgress = useCallback((
    update: (current: HumanResourcesLearningProgress) => HumanResourcesLearningProgress,
  ) => {
    setStoredState((current) => {
      const currentValue = current.storageKey === storageKey
        ? current.value
        : readProgress(storageKey);
      return { storageKey, value: update(currentValue) };
    });
  }, [storageKey]);

  useEffect(() => {
    if (storedState.storageKey !== storageKey || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(storedState.value));
    } catch {
      // Storage may be unavailable; the current session still keeps its progress.
    }
  }, [storageKey, storedState]);

  return useMemo(() => ({
    progress,
    markApplied: (areaId: HumanResourcesGuidanceTabId) => updateProgress((current) => ({
      ...current,
      appliedAreaIds: current.appliedAreaIds.includes(areaId)
        ? current.appliedAreaIds
        : [...current.appliedAreaIds, areaId],
    })),
    markUnderstood: (areaId: HumanResourcesGuidanceTabId) => updateProgress((current) => ({
      ...current,
      understoodAreaIds: current.understoodAreaIds.includes(areaId)
        ? current.understoodAreaIds
        : [...current.understoodAreaIds, areaId],
    })),
    removeEmployeeException: (
      employeeId: number,
      requirementId: EmployeeLearningExemptibleRequirementId,
    ) => updateProgress((current) => {
      const employeeExceptions = { ...(current.employeeExceptions[String(employeeId)] ?? {}) };
      delete employeeExceptions[requirementId];
      return {
        ...current,
        employeeExceptions: {
          ...current.employeeExceptions,
          [String(employeeId)]: employeeExceptions,
        },
      };
    }),
    restartJourneyView: (areaId: HumanResourcesGuidanceTabId) => updateProgress((current) => ({
      ...current,
      activeAreaId: areaId,
      expanded: true,
    })),
    selectArea: (areaId: HumanResourcesGuidanceTabId) => updateProgress((current) => ({
      ...current,
      activeAreaId: areaId,
    })),
    selectEmployee: (employeeId: number | null) => updateProgress((current) => ({
      ...current,
      selectedEmployeeId: employeeId,
    })),
    setEmployeeException: (
      employeeId: number,
      requirementId: EmployeeLearningExemptibleRequirementId,
      exception: EmployeeLearningException,
    ) => updateProgress((current) => ({
      ...current,
      employeeExceptions: {
        ...current.employeeExceptions,
        [String(employeeId)]: {
          ...(current.employeeExceptions[String(employeeId)] ?? {}),
          [requirementId]: exception,
        },
      },
    })),
    setExpanded: (expanded: boolean) => updateProgress((current) => ({ ...current, expanded })),
  }), [progress, updateProgress]);
}
