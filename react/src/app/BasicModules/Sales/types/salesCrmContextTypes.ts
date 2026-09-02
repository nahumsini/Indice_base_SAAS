import type {
  CreateDigitalContractInput,
  DigitalContract,
  DigitalContractSignatureRequest,
  DigitalContractStatus,
  DigitalSignatureStatus,
  UpdateDigitalContractInput,
} from '../Contrato/types/digitalContractTypes';
import type { SalesContact } from './contacts';
import type { SalesOpportunity } from './opportunities';
import type { SalesPostSaleCase, PostSaleStatus } from './postSales';
import type { SalesCatalogItem } from './products';
import type { SalesQuote, QuoteStatus } from './quotes';
import type { SaleRecord } from '../Sales/types/salesTypes';

export type CreateContactInput = Omit<SalesContact, 'id'>;
export type UpdateContactInput = Partial<Omit<SalesContact, 'id'>>;
export type CreateOpportunityInput = Omit<SalesOpportunity, 'id'>;
export type UpdateOpportunityInput = Partial<Omit<SalesOpportunity, 'id'>>;
export type CreateProductInput = Omit<SalesCatalogItem, 'id' | 'backendId' | 'productCode' | 'lastUpdated'> & { lastUpdated?: string };
export type UpdateProductInput = Partial<Omit<SalesCatalogItem, 'id' | 'backendId'>>;
export type CreateQuoteInput = Omit<SalesQuote, 'id' | 'quoteNumber' | 'lastUpdated'> & {
  quoteNumber?: string;
  lastUpdated?: string;
};
export type UpdateQuoteInput = Partial<Omit<SalesQuote, 'id' | 'quoteNumber'>>;
export type CreatePostSaleCaseInput = Omit<SalesPostSaleCase, 'id' | 'lastUpdated'> & { lastUpdated?: string };

export type SalesCrmSyncIssue = {
  action: string;
  message: string;
  occurredAt: string;
};

export type SalesCrmContextValue = {
  isLoading: boolean;
  isSyncing: boolean;
  loadError: string;
  hasPartialData: boolean;
  syncIssue: SalesCrmSyncIssue | null;
  contacts: SalesContact[];
  opportunities: SalesOpportunity[];
  products: SalesCatalogItem[];
  quotes: SalesQuote[];
  salesRecords: SaleRecord[];
  postSaleCases: SalesPostSaleCase[];
  contracts: DigitalContract[];
  addContact: (contact: CreateContactInput) => SalesContact;
  createContactRecord: (contact: CreateContactInput) => Promise<SalesContact>;
  updateContact: (contactId: string, patch: UpdateContactInput) => void;
  deleteContact: (contactId: string) => void;
  addOpportunity: (opportunity: CreateOpportunityInput) => SalesOpportunity;
  updateOpportunity: (opportunityId: string, patch: UpdateOpportunityInput) => void;
  deleteOpportunity: (opportunityId: string) => void;
  addProduct: (product: CreateProductInput) => SalesCatalogItem;
  updateProduct: (productId: string, patch: UpdateProductInput) => void;
  createProductRecord: (product: CreateProductInput) => Promise<SalesCatalogItem>;
  updateProductRecord: (productId: string, patch: UpdateProductInput) => Promise<SalesCatalogItem>;
  deleteProductRecord: (productId: string) => Promise<void>;
  reloadProducts: () => Promise<void>;
  reloadSalesRecords: () => Promise<void>;
  reloadAll: () => Promise<void>;
  clearSyncIssue: () => void;
  addQuote: (quote: CreateQuoteInput) => SalesQuote;
  updateQuote: (quoteId: string, patch: UpdateQuoteInput) => void;
  deleteQuote: (quoteId: string) => Promise<void>;
  addSaleRecord: (saleRecord: SaleRecord) => Promise<SaleRecord>;
  updateSaleRecord: (saleId: string, patch: Partial<SaleRecord>) => void;
  deleteSaleRecord: (saleId: string) => Promise<void>;
  addPostSaleCase: (postSaleCase: CreatePostSaleCaseInput) => SalesPostSaleCase;
  addContract: (contract: CreateDigitalContractInput) => DigitalContract;
  updateContract: (contractId: string, patch: UpdateDigitalContractInput) => void;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => void;
  connectQuoteToOpportunity: (quoteId: string, opportunityId?: string) => void;
  updatePostSaleCaseStatus: (caseId: string, status: PostSaleStatus) => void;
  updateContractStatus: (contractId: string, status: DigitalContractStatus) => void;
  updateContractSignatureStatus: (contractId: string, signatureStatus: DigitalSignatureStatus) => void;
  requestContractSignature: (contractId: string, signatureRequest: DigitalContractSignatureRequest) => void;
};
