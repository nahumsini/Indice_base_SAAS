import type { DigitalContract } from '../Contrato/types/digitalContractTypes';
import type { SalesContact } from './contacts';
import type { SalesOpportunity } from './opportunities';
import type { SalesPostSaleCase } from './postSales';
import type { SalesCatalogItem } from './products';
import type { SalesQuote } from './quotes';

export type SalesApiResourceName =
  | 'contacts'
  | 'opportunities'
  | 'products'
  | 'quotes'
  | 'postSaleCases'
  | 'digitalContracts';

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
  postSaleCases: SalesApiListResponse<SalesPostSaleCase>;
  digitalContracts: SalesApiListResponse<DigitalContract>;
};
