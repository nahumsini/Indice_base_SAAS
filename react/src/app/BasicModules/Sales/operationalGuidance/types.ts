import type { SalesTabId } from '../salesIdentity';

export type SalesGuidanceTabId = Exclude<SalesTabId, 'payment-accounts' | 'commissions'>;

export type SalesGuidanceIcon =
  | 'leads'
  | 'contacts'
  | 'quotes'
  | 'sales'
  | 'products'
  | 'providers'
  | 'inventory'
  | 'contracts'
  | 'afterSales'
  | 'kpis';

export type SalesGuidanceTabDefinition = {
  readonly id: SalesGuidanceTabId;
  readonly icon: SalesGuidanceIcon;
};
