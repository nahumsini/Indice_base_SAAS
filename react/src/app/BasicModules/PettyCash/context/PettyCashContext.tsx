import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
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
      })
      .catch(() => {
        if (cancelled) return;
        setPettyCashFunds([]);
        setPettyCashMovements([]);
        setPettyCashSettlementLines([]);
        setPettyCashStatements([]);
      });

    return () => {
      cancelled = true;
    };
  }, [authorizationRevision]);

  const value = useMemo<PettyCashContextValue>(() => ({
    workspaceLoaded,
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
  }), [workspaceLoaded, cashFunds, pettyCashExpenses, pettyCashFunds, pettyCashMovements, pettyCashSettlementLines, pettyCashStatements]);

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
