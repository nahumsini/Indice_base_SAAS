import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DigitalContract } from './Contrato/types/digitalContractTypes';
import {
  initialContacts,
  initialContracts,
  initialOpportunities,
  initialPostSaleCases,
  initialProducts,
  initialQuotes,
} from './mocks/salesCrmMocks';
import { salesMockData } from './Sales/data/salesMockData';
import type {
  SalesCatalogItem,
  SalesContact,
  SalesCrmContextValue,
  SalesOpportunity,
  SalesPostSaleCase,
  SalesQuote,
} from './types';
import { createSequentialId, getTodayIsoDate } from './utils/salesCrmUtils';

export type {
  CreateContactInput,
  CreateOpportunityInput,
  CreatePostSaleCaseInput,
  CreateProductInput,
  CreateQuoteInput,
  CustomerRelationType,
  LostReason,
  OpportunityNextAction,
  OpportunityProbability,
  OpportunitySource,
  OpportunityStage,
  OpportunityStatus,
  OpportunityTemperature,
  PostSaleRiskLevel,
  PostSaleStatus,
  PostSaleType,
  QuoteStatus,
  SalesApiContracts,
  SalesApiListResponse,
  SalesApiMutationResponse,
  SalesApiResourceName,
  SalesCatalogItem,
  SalesContact,
  SalesCrmContextValue,
  SalesOpportunity,
  SalesPostSaleCase,
  SalesProductBaseUnit,
  SalesProductPricingMode,
  SalesProductSaleUnit,
  SalesProductCategory,
  SalesProductStatus,
  SalesProductTaxCategory,
  SalesProductType,
  SalesProductVisibility,
  SalesQuote,
  SalesQuoteItem,
  UpdateContactInput,
  UpdateOpportunityInput,
  UpdateProductInput,
  UpdateQuoteInput,
} from './types';

export {
  customerRelationTypes,
  lostReasons,
  opportunityLinkedQuoteStatuses,
  opportunityNextActions,
  opportunityProbabilities,
  opportunitySources,
  opportunityStages,
  opportunityStatuses,
  opportunityTemperatures,
  postSaleRiskLevels,
  postSaleStatuses,
  postSaleTypes,
  productBaseUnits,
  productCategories,
  productPricingModes,
  productSaleUnits,
  productStatuses,
  productTaxCategories,
  productTypes,
  productVisibilities,
  quoteStatuses,
  salesOwners,
} from './types';

const SalesCrmContext = createContext<SalesCrmContextValue | null>(null);

