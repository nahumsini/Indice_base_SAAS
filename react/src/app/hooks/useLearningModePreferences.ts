import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AuthSessionResponse } from '../api/auth.types';
import {
  buildLearningModePreferenceKey,
  defaultLearningModePreferences,
  readLearningModePreferences,
  writeLearningModePreferences,
  type LearningModePreferences,
} from '../learningMode/preferences';

type LearningModePreferenceField = 'active' | 'visible' | 'step';

export function useLearningModePreferences(session: AuthSessionResponse | null | undefined) {
  const [preferences, setPreferences] = useState<LearningModePreferences>(() => ({
    ...defaultLearningModePreferences,
  }));
  const activeStorageKeyRef = useRef<string | null>(null);
  const sessionScope = session ? `${session.user.id}:${session.company.id}` : null;

  useEffect(() => {
    if (!session || !sessionScope || typeof window === 'undefined') {
      return;
    }

    const storageKey = buildLearningModePreferenceKey(session);
    const storedPreferences = readLearningModePreferences(window.localStorage, storageKey);

    activeStorageKeyRef.current = storageKey;
    setPreferences(storedPreferences);
    writeLearningModePreferences(window.localStorage, storageKey, storedPreferences);
  }, [sessionScope]);

  const updatePreference = useCallback(<Field extends LearningModePreferenceField>(
    field: Field,
    value: SetStateAction<LearningModePreferences[Field]>,
  ) => {
    setPreferences((current) => {
      const nextValue = typeof value === 'function'
        ? (value as (previous: LearningModePreferences[Field]) => LearningModePreferences[Field])(current[field])
        : value;
      const nextPreferences = { ...current, [field]: nextValue };
      const storageKey = activeStorageKeyRef.current;

      if (storageKey && typeof window !== 'undefined') {
        writeLearningModePreferences(window.localStorage, storageKey, nextPreferences);
      }

      return nextPreferences;
    });
  }, []);

  const setLearningModeActive = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => updatePreference('active', value),
    [updatePreference],
  );
  const setLearningModeVisible = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => updatePreference('visible', value),
    [updatePreference],
  );
  const setLearningStep = useCallback<Dispatch<SetStateAction<number>>>(
    (value) => updatePreference('step', value),
    [updatePreference],
  );

  return {
    learningModeActive: preferences.active,
    learningModeVisible: preferences.visible,
    learningStep: preferences.step,
    setLearningModeActive,
    setLearningModeVisible,
    setLearningStep,
  };
}
