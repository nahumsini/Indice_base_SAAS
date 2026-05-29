import type { SalesGuidanceTabDefinition } from './types';

export const salesGuidanceTabs: readonly SalesGuidanceTabDefinition[] = [
  { id: 'leads', icon: 'leads' },
  { id: 'contacts', icon: 'contacts' },
  { id: 'quotes', icon: 'quotes' },
  { id: 'sales', icon: 'sales' },
  { id: 'products', icon: 'products' },
  { id: 'inventory', icon: 'inventory' },
  { id: 'after-sales', icon: 'afterSales' },
  { id: 'kpis', icon: 'kpis' },
] as const;
