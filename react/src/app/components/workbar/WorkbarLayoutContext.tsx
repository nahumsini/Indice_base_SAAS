import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { workspaceStateApi } from '../../api/workspaceState';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import {
  WORKBAR_DEFAULTS, WORKBAR_MODULE_KEY, WORKBAR_TAB_KEY, cacheWorkbarPreferences,
  parseWorkbarPreferences, readWorkbarCache, workbarPreferenceActor,
  type WorkbarLayoutState, type WorkbarPosition, type WorkbarPreferences,
} from './workbarPreferences';
export { isWorkbarPosition, type WorkbarPosition } from './workbarPreferences';

type WorkbarLayoutContextValue = WorkbarLayoutState & {
  dualScreenAvailable: boolean;
  isDualScreenActive: boolean;
  preferenceScope: string | null;
  preferencesReady: boolean;
  preferenceError: 'load' | null;
  savingPreferences: boolean;
  retryPreferences: () => void;
  savePreferences: (state: WorkbarLayoutState) => Promise<void>;
  closeDualScreen: () => Promise<void>;
  setPosition: (position: WorkbarPosition) => Promise<void>;
  setDualScreenEnabled: (enabled: boolean) => Promise<void>;
};
type Context = { actor: string; valid: boolean; ready: boolean; saving: boolean; preferences: WorkbarPreferences };
type Snapshot = { actor: string; ready: boolean; saving: boolean; error: 'load' | null; preferences: WorkbarPreferences };
const DUAL_SCREEN_MEDIA_QUERY = '(min-width: 1280px)';
const isEmbeddedWorkspacePane = typeof window !== 'undefined' && window.self !== window.top;
const WorkbarLayoutContext = createContext<WorkbarLayoutContextValue | null>(null);

export function WorkbarLayoutProvider({ children }: { children: ReactNode }) {
  useAuthorizationRevision();
  const actor = workbarPreferenceActor(getCachedAuthSession());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [reload, setReload] = useState(0);
  const contextRef = useRef<Context | null>(null);
  const [dualScreenAvailable, setDualScreenAvailable] = useState(() => typeof window !== 'undefined'
    && window.matchMedia(DUAL_SCREEN_MEDIA_QUERY).matches);
  const isCurrent = useCallback((context: Context) => context.valid && contextRef.current === context
    && workbarPreferenceActor(getCachedAuthSession()) === context.actor, []);
  const publish = useCallback((context: Context, error: 'load' | null = null) => {
    if (isCurrent(context)) setSnapshot({ actor: context.actor, ready: context.ready,
      saving: context.saving, preferences: context.preferences, error });
  }, [isCurrent]);

  useEffect(() => {
    const query = window.matchMedia(DUAL_SCREEN_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => setDualScreenAvailable(event.matches);
    setDualScreenAvailable(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    // Embedded workspaces never restore or write the primary shell preference.
    if (!actor || isEmbeddedWorkspacePane) { contextRef.current = null; setSnapshot(null); return; }
    const context: Context = { actor, valid: true, ready: false, saving: false, preferences: { ...WORKBAR_DEFAULTS } };
    contextRef.current = context;
    publish(context);
    void workspaceStateApi.get(WORKBAR_MODULE_KEY, WORKBAR_TAB_KEY).then(async response => {
      if (!isCurrent(context)) return;
      const missing = response.state && typeof response.state === 'object'
        && !Array.isArray(response.state) && Object.keys(response.state).length === 0;
      const remote = parseWorkbarPreferences(response.state);
      if (!remote && !missing) throw new Error('Unsupported navigation preferences.');
      const cached = missing ? readWorkbarCache(actor) : null;
      let preferences = remote ?? cached ?? { ...WORKBAR_DEFAULTS };
      if (cached || (remote && (!('version' in response.state) || Boolean(response.expiresAt)))) {
        // Migrate only the cache explicitly owned by this user/company, never another actor's state.
        const saved = await workspaceStateApi.save(WORKBAR_MODULE_KEY, WORKBAR_TAB_KEY, preferences);
        if (!isCurrent(context)) return;
        const confirmed = parseWorkbarPreferences(saved.state);
        if (!confirmed) throw new Error('Unsupported navigation preference response.');
        preferences = confirmed;
      }
      context.preferences = preferences;
      context.ready = true;
      cacheWorkbarPreferences(actor, preferences);
      publish(context);
    }).catch(() => { if (isCurrent(context)) {
      context.preferences = readWorkbarCache(actor) ?? context.preferences;
      publish(context, 'load');
    } });
    return () => { context.valid = false; };
  }, [actor, reload, isCurrent, publish]);

  const savePreferences = useCallback(async (state: WorkbarLayoutState) => {
    const context = contextRef.current;
    const next = parseWorkbarPreferences({ ...state, version: 1 });
    if (!context || !context.ready || !isCurrent(context) || context.saving || !next || isEmbeddedWorkspacePane)
      throw new Error('Navigation preferences are not ready.');
    context.saving = true;
    publish(context);
    try {
      const response = await workspaceStateApi.save(WORKBAR_MODULE_KEY, WORKBAR_TAB_KEY, next);
      if (!isCurrent(context)) throw new Error('Navigation preference account changed.');
      const confirmed = parseWorkbarPreferences(response.state);
      if (!confirmed) throw new Error('Unsupported navigation preference response.');
      context.preferences = confirmed;
      cacheWorkbarPreferences(context.actor, confirmed);
    } finally {
      context.saving = false;
      publish(context);
    }
  }, [isCurrent, publish]);
  const updatePreference = useCallback((change: Partial<WorkbarLayoutState>) => {
    const context = contextRef.current;
    if (!context || !isCurrent(context)) return Promise.reject(new Error('Navigation preference account changed.'));
    return savePreferences({ ...context.preferences, ...change });
  }, [isCurrent, savePreferences]);
  const current = snapshot?.actor === actor ? snapshot : null;
  const preferences = current?.preferences ?? WORKBAR_DEFAULTS;
  const preferencesReady = Boolean(actor && (isEmbeddedWorkspacePane || current?.ready));
  const value = useMemo<WorkbarLayoutContextValue>(() => ({
    position: preferences.position, dualScreenEnabled: preferences.dualScreenEnabled,
    dualScreenAvailable, isDualScreenActive: isEmbeddedWorkspacePane
      || (preferencesReady && preferences.dualScreenEnabled && dualScreenAvailable),
    preferenceScope: actor, preferencesReady, preferenceError: current?.error ?? null,
    savingPreferences: current?.saving ?? false,
    retryPreferences: () => setReload(value => value + 1), savePreferences,
    closeDualScreen: () => updatePreference({ dualScreenEnabled: false }),
    setPosition: position => updatePreference({ position }),
    setDualScreenEnabled: dualScreenEnabled => updatePreference({ dualScreenEnabled }),
  }), [actor, current?.error, current?.saving, dualScreenAvailable, preferences, preferencesReady, savePreferences, updatePreference]);
  return <WorkbarLayoutContext.Provider value={value}>{children}</WorkbarLayoutContext.Provider>;
}
export function useWorkbarLayout() {
  const value = useContext(WorkbarLayoutContext);
  if (!value) throw new Error('useWorkbarLayout must be used within WorkbarLayoutProvider.');
  return value;
}