export function SalesCrmProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<SalesContact[]>(initialContacts);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>(initialOpportunities);
  const [products, setProducts] = useState<SalesCatalogItem[]>(initialProducts);
  const [quotes, setQuotes] = useState<SalesQuote[]>(initialQuotes);
  const [salesRecords, setSalesRecords] = useState(salesMockData);
  const [postSaleCases, setPostSaleCases] = useState<SalesPostSaleCase[]>(initialPostSaleCases);
  const [contracts, setContracts] = useState<DigitalContract[]>(initialContracts);

  const value = useMemo<SalesCrmContextValue>(() => ({
    contacts,
    opportunities,
    products,
    quotes,
    salesRecords,
    postSaleCases,
    contracts,
    addContact: (contact) => {
      let createdContact: SalesContact = {
        ...contact,
        id: createSequentialId('CNT', contacts.length + 1),
      };

      setContacts((current) => {
        createdContact = {
          ...contact,
          id: createSequentialId('CNT', current.length + 1),
        };

        return [createdContact, ...current];
      });
      return createdContact;
    },
    updateContact: (contactId, patch) => {
      setContacts((current) => current.map((contact) => (
        contact.id === contactId
          ? { ...contact, ...patch }
          : contact
      )));
    },
    deleteContact: (contactId) => {
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
    },
    addOpportunity: (opportunity) => {
      const createdOpportunity = {
        ...opportunity,
        id: createSequentialId('OPP', opportunities.length + 1),
      };

      setOpportunities((current) => [createdOpportunity, ...current]);
      return createdOpportunity;
    },
    updateOpportunity: (opportunityId, patch) => {
      setOpportunities((current) => current.map((opportunity) => (
        opportunity.id === opportunityId
          ? { ...opportunity, ...patch }
          : opportunity
      )));
    },
    deleteOpportunity: (opportunityId) => {
      setOpportunities((current) => current.filter((opportunity) => opportunity.id !== opportunityId));
    },
    addProduct: (product) => {
      const createdProduct = {
        ...product,
        id: createSequentialId('PRD', products.length + 1),
        lastUpdated: product.lastUpdated ?? getTodayIsoDate(),
      };

      setProducts((current) => [createdProduct, ...current]);
      return createdProduct;
    },
    updateProduct: (productId, patch) => {
      setProducts((current) => current.map((product) => (
        product.id === productId
          ? { ...product, ...patch, lastUpdated: getTodayIsoDate() }
          : product
      )));
    },
    addQuote: (quote) => {
      const nextIndex = quotes.length + 1;
      const createdQuote = {
        ...quote,
        id: createSequentialId('QTE', nextIndex),
        quoteNumber: quote.quoteNumber ?? `Q-2026-${String(nextIndex).padStart(3, '0')}`,
        lastUpdated: quote.lastUpdated ?? getTodayIsoDate(),
      };

      setQuotes((current) => [createdQuote, ...current]);
      return createdQuote;
    },
    updateQuote: (quoteId, patch) => {
      setQuotes((current) => current.map((quote) => (
        quote.id === quoteId
          ? { ...quote, ...patch, lastUpdated: getTodayIsoDate() }
          : quote
      )));
    },
    addSaleRecord: (saleRecord) => {
      setSalesRecords((current) => [saleRecord, ...current]);
    },
    updateSaleRecord: (saleId, patch) => {
      setSalesRecords((current) => current.map((saleRecord) => (
        saleRecord.id === saleId ? { ...saleRecord, ...patch } : saleRecord
      )));
    },
    addPostSaleCase: (postSaleCase) => {
      const createdPostSaleCase = {
        ...postSaleCase,
        id: createSequentialId('PSC', postSaleCases.length + 1),
        lastUpdated: postSaleCase.lastUpdated ?? getTodayIsoDate(),
      };

      setPostSaleCases((current) => [createdPostSaleCase, ...current]);
      return createdPostSaleCase;
    },
    addContract: (contract) => {
      const nextIndex = contracts.length + 1;
      const createdContract = {
        ...contract,
        id: createSequentialId('CON', nextIndex),
        contractNumber: contract.contractNumber ?? `C-2026-${String(nextIndex).padStart(3, '0')}`,
        lastUpdated: contract.lastUpdated ?? getTodayIsoDate(),
      };

      setContracts((current) => [createdContract, ...current]);
      return createdContract;
    },
    updateQuoteStatus: (quoteId, status) => {
      setQuotes((current) => current.map((quote) => (
        quote.id === quoteId
          ? { ...quote, status, lastUpdated: getTodayIsoDate() }
          : quote
      )));
    },
    connectQuoteToOpportunity: (quoteId, opportunityId) => {
      setQuotes((current) => current.map((quote) => (
        quote.id === quoteId
          ? { ...quote, opportunityId, lastUpdated: getTodayIsoDate() }
          : quote
      )));
    },
    updatePostSaleCaseStatus: (caseId, status) => {
      setPostSaleCases((current) => current.map((postSaleCase) => (
        postSaleCase.id === caseId
          ? { ...postSaleCase, status, lastUpdated: getTodayIsoDate() }
          : postSaleCase
      )));
    },
    updateContractStatus: (contractId, status) => {
      setContracts((current) => current.map((contract) => (
        contract.id === contractId
          ? { ...contract, status, lastUpdated: getTodayIsoDate() }
          : contract
      )));
    },
    updateContractSignatureStatus: (contractId, signatureStatus) => {
      setContracts((current) => current.map((contract) => (
        contract.id === contractId
          ? { ...contract, signatureStatus, lastUpdated: getTodayIsoDate() }
          : contract
      )));
    },
    requestContractSignature: (contractId, signatureRequest) => {
      setContracts((current) => current.map((contract) => (
        contract.id === contractId
          ? {
              ...contract,
              status: 'Pending signature',
              signatureStatus: signatureRequest.status,
              signatureRequest,
              lastUpdated: getTodayIsoDate(),
              lifecycle: contract.lifecycle.map((step) => (
                step.labelKey === 'signatureRequested'
                  ? { ...step, status: 'current' }
                  : step.labelKey === 'created' || step.labelKey === 'assigned' || step.labelKey === 'documentPrepared'
                    ? { ...step, status: 'done' }
                    : step
              )),
            }
          : contract
      )));
    },
  }), [contacts, contracts, opportunities, postSaleCases, products, quotes, salesRecords]);

  return (
    <SalesCrmContext.Provider value={value}>
      {children}
    </SalesCrmContext.Provider>
  );
}

export function useSalesCrm() {
  const context = useContext(SalesCrmContext);
  if (!context) {
    throw new Error('useSalesCrm must be used within SalesCrmProvider');
  }
  return context;
}
