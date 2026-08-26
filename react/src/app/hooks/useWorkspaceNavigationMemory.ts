import { useEffect, useRef } from 'react';
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
};

type LocalEnvelope<TState> = {
  state: TState;
  savedAt: string;
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
}: WorkspaceNavigationMemoryOptions<TState>) {
  const authorizationRevision = useAuthorizationRevision();
  const readyRef = useRef(false);
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

    const restore = async () => {
      const session = await authApi.getSessionOrNull();
      if (!session || cancelled) return;

      const scope = `${session.company.id}:${session.user.id}:${moduleKey}:${tabKey}`;
      const storageKey = `indice:workspace:${scope}`;
      const scrollKey = `indice:workspace-scroll:${scope}`;
      storageKeyRef.current = storageKey;
      scrollKeyRef.current = scrollKey;

      const localEnvelope = safeParse<LocalEnvelope<TState>>(window.localStorage.getItem(storageKey));
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
      const durableState = localIsNewer ? localEnvelope?.state ?? {} : remoteState;
      const currentDefaults = defaultsRef.current;
      const restored = { ...currentDefaults, ...durableState } as TState;
      const params = new URLSearchParams(window.location.search);

      Object.entries(urlFieldsRef.current).forEach(([stateKey, queryKey]) => {
        if (!queryKey || !params.has(queryKey)) return;
        const raw = params.get(queryKey);
        if (raw !== null) {
          const typedKey = stateKey as keyof TState;
          restored[typedKey] = coerceUrlValue(raw, currentDefaults[typedKey]) as TState[keyof TState];
        }
      });

      restoreRef.current(restored);
      readyRef.current = true;

      if (rememberScroll) {
        const scrollY = Number(window.sessionStorage.getItem(scrollKey));
        if (Number.isFinite(scrollY) && scrollY > 0) {
          window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }));
        }
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [authorizationRevision, moduleKey, rememberScroll, tabKey]);

  useEffect(() => {
    if (!readyRef.current || !storageKeyRef.current) return;

    const savedAt = new Date().toISOString();
    window.localStorage.setItem(storageKeyRef.current, JSON.stringify({ state, savedAt } satisfies LocalEnvelope<TState>));

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
      void workspaceStateApi.save(moduleKey, tabKey, latestStateRef.current).catch(() => {
        // The local copy remains authoritative until the backend is reachable again.
      });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [moduleKey, state, tabKey]);

  useEffect(() => {
    if (!rememberScroll) return undefined;
    let animationFrame = 0;
    const saveScroll = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (scrollKeyRef.current) {
          window.sessionStorage.setItem(scrollKeyRef.current, String(window.scrollY));
        }
      });
    };
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', saveScroll);
      window.cancelAnimationFrame(animationFrame);
      if (scrollKeyRef.current) {
        window.sessionStorage.setItem(scrollKeyRef.current, String(window.scrollY));
      }
    };
  }, [rememberScroll]);
}
