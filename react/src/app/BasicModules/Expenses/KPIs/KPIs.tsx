import GastosKPIPage from './GastosKPIPage';
import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';

interface KPIsProps {
  expenses: Expense[];
  providers: ProviderRecord[];
  refreshKey?: number;
}

export default function KPIs({ expenses, providers, refreshKey = 0 }: KPIsProps) {
  return (
    <GastosKPIPage
      expenses={expenses}
      providers={providers}
      refreshKey={refreshKey}
    />
  );
}
