import type {
  CreateDigitalContractInput,
  DigitalContract,
  DigitalContractSignatureRequest,
  DigitalContractStatus,
  DigitalSignatureStatus,
} from '../Contrato/types/digitalContractTypes';
import type { SalesContact } from './contacts';
import type { SalesOpportunity } from './opportunities';
import type { SalesPostSaleCase, PostSaleStatus } from './postSales';
import type { SalesCatalogItem } from './products';
import type { SalesQuote, QuoteStatus } from './quotes';

export type CreateContactInput = Omit<SalesContact, 'id'>;
export type UpdateContactInput = Partial<Omit<SalesContact, 'id'>>;
export type CreateOpportunityInput = Omit<SalesOpportunity, 'id'>;
export type UpdateOpportunityInput = Partial<Omit<SalesOpportunity, 'id'>>;
export type CreateProductInput = Omit<SalesCatalogItem, 'id' | 'lastUpdated'> & { lastUpdated?: string };
export type UpdateProductInput = Partial<Omit<SalesCatalogItem, 'id'>>;
export type CreateQuoteInput = Omit<SalesQuote, 'id' | 'quoteNumber' | 'lastUpdated'> & {
  quoteNumber?: string;
  lastUpdated?: string;
};
export type UpdateQuoteInput = Partial<Omit<SalesQuote, 'id' | 'quoteNumber'>>;
export type CreatePostSaleCaseInput = Omit<SalesPostSaleCase, 'id' | 'lastUpdated'> & { lastUpdated?: string };

export type SalesCrmContextValue = {
  contacts: SalesContact[];
  opportunities: SalesOpportunity[];
  products: SalesCatalogItem[];
  quotes: SalesQuote[];
  postSaleCases: SalesPostSaleCase[];
  contracts: DigitalContract[];
  addContact: (contact: CreateContactInput) => SalesContact;
  updateContact: (contactId: string, patch: UpdateContactInput) => void;
  deleteContact: (contactId: string) => void;
  addOpportunity: (opportunity: CreateOpportunityInput) => SalesOpportunity;
  updateOpportunity: (opportunityId: string, patch: UpdateOpportunityInput) => void;
  deleteOpportunity: (opportunityId: string) => void;
  addProduct: (product: CreateProductInput) => SalesCatalogItem;
  updateProduct: (productId: string, patch: UpdateProductInput) => void;
  addQuote: (quote: CreateQuoteInput) => SalesQuote;
  updateQuote: (quoteId: string, patch: UpdateQuoteInput) => void;
  addPostSaleCase: (postSaleCase: CreatePostSaleCaseInput) => SalesPostSaleCase;
  addContract: (contract: CreateDigitalContractInput) => DigitalContract;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => void;
  connectQuoteToOpportunity: (quoteId: string, opportunityId?: string) => void;
  updatePostSaleCaseStatus: (caseId: string, status: PostSaleStatus) => void;
  updateContractStatus: (contractId: string, status: DigitalContractStatus) => void;
  updateContractSignatureStatus: (contractId: string, signatureStatus: DigitalSignatureStatus) => void;
  requestContractSignature: (contractId: string, signatureRequest: DigitalContractSignatureRequest) => void;
};
