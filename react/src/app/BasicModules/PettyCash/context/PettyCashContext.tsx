import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { mockCashFunds, mockPettyCashExpenses } from '../data/pettyCash.mock';
import type { CashFund, PettyCashExpense } from '../types/pettyCash.types';

interface PettyCashContextValue {
  cashFunds: CashFund[];
  pettyCashExpenses: PettyCashExpense[];
  setCashFunds: Dispatch<SetStateAction<CashFund[]>>;
  setPettyCashExpenses: Dispatch<SetStateAction<PettyCashExpense[]>>;
}

const PettyCashContext = createContext<PettyCashContextValue | null>(null);

export function PettyCashProvider({ children }: { children: ReactNode }) {
  const [cashFunds, setCashFunds] = useState<CashFund[]>(mockCashFunds);
  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>(mockPettyCashExpenses);

  const value = useMemo<PettyCashContextValue>(() => ({
    cashFunds,
    pettyCashExpenses,
    setCashFunds,
    setPettyCashExpenses,
  }), [cashFunds, pettyCashExpenses]);

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
