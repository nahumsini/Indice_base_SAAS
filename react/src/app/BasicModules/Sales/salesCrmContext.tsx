import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  CreateProductInput,
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

const getSyncErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'The request could not be completed.'
);

function stripProductIdentityForCreate(
  product: CreateProductInput & Partial<Pick<SalesCatalogItem, 'id' | 'backendId' | 'productCode'>>,
): CreateProductInput {
  const {
    id: _id,
    backendId: _backendId,
    productCode: _productCode,
    ...productInput
  } = product;

  return productInput;
}

export function SalesCrmProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [products, setProducts] = useState<SalesCatalogItem[]>([]);
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([]);
  const [postSaleCases, setPostSaleCases] = useState<SalesPostSaleCase[]>([]);
  const [contracts, setContracts] = useState<DigitalContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [hasPartialData, setHasPartialData] = useState(false);
  const [syncIssue, setSyncIssue] = useState<SalesCrmContextValue['syncIssue']>(null);
  const loadRequestId = useRef(0);

  const beginSync = useCallback(() => {
    setPendingSyncs((current) => current + 1);
  }, []);

  const finishSync = useCallback(() => {
    setPendingSyncs((current) => Math.max(0, current - 1));
  }, []);

  const clearSyncIssue = useCallback(() => {
    setSyncIssue(null);
  }, []);

  const reloadAll = useCallback(async () => {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;
    setIsLoading(true);
    setLoadError('');

    const results = await Promise.allSettled([
      salesApi.list('contacts'),
      salesApi.list('opportunities'),
      salesApi.list('products'),
      salesApi.list('quotes'),
      salesApi.list('sales'),
      salesApi.list('post-sales'),
      salesApi.list('contracts'),
    ] as const);

    if (loadRequestId.current !== requestId) return;

    const failedResources: string[] = [];
    let loadedResources = 0;
    const applyResult = <T,>(
      result: PromiseSettledResult<{ items: Record<string, unknown>[] }>,
      resource: string,
      apply: (items: Record<string, unknown>[]) => T,
    ) => {
      if (result.status === 'fulfilled') {
        loadedResources += 1;
        apply(result.value.items);
      } else {
        failedResources.push(resource);
      }
    };

    applyResult(results[0], 'contacts', (items) => setContacts(items.map(toFrontendContact)));
    applyResult(results[1], 'opportunities', (items) => setOpportunities(items.map(toFrontendOpportunity)));
    applyResult(results[2], 'products', (items) => setProducts(items.map(toFrontendProduct)));
    applyResult(results[3], 'quotes', (items) => setQuotes(items.map(toFrontendQuote)));
    applyResult(results[4], 'sales', (items) => setSalesRecords(items.map(toFrontendSaleRecord)));
    applyResult(results[5], 'post-sales', (items) => setPostSaleCases(items.map(toFrontendPostSaleCase)));
    applyResult(results[6], 'contracts', (items) => setContracts(items.map(toFrontendContract)));

    setHasPartialData(failedResources.length > 0 && loadedResources > 0);
    setLoadError(failedResources.join(', '));
    setIsLoading(false);
  }, []);

  const handleSyncFailure = useCallback((action: string, error: unknown) => {
    console.warn(`[Sales] ${action} could not sync with the backend.`, error);
    setSyncIssue({
      action,
      message: getSyncErrorMessage(error),
      occurredAt: new Date().toISOString(),
    });
    void reloadAll();
  }, [reloadAll]);

  const reloadProducts = useCallback(async () => {
    beginSync();
    try {
      const productsResponse = await salesApi.list('products');
      setProducts(productsResponse.items.map(toFrontendProduct));
      setSyncIssue(null);
    } catch (error) {
      handleSyncFailure('reload products', error);
      throw error;
    } finally {
      finishSync();
    }
  }, [beginSync, finishSync, handleSyncFailure]);

  const reloadSalesRecords = useCallback(async () => {
    beginSync();
    try {
      const salesResponse = await salesApi.list('sales');
      setSalesRecords(salesResponse.items.map(toFrontendSaleRecord));
      setSyncIssue(null);
    } catch (error) {
      handleSyncFailure('reload sales', error);
      throw error;
    } finally {
      finishSync();
    }
  }, [beginSync, finishSync, handleSyncFailure]);

  useEffect(() => {
    void reloadAll();

    return () => {
      loadRequestId.current += 1;
    };
  }, [reloadAll]);

  const value = useMemo<SalesCrmContextValue>(() => ({
    isLoading,
    isSyncing: pendingSyncs > 0,
    loadError,
    hasPartialData,
    syncIssue,
    contacts,
    opportunities,
    products,
    quotes,
    salesRecords,
    postSaleCases,
    contracts,
    reloadProducts,
    reloadSalesRecords,
    reloadAll,
    clearSyncIssue,
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
        .catch((error) => handleSyncFailure('create contact', error));
      return createdContact;
    },
    createContactRecord: async (contact) => {
      const createdContact: SalesContact = {
        ...contact,
        id: createSequentialId('CNT', contacts.length + 1),
      };

      setContacts((current) => [createdContact, ...current]);
      try {
        const savedContact = await salesApi.create('contacts', toBackendContact(createdContact));
        const persistedContact = toFrontendContact(savedContact as Record<string, unknown>);
        setContacts((current) => current.map((item) => (
          item.id === createdContact.id ? persistedContact : item
        )));
        return persistedContact;
      } catch (error) {
        setContacts((current) => current.filter((item) => item.id !== createdContact.id));
        handleSyncFailure('create contact', error);
        throw error;
      }
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
          .catch((error) => handleSyncFailure('update contact', error));
      } else if (currentContact) {
        handleSyncFailure('update contact', new Error('Missing backend identifier.'));
      }
    },
    deleteContact: (contactId) => {
      const currentContact = contacts.find((contact) => contact.id === contactId);
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      const backendId = backendIdFrom(currentContact);
      if (backendId !== undefined) {
        void salesApi.delete('contacts', backendId)
          .catch((error) => handleSyncFailure('delete contact', error));
      } else if (currentContact) {
        handleSyncFailure('delete contact', new Error('Missing backend identifier.'));
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
        .catch((error) => handleSyncFailure('create opportunity', error));
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
          .catch((error) => handleSyncFailure('update opportunity', error));
      } else if (currentOpportunity) {
        handleSyncFailure('update opportunity', new Error('Missing backend identifier.'));
      }
    },
    deleteOpportunity: (opportunityId) => {
      const currentOpportunity = opportunities.find((opportunity) => opportunity.id === opportunityId);
      setOpportunities((current) => current.filter((opportunity) => opportunity.id !== opportunityId));
      const backendId = backendIdFrom(currentOpportunity);
      if (backendId !== undefined) {
        void salesApi.delete('opportunities', backendId)
          .catch((error) => handleSyncFailure('delete opportunity', error));
      } else if (currentOpportunity) {
        handleSyncFailure('delete opportunity', new Error('Missing backend identifier.'));
      }
    },
    addProduct: (product) => {
      const productInput = stripProductIdentityForCreate(product);
      const createdProduct = {
        ...productInput,
        id: createSequentialId('PRD', products.length + 1),
        lastUpdated: productInput.lastUpdated ?? getTodayIsoDate(),
      };

      setProducts((current) => [createdProduct, ...current]);
      void salesApi.create('products', toBackendProduct(createdProduct))
        .then((savedProduct) => {
          const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
          setProducts((current) => current.map((item) => (
            item.id === createdProduct.id ? persistedProduct : item
          )));
        })
        .catch((error) => handleSyncFailure('create product', error));
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
        const hasSharedBackendId = products.some((product) => product.id !== productId && product.backendId === backendId);
        if (hasSharedBackendId) {
          return;
        }

        void salesApi.update('products', backendId, toBackendProduct({ ...currentProduct, ...patch, lastUpdated: getTodayIsoDate() }))
          .then((savedProduct) => {
            const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
            setProducts((current) => current.map((product) => (
              product.id === productId ? persistedProduct : product
            )));
          })
          .catch((error) => handleSyncFailure('update product', error));
      } else if (currentProduct) {
        handleSyncFailure('update product', new Error('Missing backend identifier.'));
      }
    },
    createProductRecord: async (product) => {
      const productInput = stripProductIdentityForCreate(product);
      const createdProduct = {
        ...productInput,
        id: createSequentialId('PRD', products.length + 1),
        lastUpdated: productInput.lastUpdated ?? getTodayIsoDate(),
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
        handleSyncFailure('create product', error);
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
      const hasSharedBackendId = products.some((product) => product.id !== productId && product.backendId === backendId);

      try {
        if (hasSharedBackendId) {
          const savedProduct = await salesApi.create('products', toBackendProduct(stripProductIdentityForCreate(optimisticProduct)));
          const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
          setProducts((current) => current.map((product) => (
            product.id === productId ? persistedProduct : product
          )));
          return persistedProduct;
        }

        const savedProduct = await salesApi.update('products', backendId, toBackendProduct(optimisticProduct));
        const persistedProduct = toFrontendProduct(savedProduct as Record<string, unknown>);
        setProducts((current) => current.map((product) => (
          product.id === productId ? persistedProduct : product
        )));
        return persistedProduct;
      } catch (error) {
        handleSyncFailure('update product', error);
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
        .catch((error) => handleSyncFailure('create quote', error));
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
          .catch((error) => handleSyncFailure('update quote', error));
      } else if (currentQuote) {
        handleSyncFailure('update quote', new Error('Missing backend identifier.'));
      }
    },
    deleteQuote: async (quoteId) => {
      const currentQuote = quotes.find((quote) => quote.id === quoteId);
      if (!currentQuote) {
        return;
      }

      const backendId = backendIdFrom(currentQuote);
      if (backendId === undefined) {
        const error = new Error('Missing backend identifier.');
        handleSyncFailure('delete quote', error);
        throw error;
      }

      try {
        await salesApi.delete('quotes', backendId);
        setQuotes((current) => current.filter((quote) => (
          quote.id !== quoteId && quote.backendId !== backendId
        )));
      } catch (error) {
        handleSyncFailure('delete quote', error);
        throw error;
      }
    },
    addSaleRecord: async (saleRecord) => {
      setSalesRecords((current) => [saleRecord, ...current]);
      try {
        const savedSale = await salesApi.create('sales', toBackendSaleRecord(saleRecord, contacts, opportunities, quotes));
        const persistedSale = toFrontendSaleRecord(savedSale as Record<string, unknown>);
        setSalesRecords((current) => current.map((item) => (
          item.id === saleRecord.id ? persistedSale : item
        )));
        return persistedSale;
      } catch (error) {
        handleSyncFailure('create sale', error);
        throw error;
      }
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
          .catch((error) => handleSyncFailure('update sale', error));
      } else if (currentSale) {
        handleSyncFailure('update sale', new Error('Missing backend identifier.'));
      }
    },
    deleteSaleRecord: async (saleId) => {
      const currentSale = salesRecords.find((saleRecord) => saleRecord.id === saleId);
      if (!currentSale) return;
      const backendId = backendIdFrom(currentSale);
      if (backendId === undefined) {
        const error = new Error('Missing backend identifier.');
        handleSyncFailure('delete sale', error);
        throw error;
      }
      try {
        await salesApi.delete('sales', backendId);
        setSalesRecords((current) => current.filter((saleRecord) => (
          saleRecord.id !== saleId && saleRecord.backendId !== backendId
        )));
      } catch (error) {
        handleSyncFailure('delete sale', error);
        throw error;
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
        .catch((error) => handleSyncFailure('create post-sale case', error));
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
        .catch((error) => handleSyncFailure('create contract', error));
      return createdContract;
    },
    updateContract: (contractId, patch) => {
      const currentContract = contracts.find((contract) => contract.id === contractId);
      const updatedContract = currentContract
        ? { ...currentContract, ...patch, lastUpdated: getTodayIsoDate() }
        : undefined;

      setContracts((current) => current.map((contract) => (
        contract.id === contractId ? updatedContract ?? contract : contract
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
          .catch((error) => handleSyncFailure('update contract', error));
      } else if (currentContract) {
        handleSyncFailure('update contract', new Error('Missing backend identifier.'));
      }
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
          .catch((error) => handleSyncFailure('update quote status', error));
      } else if (currentQuote) {
        handleSyncFailure('update quote status', new Error('Missing backend identifier.'));
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
          .catch((error) => handleSyncFailure('connect quote to opportunity', error));
      } else if (currentQuote) {
        handleSyncFailure('connect quote to opportunity', new Error('Missing backend identifier.'));
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
          .catch((error) => handleSyncFailure('update post-sale status', error));
      } else if (currentCase) {
        handleSyncFailure('update post-sale status', new Error('Missing backend identifier.'));
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
          .catch((error) => handleSyncFailure('update contract status', error));
      } else if (currentContract) {
        handleSyncFailure('update contract status', new Error('Missing backend identifier.'));
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
          .catch((error) => handleSyncFailure('update contract signature status', error));
      } else if (currentContract) {
        handleSyncFailure('update contract signature status', new Error('Missing backend identifier.'));
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
          .catch((error) => handleSyncFailure('request contract signature', error));
      } else if (currentContract) {
        handleSyncFailure('request contract signature', new Error('Missing backend identifier.'));
      }
    },
  }), [
    clearSyncIssue,
    contacts,
    contracts,
    handleSyncFailure,
    hasPartialData,
    isLoading,
    loadError,
    opportunities,
    pendingSyncs,
    postSaleCases,
    products,
    quotes,
    reloadAll,
    reloadProducts,
    reloadSalesRecords,
    salesRecords,
    syncIssue,
  ]);

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
