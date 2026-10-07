import type { SetStateAction } from 'react';
import { getCachedAuthSession } from '../api/authSessionStore';
import { isLearningCharacterId, learningCharacterStorageKey, type LearningCharacterId } from './characters';
import { useLearningViewState } from './useLearningViewState';
const initial: {
    characterId: LearningCharacterId | null;
    version: 1;
} = { characterId: null, version: 1 };
function normalize(value: unknown) {
    const candidate = value && typeof value === 'object' ? (value as {
        characterId?: unknown;
    }).characterId : null;
    return { ...initial, characterId: isLearningCharacterId(candidate) ? candidate : null };
}
export function useLearningCharacter() {
    const session = getCachedAuthSession();
    // The historical unscoped choice cannot be attributed to the current actor safely.
    const key = session ? `${learningCharacterStorageKey}:company-${session.company.id}:user-${session.user.id}` : `${learningCharacterStorageKey}:unscoped`;
    const state = useLearningViewState('learning-view-character', key, initial, normalize);
    const set = (value: SetStateAction<LearningCharacterId | null>) => state.update(current => ({ ...current, characterId: typeof value === 'function' ? value(current.characterId) : value }));
    return [state.value.characterId, set] as const;
}
