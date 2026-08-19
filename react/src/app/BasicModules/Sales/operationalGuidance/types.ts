import type { SalesTabId } from '../salesIdentity';

export type SalesGuidanceTabId = SalesTabId;

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
  | 'commissions'
  | 'paymentAccounts'
  | 'kpis';

export type SalesGuidanceTabDefinition = {
  readonly id: SalesGuidanceTabId;
  readonly icon: SalesGuidanceIcon;
};
