import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface LearningModeHeaderActionsContextValue {
  active: boolean;
  actionHost: HTMLDivElement | null;
  setActionHost: (node: HTMLDivElement | null) => void;
}

const LearningModeHeaderActionsContext = createContext<LearningModeHeaderActionsContextValue | null>(null);

export function LearningModeHeaderActionsProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const [actionHost, setActionHostState] = useState<HTMLDivElement | null>(null);
  const setActionHost = useCallback((node: HTMLDivElement | null) => {
    setActionHostState(node);
  }, []);
  const value = useMemo(
    () => ({ active, actionHost, setActionHost }),
    [actionHost, active, setActionHost],
  );

  return (
    <LearningModeHeaderActionsContext.Provider value={value}>
      {children}
    </LearningModeHeaderActionsContext.Provider>
  );
}

export function LearningModeHeaderActionHost() {
  const context = useContext(LearningModeHeaderActionsContext);

  return <div ref={context?.active ? context.setActionHost : undefined} />;
}

export function LearningModeTitleBarBridge({
  actions: _actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return children;
}

export function useLearningModeHeaderActions() {
  return useContext(LearningModeHeaderActionsContext);
}
