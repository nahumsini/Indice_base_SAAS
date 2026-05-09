import GastosKPIPage from './GastosKPIPage';
import type { Expense } from '../types/expenses.types';
import type { ProviderRecord } from '../Providers/useProveedoresLogic';

interface KPIsProps {
  expenses: Expense[];
  providers: ProviderRecord[];
}

export default function KPIs({ expenses, providers }: KPIsProps) {
  return (
    <GastosKPIPage
      expenses={expenses}
      providers={providers}
    />
  );
}
