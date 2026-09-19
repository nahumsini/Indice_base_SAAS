import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { useWorkspaceNavigationMemory } from '../../hooks/useWorkspaceNavigationMemory';

export type WorkbarPosition = 'top' | 'left';

type WorkbarLayoutState = {
  dualScreenEnabled: boolean;
  position: WorkbarPosition;
};

type WorkbarLayoutContextValue = {
  dualScreenAvailable: boolean;
  dualScreenEnabled: boolean;
  isDualScreenActive: boolean;
  position: WorkbarPosition;
  setDualScreenEnabled: (enabled: boolean) => void;
  setPosition: (position: WorkbarPosition) => void;
};

type StoredWorkbarLayoutEnvelope = {
  state?: Partial<WorkbarLayoutState>;
};

const WORKBAR_MODULE_KEY = 'system';
const WORKBAR_TAB_KEY = 'workbar-layout';
const WORKBAR_DEFAULTS: WorkbarLayoutState = { dualScreenEnabled: false, position: 'top' };
const DUAL_SCREEN_MEDIA_QUERY = '(min-width: 1280px)';
const isEmbeddedWorkspacePane = typeof window !== 'undefined' && window.self !== window.top;

const WorkbarLayoutContext = createContext<WorkbarLayoutContextValue | null>(null);

export function isWorkbarPosition(value: unknown): value is WorkbarPosition {
  return value === 'top' || value === 'left';
}

function readInitialState(): WorkbarLayoutState {
  if (typeof window === 'undefined') return WORKBAR_DEFAULTS;

  const session = getCachedAuthSession();
  if (!session) return WORKBAR_DEFAULTS;

  const storageKey = [
    'indice:workspace',
    session.company.id,
    session.user.id,
    WORKBAR_MODULE_KEY,
    WORKBAR_TAB_KEY,
  ].join(':');

  try {
    const envelope = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as StoredWorkbarLayoutEnvelope | null;
    return {
      dualScreenEnabled: envelope?.state?.dualScreenEnabled === true,
      position: isWorkbarPosition(envelope?.state?.position)
        ? envelope.state.position
        : WORKBAR_DEFAULTS.position,
    };
  } catch {
    return WORKBAR_DEFAULTS;
  }
}

export function WorkbarLayoutProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState<WorkbarLayoutState>(readInitialState);
  const [position, setPositionState] = useState<WorkbarPosition>(initialState.position);
  const [dualScreenEnabled, setDualScreenEnabledState] = useState(initialState.dualScreenEnabled);
  const [dualScreenAvailable, setDualScreenAvailable] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(DUAL_SCREEN_MEDIA_QUERY).matches
  ));
  const state = useMemo<WorkbarLayoutState>(() => ({
    dualScreenEnabled,
    position,
  }), [dualScreenEnabled, position]);
  const restorePreference = useCallback((restoredState: WorkbarLayoutState) => {
    setPositionState(isWorkbarPosition(restoredState.position) ? restoredState.position : WORKBAR_DEFAULTS.position);
    setDualScreenEnabledState(restoredState.dualScreenEnabled === true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DUAL_SCREEN_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setDualScreenAvailable(event.matches);
    setDualScreenAvailable(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useWorkspaceNavigationMemory<WorkbarLayoutState>({
    moduleKey: WORKBAR_MODULE_KEY,
    tabKey: WORKBAR_TAB_KEY,
    state,
    defaults: WORKBAR_DEFAULTS,
    onRestore: restorePreference,
    rememberScroll: false,
    enabled: !isEmbeddedWorkspacePane,
  });

  const setPosition = useCallback((nextPosition: WorkbarPosition) => {
    setPositionState(isWorkbarPosition(nextPosition) ? nextPosition : WORKBAR_DEFAULTS.position);
  }, []);

  const setDualScreenEnabled = useCallback((enabled: boolean) => {
    setDualScreenEnabledState(enabled === true);
  }, []);

  const isDualScreenActive = isEmbeddedWorkspacePane || (dualScreenEnabled && dualScreenAvailable);

  const value = useMemo<WorkbarLayoutContextValue>(() => ({
    dualScreenAvailable,
    dualScreenEnabled,
    isDualScreenActive,
    position,
    setDualScreenEnabled,
    setPosition,
  }), [dualScreenAvailable, dualScreenEnabled, isDualScreenActive, position, setDualScreenEnabled, setPosition]);

  return (
    <WorkbarLayoutContext.Provider value={value}>
      {children}
    </WorkbarLayoutContext.Provider>
  );
}

export function useWorkbarLayout() {
  const value = useContext(WorkbarLayoutContext);
  if (!value) {
    throw new Error('useWorkbarLayout must be used within WorkbarLayoutProvider.');
  }
  return value;
}
