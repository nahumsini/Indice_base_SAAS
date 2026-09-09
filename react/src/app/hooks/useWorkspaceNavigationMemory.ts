import { useEffect, useRef, useState } from 'react';
import { authApi } from '../api/auth';
import { workspaceStateApi } from '../api/workspaceState';
import { useAuthorizationRevision } from './useAuthorizationRevision';

type WorkspaceState = Record<string, unknown>;

type WorkspaceNavigationMemoryOptions<TState extends WorkspaceState> = {
  moduleKey: string;
  tabKey: string;
  state: TState;
  defaults: TState;
  urlFields?: Partial<Record<keyof TState, string>>;
  onRestore: (state: TState) => void;
  rememberScroll?: boolean;
  enabled?: boolean;
};

type LocalEnvelope<TState> = {
  state: Partial<TState>;
  savedAt: string;
  partial?: boolean;
};

const safeParse = <TState,>(raw: string | null): TState | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TState;
  } catch {
    return null;
  }
};

const coerceUrlValue = (raw: string, defaultValue: unknown) => {
  if (typeof defaultValue === 'number') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }
  if (typeof defaultValue === 'boolean') return raw === 'true';
  return raw;
};

export function useWorkspaceNavigationMemory<TState extends WorkspaceState>({
  moduleKey,
  tabKey,
  state,
  defaults,
  urlFields = {},
  onRestore,
  rememberScroll = true,
  enabled = true,
}: WorkspaceNavigationMemoryOptions<TState>) {
  const authorizationRevision = useAuthorizationRevision();
  const readyRef = useRef(false);
  const [restoreRevision, setRestoreRevision] = useState(0);
  const storageKeyRef = useRef('');
  const scrollKeyRef = useRef('');
  const latestStateRef = useRef(state);
  const restoreRef = useRef(onRestore);
  const defaultsRef = useRef(defaults);
  const urlFieldsRef = useRef(urlFields);
  latestStateRef.current = state;
  restoreRef.current = onRestore;
  defaultsRef.current = defaults;
  urlFieldsRef.current = urlFields;

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    storageKeyRef.current = '';
    if (!enabled) return;
    const initialState = latestStateRef.current;
    let ownedStorageKey = '';
    // Capture explicit navigation parameters before another workspace updates the URL.
    const params = new URLSearchParams(window.location.search);

    const restore = async () => {
      const session = await authApi.getSessionOrNull().catch(() => null);
      if (!session || cancelled) return;

      const scope = `${session.company.id}:${session.user.id}:${moduleKey}:${tabKey}`;
      const storageKey = `indice:workspace:${scope}`;
      const scrollKey = `indice:workspace-scroll:${scope}`;
      storageKeyRef.current = storageKey;
      ownedStorageKey = storageKey;
      scrollKeyRef.current = scrollKey;

      let localEnvelope: LocalEnvelope<TState> | null = null;
      try { localEnvelope = safeParse<LocalEnvelope<TState>>(window.localStorage.getItem(storageKey)); } catch { /* Storage may be unavailable. */ }
      let remoteState: Partial<TState> = {};
      let remoteUpdatedAt = '';
      try {
        const remote = await workspaceStateApi.get<TState>(moduleKey, tabKey);
        remoteState = remote.state ?? {};
        remoteUpdatedAt = remote.updatedAt ?? '';
      } catch {
        // Navigation remains available offline through the local cache.
      }
      if (cancelled) return;

      const localIsNewer = Boolean(localEnvelope?.savedAt && localEnvelope.savedAt >= remoteUpdatedAt);
      const durableState: Partial<TState> = localIsNewer
        ? { ...(localEnvelope?.partial ? remoteState : {}), ...localEnvelope?.state }
        : remoteState;
      const currentDefaults = defaultsRef.current;
      const restored = { ...currentDefaults } as TState;
      // Only fields declared by this workspace may be restored or saved.
      Object.keys(currentDefaults).forEach(key => {
        if (durableState && Object.prototype.hasOwnProperty.call(durableState, key)) {
          const typedKey = key as keyof TState;
          restored[typedKey] = durableState[typedKey] as TState[keyof TState];
        }
      });

      Object.entries(urlFieldsRef.current).forEach(([stateKey, queryKey]) => {
        if (!queryKey || !params.has(queryKey)) return;
        const raw = params.get(queryKey);
        if (raw !== null) {
          const typedKey = stateKey as keyof TState;
          restored[typedKey] = coerceUrlValue(raw, currentDefaults[typedKey]) as TState[keyof TState];
        }
      });

      Object.keys(currentDefaults).forEach(key => {
        const typedKey = key as keyof TState;
        if (latestStateRef.current[typedKey] !== initialState[typedKey]) restored[typedKey] = latestStateRef.current[typedKey];
      });

      restoreRef.current(restored);
      readyRef.current = true;
      setRestoreRevision(value => value + 1);

      if (rememberScroll) {
        let scrollY = 0;
        try { scrollY = Number(window.sessionStorage.getItem(scrollKey)); } catch { /* Optional scroll cache. */ }
        if (Number.isFinite(scrollY) && scrollY > 0) {
          window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }));
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
      // A quick tab switch must preserve edits made while the remote restore is still pending.
      if (!readyRef.current && ownedStorageKey) {
        const changed = Object.fromEntries(Object.keys(defaultsRef.current)
          .filter(key => latestStateRef.current[key] !== initialState[key])
          .map(key => [key, latestStateRef.current[key]]));
        if (Object.keys(changed).length) {
          try {
            const previous = safeParse<LocalEnvelope<TState>>(window.localStorage.getItem(ownedStorageKey));
            window.localStorage.setItem(ownedStorageKey, JSON.stringify({
              state: { ...(previous?.partial ? previous.state : {}), ...changed }, partial: true, savedAt: new Date().toISOString(),
            }));
          } catch { /* Navigation remains available if local storage is blocked. */ }
        }
      }
      readyRef.current = false;
    };
  }, [authorizationRevision, enabled, moduleKey, rememberScroll, tabKey]);

  useEffect(() => {
    if (!enabled || !readyRef.current || !storageKeyRef.current) return;

    const savedAt = new Date().toISOString();
    const safeState = Object.fromEntries(Object.keys(defaultsRef.current).map(key => [key, state[key]])) as TState;
    try { window.localStorage.setItem(storageKeyRef.current, JSON.stringify({ state: safeState, savedAt } satisfies LocalEnvelope<TState>)); } catch { /* Remote persistence remains available. */ }

    const url = new URL(window.location.href);
    const currentDefaults = defaultsRef.current;
    Object.entries(urlFieldsRef.current).forEach(([stateKey, queryKey]) => {
      if (!queryKey) return;
      const typedKey = stateKey as keyof TState;
      const value = state[typedKey];
      const defaultValue = currentDefaults[typedKey];
      if (value === defaultValue || value === '' || value === null || value === undefined) {
        url.searchParams.delete(queryKey);
      } else {
        url.searchParams.set(queryKey, String(value));
      }
    });
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

    const timeout = window.setTimeout(() => {
      if (!readyRef.current) return;
      void workspaceStateApi.save(moduleKey, tabKey, safeState).catch(() => {
        // The local copy remains authoritative until the backend is reachable again.
      });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [authorizationRevision, enabled, moduleKey, restoreRevision, state, tabKey]);

  useEffect(() => {
    if (!rememberScroll) return undefined;
    let animationFrame = 0;
    const saveScroll = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (scrollKeyRef.current) {
          try { window.sessionStorage.setItem(scrollKeyRef.current, String(window.scrollY)); } catch { /* Optional scroll cache. */ }
        }
      });
    };
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', saveScroll);
      window.cancelAnimationFrame(animationFrame);
      if (scrollKeyRef.current) {
        try { window.sessionStorage.setItem(scrollKeyRef.current, String(window.scrollY)); } catch { /* Optional scroll cache. */ }
      }
    };
  }, [rememberScroll]);
  return enabled && readyRef.current;

}
