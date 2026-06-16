import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DigitalContract } from './Contrato/types/digitalContractTypes';
import {
  backendIdFrom,
  toBackendContact,
  toBackendContract,
  toBackendOpportunity,
  toBackendPostSaleCase,
  toBackendProduct,
  toBackendQuote,
  toBackendSaleRecord,
  toFrontendContact,
  toFrontendContract,
  toFrontendOpportunity,
  toFrontendPostSaleCase,
  toFrontendProduct,
  toFrontendQuote,
  toFrontendSaleRecord,
} from './adapters/salesApiAdapters';
import type { SaleRecord } from './Sales/types/salesTypes';
import type {
  SalesCatalogItem,
  SalesContact,
  SalesCrmContextValue,
  SalesOpportunity,
  SalesPostSaleCase,
  SalesQuote,
} from './types';
import { createSequentialId, getTodayIsoDate } from './utils/salesCrmUtils';
import { salesApi } from './salesApi';

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

const logSalesSyncFailure = (action: string, error: unknown) => {
  console.warn(`[Sales] ${action} could not sync with backend. Keeping local state.`, error);
};

export function SalesCrmProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [products, setProducts] = useState<SalesCatalogItem[]>([]);
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([]);
  const [postSaleCases, setPostSaleCases] = useState<SalesPostSaleCase[]>([]);
  const [contracts, setContracts] = useState<DigitalContract[]>([]);

  const reloadProducts = useCallback(async () => {
    const productsResponse = await salesApi.list('products');
    setProducts(productsResponse.items.map(toFrontendProduct));
  }, []);

  useEffect(() => {
    let active = true;

    const loadSalesData = async () => {
      try {
        const [
          contactsResponse,
          opportunitiesResponse,
          productsResponse,
          quotesResponse,
          salesResponse,
          postSalesResponse,
          contractsResponse,
        ] = await Promise.all([
          salesApi.list('contacts'),
          salesApi.list('opportunities'),
          salesApi.list('products'),
          salesApi.list('quotes'),
          salesApi.list('sales'),
          salesApi.list('post-sales'),
          salesApi.list('contracts'),
        ]);

        if (!active) return;

        setContacts(contactsResponse.items.map(toFrontendContact));
        setOpportunities(opportunitiesResponse.items.map(toFrontendOpportunity));
        setProducts(productsResponse.items.map(toFrontendProduct));
        setQuotes(quotesResponse.items.map(toFrontendQuote));
        setSalesRecords(salesResponse.items.map(toFrontendSaleRecord));
        setPostSaleCases(postSalesResponse.items.map(toFrontendPostSaleCase));
        setContracts(contractsResponse.items.map(toFrontendContract));
      } catch (error) {
        logSalesSyncFailure('initial load', error);
      }
    };

    void loadSalesData();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SalesCrmContextValue>(() => ({
    contacts,
    opportunities,
    products,
    quotes,
    salesRecords,
    postSaleCases,
    contracts,
    reloadProducts,
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
      void salesApi.create('contacts', toBackendContact(createdContact))
        .then((savedContact) => {
          const persistedContact = toFrontendContact(savedContact as Record<string, unknown>);
          setContacts((current) => current.map((item) => (
            item.id === createdContact.id ? persistedContact : item
          )));
        })
        .catch((error) => logSalesSyncFailure('create contact', error));
      return createdContact;
    },
    updateContact: (contactId, patch) => {
      const currentContact = contacts.find((contact) => contact.id === contactId);
      setContacts((current) => current.map((contact) => (
        contact.id === contactId
          ? { ...contact, ...patch }
          : contact
      )));
      const backendId = backendIdFrom(currentContact);
      if (backendId !== undefined) {
        void salesApi.update('contacts', backendId, toBackendContact({ ...currentContact, ...patch }))
          .then((savedContact) => {
            const persistedContact = toFrontendContact(savedContact as Record<string, unknown>);
            setContacts((current) => current.map((contact) => (
              contact.id === contactId || contact.backendId === backendId ? persistedContact : contact
            )));
          })
          .catch((error) => logSalesSyncFailure('update contact', error));
      }
    },
    deleteContact: (contactId) => {
      const currentContact = contacts.find((contact) => contact.id === contactId);
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      const backendId = backendIdFrom(currentContact);
      if (backendId !== undefined) {
        void salesApi.delete('contacts', backendId)
          .catch((error) => logSalesSyncFailure('delete contact', error));
      }
    },
    addOpportunity: (opportunity) => {
      const createdOpportunity = {
        ...opportunity,
        id: createSequentialId('OPP', opportunities.length + 1),
      };

      setOpportunities((current) => [createdOpportunity, ...current]);
      void salesApi.create('opportunities', toBackendOpportunity(createdOpportunity, contacts))
        .then((savedOpportunity) => {
          const persistedOpportunity = toFrontendOpportunity(savedOpportunity as Record<string, unknown>);
          setOpportunities((current) => current.map((item) => (
            item.id === createdOpportunity.id ? persistedOpportunity : item
          )));
        })
        .catch((error) => logSalesSyncFailure('create opportunity', error));
      return createdOpportunity;
    },
    updateOpportunity: (opportunityId, patch) => {
      const currentOpportunity = opportunities.find((opportunity) => opportunity.id === opportunityId);
      setOpportunities((current) => current.map((opportunity) => (
        opportunity.id === opportunityId
          ? { ...opportunity, ...patch }
          : opportunity
      )));
      const backendId = backendIdFrom(currentOpportunity);
      if (backendId !== undefined) {
        void salesApi.update('opportunities', backendId, toBackendOpportunity({ ...currentOpportunity, ...patch }, contacts))
          .then((savedOpportunity) => {
            const persistedOpportunity = toFrontendOpportunity(savedOpportunity as Record<string, unknown>);
            setOpportunities((current) => current.map((opportunity) => (
              opportunity.id === opportunityId || opportunity.backendId === backendId ? persistedOpportunity : opportunity
            )));
          })
          .catch((error) => logSalesSyncFailure('update opportunity', error));
      }
    },
    deleteOpportunity: (opportunityId) => {
      const currentOpportunity = opportunities.find((opportunity) => opportunity.id === opportunityId);
      setOpportunities((current) => current.filter((opportunity) => opportunity.id !== opportunityId));
      const backendId = backendIdFrom(currentOpportunity);
      if (backendId !== undefined) {
        void salesApi.delete('opportunities', backendId)
          .catch((error) => logSalesSyncFailure('delete opportunity', error));
      }
    },
    addProduct: (product) => {
      const createdProduct = {
        ...product,
        id: createSequentialId('PRD', products.length + 1),
        lastUpdated: product.lastUpdated ?? getTodayIsoDate(),
      };

      setProducts((current) => [createdProduct, ...current]);
      void salesApi.create('products', toBackendProduct(createdProduct))
        .then((savedProduct) => {
          const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
          setProducts((current) => current.map((item) => (
            item.id === createdProduct.id ? persistedProduct : item
          )));
        })
        .catch((error) => logSalesSyncFailure('create product', error));
      return createdProduct;
    },
    updateProduct: (productId, patch) => {
      const currentProduct = products.find((product) => product.id === productId);
      setProducts((current) => current.map((product) => (
        product.id === productId
          ? { ...product, ...patch, lastUpdated: getTodayIsoDate() }
          : product
      )));
      const backendId = backendIdFrom(currentProduct);
      if (backendId !== undefined) {
        void salesApi.update('products', backendId, toBackendProduct({ ...currentProduct, ...patch, lastUpdated: getTodayIsoDate() }))
          .then((savedProduct) => {
            const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
            setProducts((current) => current.map((product) => (
              product.id === productId || product.backendId === backendId ? persistedProduct : product
            )));
          })
          .catch((error) => logSalesSyncFailure('update product', error));
      }
    },
    createProductRecord: async (product) => {
      const createdProduct = {
        ...product,
        id: createSequentialId('PRD', products.length + 1),
        lastUpdated: product.lastUpdated ?? getTodayIsoDate(),
      };

      setProducts((current) => [createdProduct, ...current]);
      try {
        const savedProduct = await salesApi.create('products', toBackendProduct(createdProduct));
        const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
        setProducts((current) => current.map((item) => (
          item.id === createdProduct.id ? persistedProduct : item
        )));
        return persistedProduct;
      } catch (error) {
        logSalesSyncFailure('create product', error);
        throw error;
      }
    },
    updateProductRecord: async (productId, patch) => {
      const currentProduct = products.find((product) => product.id === productId);
      if (!currentProduct) {
        throw new Error('Product not found.');
      }

      const optimisticProduct = { ...currentProduct, ...patch, lastUpdated: getTodayIsoDate() };
      setProducts((current) => current.map((product) => (
        product.id === productId ? optimisticProduct : product
      )));

      const backendId = backendIdFrom(currentProduct);
      if (backendId === undefined) {
        return optimisticProduct;
      }

      try {
        const savedProduct = await salesApi.update('products', backendId, toBackendProduct(optimisticProduct));
        const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
        setProducts((current) => current.map((product) => (
          product.id === productId || product.backendId === backendId ? persistedProduct : product
        )));
        return persistedProduct;
      } catch (error) {
        logSalesSyncFailure('update product', error);
        throw error;
      }
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
      void salesApi.create('quotes', toBackendQuote(createdQuote, contacts, opportunities, products))
        .then((savedQuote) => {
          const persistedQuote = toFrontendQuote(savedQuote as Record<string, unknown>);
          setQuotes((current) => current.map((item) => (
            item.id === createdQuote.id ? persistedQuote : item
          )));
        })
        .catch((error) => logSalesSyncFailure('create quote', error));
      return createdQuote;
    },
    updateQuote: (quoteId, patch) => {
      const currentQuote = quotes.find((quote) => quote.id === quoteId);
      setQuotes((current) => current.map((quote) => (
        quote.id === quoteId
          ? { ...quote, ...patch, lastUpdated: getTodayIsoDate() }
          : quote
      )));
      const backendId = backendIdFrom(currentQuote);
      if (backendId !== undefined) {
        void salesApi.update('quotes', backendId, toBackendQuote({ ...currentQuote, ...patch, lastUpdated: getTodayIsoDate() }, contacts, opportunities, products))
          .then((savedQuote) => {
            const persistedQuote = toFrontendQuote(savedQuote as Record<string, unknown>);
            setQuotes((current) => current.map((quote) => (
              quote.id === quoteId || quote.backendId === backendId ? persistedQuote : quote
            )));
          })
          .catch((error) => logSalesSyncFailure('update quote', error));
      }
    },
    addSaleRecord: (saleRecord) => {
      setSalesRecords((current) => [saleRecord, ...current]);
      void salesApi.create('sales', toBackendSaleRecord(saleRecord, contacts, opportunities, quotes))
        .then((savedSale) => {
          const persistedSale = toFrontendSaleRecord(savedSale as Record<string, unknown>);
          setSalesRecords((current) => current.map((item) => (
            item.id === saleRecord.id ? persistedSale : item
          )));
        })
        .catch((error) => logSalesSyncFailure('create sale', error));
    },
    updateSaleRecord: (saleId, patch) => {
      const currentSale = salesRecords.find((saleRecord) => saleRecord.id === saleId);
      setSalesRecords((current) => current.map((saleRecord) => (
        saleRecord.id === saleId ? { ...saleRecord, ...patch } : saleRecord
      )));
      const backendId = backendIdFrom(currentSale);
      if (backendId !== undefined) {
        void salesApi.update('sales', backendId, toBackendSaleRecord({ ...currentSale, ...patch }, contacts, opportunities, quotes))
          .then((savedSale) => {
            const persistedSale = toFrontendSaleRecord(savedSale as Record<string, unknown>);
            setSalesRecords((current) => current.map((saleRecord) => (
              saleRecord.id === saleId || saleRecord.backendId === backendId ? persistedSale : saleRecord
            )));
          })
          .catch((error) => logSalesSyncFailure('update sale', error));
      }
    },
    addPostSaleCase: (postSaleCase) => {
      const createdPostSaleCase = {
        ...postSaleCase,
        id: createSequentialId('PSC', postSaleCases.length + 1),
        lastUpdated: postSaleCase.lastUpdated ?? getTodayIsoDate(),
      };

      setPostSaleCases((current) => [createdPostSaleCase, ...current]);
      void salesApi.create('post-sales', toBackendPostSaleCase(createdPostSaleCase, contacts, opportunities, quotes))
        .then((savedPostSaleCase) => {
          const persistedPostSaleCase = toFrontendPostSaleCase(savedPostSaleCase as Record<string, unknown>);
          setPostSaleCases((current) => current.map((item) => (
            item.id === createdPostSaleCase.id ? persistedPostSaleCase : item
          )));
        })
        .catch((error) => logSalesSyncFailure('create post-sale case', error));
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
      void salesApi.create('contracts', toBackendContract(createdContract, contacts, opportunities, quotes, postSaleCases))
        .then((savedContract) => {
          const persistedContract = toFrontendContract(savedContract as Record<string, unknown>);
          setContracts((current) => current.map((item) => (
            item.id === createdContract.id ? persistedContract : item
          )));
        })
        .catch((error) => logSalesSyncFailure('create contract', error));
      return createdContract;
    },
    updateQuoteStatus: (quoteId, status) => {
      const currentQuote = quotes.find((quote) => quote.id === quoteId);
      setQuotes((current) => current.map((quote) => (
        quote.id === quoteId
          ? { ...quote, status, lastUpdated: getTodayIsoDate() }
          : quote
      )));
      const backendId = backendIdFrom(currentQuote);
      if (backendId !== undefined) {
        void salesApi.update('quotes', backendId, toBackendQuote({ ...currentQuote, status, lastUpdated: getTodayIsoDate() }, contacts, opportunities, products))
          .then((savedQuote) => {
            const persistedQuote = toFrontendQuote(savedQuote as Record<string, unknown>);
            setQuotes((current) => current.map((quote) => (
              quote.id === quoteId || quote.backendId === backendId ? persistedQuote : quote
            )));
          })
          .catch((error) => logSalesSyncFailure('update quote status', error));
      }
    },
    connectQuoteToOpportunity: (quoteId, opportunityId) => {
      const currentQuote = quotes.find((quote) => quote.id === quoteId);
      setQuotes((current) => current.map((quote) => (
        quote.id === quoteId
          ? { ...quote, opportunityId, lastUpdated: getTodayIsoDate() }
          : quote
      )));
      const backendId = backendIdFrom(currentQuote);
      if (backendId !== undefined) {
        void salesApi.update('quotes', backendId, toBackendQuote({ ...currentQuote, opportunityId, lastUpdated: getTodayIsoDate() }, contacts, opportunities, products))
          .then((savedQuote) => {
            const persistedQuote = toFrontendQuote(savedQuote as Record<string, unknown>);
            setQuotes((current) => current.map((quote) => (
              quote.id === quoteId || quote.backendId === backendId ? persistedQuote : quote
            )));
          })
          .catch((error) => logSalesSyncFailure('connect quote to opportunity', error));
      }
    },
    updatePostSaleCaseStatus: (caseId, status) => {
      const currentCase = postSaleCases.find((postSaleCase) => postSaleCase.id === caseId);
      setPostSaleCases((current) => current.map((postSaleCase) => (
        postSaleCase.id === caseId
          ? { ...postSaleCase, status, lastUpdated: getTodayIsoDate() }
          : postSaleCase
      )));
      const backendId = backendIdFrom(currentCase);
      if (backendId !== undefined) {
        void salesApi.update('post-sales', backendId, toBackendPostSaleCase({ ...currentCase, status, lastUpdated: getTodayIsoDate() }, contacts, opportunities, quotes))
          .then((savedCase) => {
            const persistedCase = toFrontendPostSaleCase(savedCase as Record<string, unknown>);
            setPostSaleCases((current) => current.map((postSaleCase) => (
              postSaleCase.id === caseId || postSaleCase.backendId === backendId ? persistedCase : postSaleCase
            )));
          })
          .catch((error) => logSalesSyncFailure('update post-sale status', error));
      }
    },
    updateContractStatus: (contractId, status) => {
      const currentContract = contracts.find((contract) => contract.id === contractId);
      setContracts((current) => current.map((contract) => (
        contract.id === contractId
          ? { ...contract, status, lastUpdated: getTodayIsoDate() }
          : contract
      )));
      const backendId = backendIdFrom(currentContract);
      if (backendId !== undefined) {
        void salesApi.update('contracts', backendId, toBackendContract({ ...currentContract, status, lastUpdated: getTodayIsoDate() }, contacts, opportunities, quotes, postSaleCases))
          .then((savedContract) => {
            const persistedContract = toFrontendContract(savedContract as Record<string, unknown>);
            setContracts((current) => current.map((contract) => (
              contract.id === contractId || contract.backendId === backendId ? persistedContract : contract
            )));
          })
          .catch((error) => logSalesSyncFailure('update contract status', error));
      }
    },
    updateContractSignatureStatus: (contractId, signatureStatus) => {
      const currentContract = contracts.find((contract) => contract.id === contractId);
      setContracts((current) => current.map((contract) => (
        contract.id === contractId
          ? { ...contract, signatureStatus, lastUpdated: getTodayIsoDate() }
          : contract
      )));
      const backendId = backendIdFrom(currentContract);
      if (backendId !== undefined) {
        void salesApi.update('contracts', backendId, toBackendContract({ ...currentContract, signatureStatus, lastUpdated: getTodayIsoDate() }, contacts, opportunities, quotes, postSaleCases))
          .then((savedContract) => {
            const persistedContract = toFrontendContract(savedContract as Record<string, unknown>);
            setContracts((current) => current.map((contract) => (
              contract.id === contractId || contract.backendId === backendId ? persistedContract : contract
            )));
          })
          .catch((error) => logSalesSyncFailure('update contract signature status', error));
      }
    },
    requestContractSignature: (contractId, signatureRequest) => {
      const currentContract = contracts.find((contract) => contract.id === contractId);
      const updatedContract = currentContract
        ? {
            ...currentContract,
            status: 'Pending signature' as const,
            signatureStatus: signatureRequest.status,
            signatureRequest,
            lastUpdated: getTodayIsoDate(),
            lifecycle: currentContract.lifecycle.map((step) => (
              step.labelKey === 'signatureRequested'
                ? { ...step, status: 'current' as const }
                : step.labelKey === 'created' || step.labelKey === 'assigned' || step.labelKey === 'documentPrepared'
                  ? { ...step, status: 'done' as const }
                  : step
            )),
          }
        : undefined;
      setContracts((current) => current.map((contract) => (
        contract.id === contractId
          ? updatedContract ?? contract
          : contract
      )));
      const backendId = backendIdFrom(currentContract);
      if (backendId !== undefined && updatedContract) {
        void salesApi.update('contracts', backendId, toBackendContract(updatedContract, contacts, opportunities, quotes, postSaleCases))
          .then((savedContract) => {
            const persistedContract = toFrontendContract(savedContract as Record<string, unknown>);
            setContracts((current) => current.map((contract) => (
              contract.id === contractId || contract.backendId === backendId ? persistedContract : contract
            )));
          })
          .catch((error) => logSalesSyncFailure('request contract signature', error));
      }
    },
  }), [contacts, contracts, opportunities, postSaleCases, products, quotes, reloadProducts, salesRecords]);

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
