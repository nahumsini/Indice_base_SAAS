import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import type { AuthSessionResponse } from '../api/auth.types';
import { getCachedAuthSession } from '../api/authSessionStore';
import { workspaceStateApi } from '../api/workspaceState';
import {
  buildLearningModePreferenceKey, defaultLearningModePreferences, parseLearningModePreferences,
  readLearningModePreferences, writeLearningModePreferences,
  type LearningModePreferences, type LearningModeSettings,
} from '../learningMode/preferences';

const moduleKey = 'system';
const tabKey = 'learning-mode';
const scopeOf = (session: AuthSessionResponse | null | undefined) => session
  ? buildLearningModePreferenceKey(session) : null;
type PreferenceContext = {
  key: string;
  valid: boolean;
  ready: boolean;
  revision: number;
  preferences: LearningModePreferences;
  queue: Promise<unknown>;
  retryUpdate?: (current: LearningModePreferences) => Partial<LearningModeSettings>;
};

export function useLearningModePreferences(session: AuthSessionResponse | null | undefined) {
  const storageKey = scopeOf(session);
  const contextRef = useRef<PreferenceContext | null>(null);
  const [snapshot, setSnapshot] = useState<{ key: string; preferences: LearningModePreferences; ready: boolean } | null>(null);
  const [preferenceError, setPreferenceError] = useState<'load' | 'save' | null>(null);
  const [reload, setReload] = useState(0);
  const isCurrent = (context: PreferenceContext) => context.valid && contextRef.current === context
    && scopeOf(getCachedAuthSession()) === context.key;
  const publish = useCallback((context: PreferenceContext) => {
    if (!isCurrent(context)) return;
    setSnapshot({ key: context.key, preferences: context.preferences, ready: context.ready });
    try { writeLearningModePreferences(window.localStorage, context.key, context.preferences); } catch { /* Remote persistence remains available. */ }
  }, []);

  useEffect(() => {
    setPreferenceError(null);
    if (!storageKey) { contextRef.current = null; setSnapshot(null); return; }
    const context: PreferenceContext = {
      key: storageKey, valid: true, ready: false, revision: 0,
      preferences: { ...defaultLearningModePreferences }, queue: Promise.resolve(),
    };
    contextRef.current = context;
    setSnapshot(null);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue || !isCurrent(context)) return;
      try {
        const preferences = parseLearningModePreferences(JSON.parse(event.newValue));
        if (preferences) {
          context.revision++;
          context.preferences = preferences;
          // Receiving a cache update cannot turn a failed remote load into a successful one.
          setSnapshot({ key: storageKey, preferences, ready: context.ready });
        }
      } catch { /* Ignore malformed cache entries. */ }
    };
    window.addEventListener('storage', onStorage);
    const revision = context.revision;
    void workspaceStateApi.get(moduleKey, tabKey).then(async (response) => {
      if (!isCurrent(context)) return;
      const remote = parseLearningModePreferences(response.state);
      const missing = response.state && typeof response.state === 'object'
        && !Array.isArray(response.state) && Object.keys(response.state).length === 0;
      if (!remote && !missing) throw new Error('Unsupported learning preferences.');
      if (context.revision === revision) {
        let local = { ...defaultLearningModePreferences };
        try { local = readLearningModePreferences(window.localStorage, storageKey); } catch { /* Storage may be disabled. */ }
        context.preferences = remote ?? local;
      }
      // Migrate the old scoped browser choice once. The secondary pane never seeds defaults.
      if (!remote && window.self === window.top && context.revision === revision) {
        await workspaceStateApi.save(moduleKey, tabKey, context.preferences);
      }
      if (!isCurrent(context)) return;
      context.ready = true;
      publish(context);
    }).catch(() => { if (isCurrent(context)) setPreferenceError('load'); });
    return () => { context.valid = false; window.removeEventListener('storage', onStorage); };
  }, [storageKey, reload, publish]);

  const persist = useCallback((update: (current: LearningModePreferences) => Partial<LearningModeSettings>, background = false) => {
    const context = contextRef.current;
    if (!context || !context.ready || !isCurrent(context)) return Promise.reject(new Error('Learning preferences are not ready.'));
    // Merge when the queued write starts so successive edits cannot lose another field.
    const request = context.queue.catch(() => undefined).then(async () => {
      if (!isCurrent(context)) throw new Error('Learning preference scope changed.');
      const next = parseLearningModePreferences({ ...context.preferences, ...update(context.preferences) });
      if (!next) throw new Error('Invalid learning preferences.');
      const revision = ++context.revision;
      await workspaceStateApi.save(moduleKey, tabKey, next);
      if (!isCurrent(context)) throw new Error('Learning preference scope changed.');
      if (context.revision === revision) {
        context.preferences = next;
        publish(context);
      }
      context.retryUpdate = undefined;
      setPreferenceError(null);
    });
    context.queue = request;
    return request.catch((error: unknown) => {
      if (background && isCurrent(context)) {
        context.retryUpdate = update;
        setPreferenceError('save');
      }
      throw error;
    });
  }, [publish]);
  const saveLearningModeSettings = useCallback((settings: LearningModeSettings) => persist(() => settings), [persist]);
  const updatePreference = useCallback(<Field extends keyof LearningModeSettings>(field: Field, value: SetStateAction<LearningModeSettings[Field]>) => {
    const context = contextRef.current;
    if (!context?.ready || !isCurrent(context)) return;
    void persist(current => ({ [field]: typeof value === 'function'
      ? (value as (previous: LearningModeSettings[Field]) => LearningModeSettings[Field])(current[field]) : value,
    }), true).catch(() => { /* Exposed through preferenceError and retry. */ });
  }, [persist]);
  const setLearningModeActive = useCallback((value: SetStateAction<boolean>) => updatePreference('active', value), [updatePreference]);
  const setLearningModeVisible = useCallback((value: SetStateAction<boolean>) => updatePreference('visible', value), [updatePreference]);
  const setLearningStep = useCallback((value: SetStateAction<number>) => updatePreference('step', value), [updatePreference]);
  const retryPreferences = useCallback(() => {
    const context = contextRef.current;
    if (context?.ready && isCurrent(context)) {
      void persist(context.retryUpdate ?? (() => ({})), true).catch(() => { /* Keep retry available. */ });
    } else setReload(value => value + 1);
  }, [persist]);
  const ready = Boolean(storageKey && snapshot?.key === storageKey && snapshot.ready);
  const preferences = snapshot?.key === storageKey ? snapshot.preferences : defaultLearningModePreferences;
  return {
    // No flash of first-entry guidance before the account preference has loaded.
    learningModeActive: ready && preferences.active,
    learningModeVisible: preferences.visible,
    learningStep: preferences.step,
    preferencesReady: ready, preferenceError, retryPreferences,
    setLearningModeActive, setLearningModeVisible, setLearningStep, saveLearningModeSettings,
  };
}
