import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  mockCashFunds,
  mockPettyCashExpenses,
} from '../data/pettyCash.mock';
import { pettyCashService } from '../services';
import type {
  CashFund,
  PettyCashExpense,
  PettyCashFund,
  PettyCashMovement,
  PettyCashSettlementLine,
  PettyCashStatement,
} from '../types/pettyCash.types';

interface PettyCashContextValue {
  workspaceLoaded: boolean;
  workspaceError: boolean;
  workspaceUpdatedAt: string | null;
  refreshWorkspace: () => void;
  cashFunds: CashFund[];
  pettyCashExpenses: PettyCashExpense[];
  pettyCashFunds: PettyCashFund[];
  pettyCashMovements: PettyCashMovement[];
  pettyCashSettlementLines: PettyCashSettlementLine[];
  pettyCashStatements: PettyCashStatement[];
  setCashFunds: Dispatch<SetStateAction<CashFund[]>>;
  setPettyCashExpenses: Dispatch<SetStateAction<PettyCashExpense[]>>;
  setPettyCashFunds: Dispatch<SetStateAction<PettyCashFund[]>>;
  setPettyCashMovements: Dispatch<SetStateAction<PettyCashMovement[]>>;
  setPettyCashSettlementLines: Dispatch<SetStateAction<PettyCashSettlementLine[]>>;
  setPettyCashStatements: Dispatch<SetStateAction<PettyCashStatement[]>>;
}

const PettyCashContext = createContext<PettyCashContextValue | null>(null);

export function PettyCashProvider({ children }: { children: ReactNode }) {
  const authorizationRevision = useAuthorizationRevision();
  const [refreshRevision, setRefreshRevision] = useState(0);
  const refreshWorkspace = useCallback(() => setRefreshRevision(value => value + 1), []);
  const [workspaceError, setWorkspaceError] = useState(false);
  const [workspaceUpdatedAt, setWorkspaceUpdatedAt] = useState<string | null>(null);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [cashFunds, setCashFunds] = useState<CashFund[]>(mockCashFunds);
  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>(mockPettyCashExpenses);
  const [pettyCashFunds, setPettyCashFunds] = useState<PettyCashFund[]>([]);
  const [pettyCashMovements, setPettyCashMovements] = useState<PettyCashMovement[]>([]);
  const [pettyCashSettlementLines, setPettyCashSettlementLines] = useState<PettyCashSettlementLine[]>([]);
  const [pettyCashStatements, setPettyCashStatements] = useState<PettyCashStatement[]>([]);

  useEffect(() => {
    let cancelled = false;
    setWorkspaceLoaded(false);
    setWorkspaceError(false);
    setWorkspaceUpdatedAt(null);
    setPettyCashFunds([]);
    setPettyCashMovements([]);
    setPettyCashSettlementLines([]);
    setPettyCashStatements([]);

    pettyCashService.getWorkspace()
      .then((workspace) => {
        if (cancelled) return;
        setPettyCashFunds(workspace.funds);
        setPettyCashMovements(workspace.movements);
        setPettyCashSettlementLines(workspace.settlementLines);
        setPettyCashStatements(workspace.statements);
        setWorkspaceLoaded(true);
        setWorkspaceUpdatedAt(new Date().toISOString());
      })
      .catch(() => {
        if (cancelled) return;
        setWorkspaceError(true);
        setPettyCashFunds([]);
        setPettyCashMovements([]);
        setPettyCashSettlementLines([]);
        setPettyCashStatements([]);
      });

    return () => {
      cancelled = true;
    };
  }, [authorizationRevision, refreshRevision]);

  const value = useMemo<PettyCashContextValue>(() => ({
    workspaceLoaded,
    workspaceError,
    workspaceUpdatedAt,
    refreshWorkspace,
    cashFunds,
    pettyCashExpenses,
    pettyCashFunds,
    pettyCashMovements,
    pettyCashSettlementLines,
    pettyCashStatements,
    setCashFunds,
    setPettyCashExpenses,
    setPettyCashFunds,
    setPettyCashMovements,
    setPettyCashSettlementLines,
    setPettyCashStatements,
  }), [workspaceLoaded, workspaceError, workspaceUpdatedAt, refreshWorkspace, cashFunds, pettyCashExpenses, pettyCashFunds, pettyCashMovements, pettyCashSettlementLines, pettyCashStatements]);

  return (
    <PettyCashContext.Provider value={value}>
      {children}
    </PettyCashContext.Provider>
  );
}

export function usePettyCash() {
  const context = useContext(PettyCashContext);

  if (!context) {
    throw new Error('usePettyCash must be used inside PettyCashProvider');
  }

  return context;
}
