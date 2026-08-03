import type { AuthSessionResponse } from '../api/auth.types';

export type LearningModePreferences = {
  version: 1;
  active: boolean;
  visible: boolean;
  step: number;
};

type LearningModeSessionScope = Pick<AuthSessionResponse, 'user' | 'company'>;
type LearningModeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const defaultLearningModePreferences: LearningModePreferences = {
  version: 1,
  active: true,
  visible: true,
  step: 0,
};

export function buildLearningModePreferenceKey(session: LearningModeSessionScope) {
  return `indice.app.learningMode.user-${session.user.id}.company-${session.company.id}`;
}

export function readLearningModePreferences(
  storage: LearningModeStorage,
  key: string,
): LearningModePreferences {
  try {
    const storedValue = storage.getItem(key);
    if (storedValue === null) {
      return { ...defaultLearningModePreferences };
    }

    const parsed = JSON.parse(storedValue) as Partial<LearningModePreferences>;
    if (
      parsed.version !== 1
      || typeof parsed.active !== 'boolean'
      || typeof parsed.visible !== 'boolean'
      || typeof parsed.step !== 'number'
      || !Number.isFinite(parsed.step)
    ) {
      return { ...defaultLearningModePreferences };
    }

    return {
      version: 1,
      active: parsed.active,
      visible: parsed.visible,
      step: Math.max(0, Math.min(7, Math.trunc(parsed.step))),
    };
  } catch {
    return { ...defaultLearningModePreferences };
  }
}

export function writeLearningModePreferences(
  storage: LearningModeStorage,
  key: string,
  preferences: LearningModePreferences,
) {
  try {
    storage.setItem(key, JSON.stringify(preferences));
  } catch {
    // Keep the experience available even when browser storage is unavailable.
  }
}
