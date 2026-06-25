import type { DigitalContract } from '../Contrato/types/digitalContractTypes';
import type { SalesContact } from './contacts';
import type { SalesOpportunity } from './opportunities';
import type { SalesPostSaleCase } from './postSales';
import type { SalesCatalogItem } from './products';
import type { SalesQuote } from './quotes';
import type { SaleRecord } from '../Sales/types/salesTypes';

export type SalesApiResourceName =
  | 'contacts'
  | 'opportunities'
  | 'products'
  | 'quotes'
  | 'sales'
  | 'post-sales'
  | 'contracts';

export type SalesApiListResponse<TItem> = {
  items: TItem[];
  total: number;
  page?: number;
  pageSize?: number;
};

export type SalesApiMutationResponse<TItem> = {
  item: TItem;
  message?: string;
};

export type SalesApiContracts = {
  contacts: SalesApiListResponse<SalesContact>;
  opportunities: SalesApiListResponse<SalesOpportunity>;
  products: SalesApiListResponse<SalesCatalogItem>;
  quotes: SalesApiListResponse<SalesQuote>;
  sales: SalesApiListResponse<SaleRecord>;
  'post-sales': SalesApiListResponse<SalesPostSaleCase>;
  contracts: SalesApiListResponse<DigitalContract>;
};
