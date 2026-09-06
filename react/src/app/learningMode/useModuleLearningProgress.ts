import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCachedAuthSession } from '../api/authSessionStore';
import type { AuthSessionResponse } from '../api/auth.types';

const progressVersion = 1 as const;
const progressStoragePrefix = 'indice.learningMode.module';

type LearningProgressSessionScope = Pick<AuthSessionResponse, 'user' | 'company'>;

export interface ModuleLearningProgress {
  expanded: boolean;
  understoodJourneyIds: string[];
  version: typeof progressVersion;
}

export const defaultModuleLearningProgress: ModuleLearningProgress = {
  expanded: false,
  understoodJourneyIds: [],
  version: progressVersion,
};

export function normalizeModuleLearningProgress(value: unknown): ModuleLearningProgress {
  if (!value || typeof value !== 'object') {
    return { ...defaultModuleLearningProgress };
  }

  const candidate = value as Partial<ModuleLearningProgress>;
  return {
    expanded: candidate.expanded === true,
    understoodJourneyIds: Array.isArray(candidate.understoodJourneyIds)
      ? [...new Set(candidate.understoodJourneyIds.filter(
          (id): id is string => typeof id === 'string' && id.trim().length > 0,
        ))]
      : [],
    version: progressVersion,
  };
}

export function buildModuleLearningProgressKey(
  guideId: string,
  session: LearningProgressSessionScope,
) {
  return `${progressStoragePrefix}:${guideId}:company-${session.company.id}:user-${session.user.id}`;
}

export function getModuleLearningProgressStorageKey(guideId: string) {
  const session = getCachedAuthSession();
  return session
    ? buildModuleLearningProgressKey(guideId, session)
    : `${progressStoragePrefix}:${guideId}:unscoped`;
}

const readProgress = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return { ...defaultModuleLearningProgress };
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue
      ? normalizeModuleLearningProgress(JSON.parse(storedValue))
      : { ...defaultModuleLearningProgress };
  } catch {
    return { ...defaultModuleLearningProgress };
  }
};

export function useModuleLearningProgress(guideId: string) {
  const storageKey = getModuleLearningProgressStorageKey(guideId);
  const [storedState, setStoredState] = useState(() => ({
    storageKey,
    value: readProgress(storageKey),
  }));
  const progress = storedState.storageKey === storageKey
    ? storedState.value
    : readProgress(storageKey);

  const updateProgress = useCallback((
    update: (current: ModuleLearningProgress) => ModuleLearningProgress,
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
      // Keep the current session usable when browser storage is unavailable.
    }
  }, [storageKey, storedState]);

  return useMemo(() => ({
    progress,
    markUnderstood: (journeyId: string) => updateProgress((current) => ({
      ...current,
      understoodJourneyIds: current.understoodJourneyIds.includes(journeyId)
        ? current.understoodJourneyIds
        : [...current.understoodJourneyIds, journeyId],
    })),
    setExpanded: (expanded: boolean) => updateProgress((current) => ({
      ...current,
      expanded,
    })),
  }), [progress, updateProgress]);
}
