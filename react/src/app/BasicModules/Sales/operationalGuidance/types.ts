import type { SalesTabId } from '../salesIdentity';

export type SalesGuidanceTabId = SalesTabId;

export type SalesGuidanceIcon =
  | 'leads'
  | 'contacts'
  | 'quotes'
  | 'sales'
  | 'products'
  | 'inventory'
  | 'contracts'
  | 'afterSales'
  | 'kpis';

export type SalesGuidanceTabDefinition = {
  readonly id: SalesGuidanceTabId;
  readonly icon: SalesGuidanceIcon;
};
