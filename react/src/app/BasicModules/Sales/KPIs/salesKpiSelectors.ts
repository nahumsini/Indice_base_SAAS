import type { SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuote } from '../types';
import type { SaleRecord } from '../Sales/types/salesTypes';
import type { InventoryStockRow } from '../Inventory/types/inventoryTypes';

export type SalesKpiFilters = {
  businessUnit: string;
  business: string;
  seller: string;
  search: string;
};

export type SalesKpiDataSources = {
  contacts: SalesContact[];
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
  sales: SaleRecord[];
  products: SalesCatalogItem[];
  inventoryRows: InventoryStockRow[];
};

export type SalesKpiSellerRankingRow = {
  seller: string;
  quotes: number;
  closed: number;
  sales: number;
  conversion: number;
  pipeline: number;
};

export type SalesKpiMetrics = {
  totalProspects: number;
  activeProspects: number;
  overdueProspects: number;
  pendingFollowUpProspects: number;
  wonProspects: number;
  lostProspects: number;
  totalContacts: number;
  activeCustomers: number;
  newCustomers: number;
  convertedProspects: number;
  totalQuotes: number;
  draftQuotes: number;
  approvedQuotes: number;
  rejectedQuotes: number;
  expiredQuotes: number;
  closedWonQuotes: number;
  totalSales: number;
  salesRevenue: number;
  totalCommissions: number;
  pipelineValue: number;
  averageTicket: number;
  quoteApprovalRate: number;
  quoteRejectionRate: number;
  quoteConversionRate: number;
  inventoryReadiness: number;
  inventoryPreparedProducts: number;
  inventoryRisk: number;
  commercialRisk: number;
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
};

export function parseSalesKpiMoney(value: string) {
  const clean = value.replace(/[^0-9.]/g, '');
  const base = Number(clean || 0);
  return value.toLowerCase().includes('k') ? base * 1000 : base;
}

export function getSalesKpiRate(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}

function normalize(value?: string | number | null) {
  return String(value ?? '').trim().toLowerCase();
}

function includesSearch(values: Array<string | number | undefined | null>, search: string) {
  const query = normalize(search);
  if (!query) return true;
  return values.some((value) => normalize(value).includes(query));
}

function matchesValue(value: string | undefined, filter: string) {
  return filter === 'all' || normalize(value) === normalize(filter);
}

function quoteMatchesBusinessUnit(quote: SalesQuote, businessUnitFilter: string) {
  return businessUnitFilter === 'all' || quote.items.some((item) => item.businessUnitId === businessUnitFilter);
}

function quoteMatchesBusiness(quote: SalesQuote, businessFilter: string) {
  return businessFilter === 'all' || quote.items.some((item) => item.businessId === businessFilter);
}

function opportunityMatchesScope(
  opportunity: SalesOpportunity,
  filteredQuotes: SalesQuote[],
  filteredSales: SaleRecord[],
  filters: SalesKpiFilters,
) {
  if (filters.businessUnit === 'all' && filters.business === 'all') return true;

  return filteredQuotes.some((quote) => quote.opportunityId === opportunity.id)
    || filteredSales.some((sale) => sale.prospectId === opportunity.id);
}

function contactMatchesScope(
  contact: SalesContact,
  filteredQuotes: SalesQuote[],
  filteredSales: SaleRecord[],
  filters: SalesKpiFilters,
) {
  if (filters.businessUnit === 'all' && filters.business === 'all') return true;

  return filteredQuotes.some((quote) => quote.clientId === contact.id || normalize(quote.clientName) === normalize(contact.company))
    || filteredSales.some((sale) => sale.contactId === contact.id || sale.customerId === contact.id || normalize(sale.customerName) === normalize(contact.company));
}

function productMatchesScope(
  product: SalesCatalogItem,
  filteredQuotes: SalesQuote[],
  filteredSales: SaleRecord[],
  filters: SalesKpiFilters,
) {
  if (filters.businessUnit === 'all' && filters.business === 'all' && filters.seller === 'all') return true;

  return filteredQuotes.some((quote) => quote.items.some((item) => item.productId === product.id))
    || filteredSales.some((sale) => sale.saleLines.some((line) => line.productId === product.id));
}

export function filterSalesKpiSources(sources: SalesKpiDataSources, filters: SalesKpiFilters): SalesKpiDataSources {
  const filteredSales = sources.sales.filter((sale) => (
    matchesValue(sale.businessUnitId, filters.businessUnit)
    && matchesValue(sale.businessId, filters.business)
    && (filters.seller === 'all' || sale.sellerName === filters.seller)
    && includesSearch([
      sale.saleNumber,
      sale.quoteReference,
      sale.customerName,
      sale.sellerName,
      sale.businessUnitName,
      sale.businessName,
      sale.paymentReference,
    ], filters.search)
  ));

  const filteredQuotes = sources.quotes.filter((quote) => (
    quoteMatchesBusinessUnit(quote, filters.businessUnit)
    && quoteMatchesBusiness(quote, filters.business)
    && (filters.seller === 'all' || quote.assignedSeller === filters.seller)
    && includesSearch([
      quote.quoteNumber,
      quote.clientName,
      quote.contactPerson,
      quote.assignedSeller,
      quote.status,
      ...quote.items.flatMap((item) => [item.productName, item.sku]),
    ], filters.search)
  ));

  const filteredOpportunities = sources.opportunities.filter((opportunity) => (
    (filters.seller === 'all' || opportunity.owner === filters.seller)
    && opportunityMatchesScope(opportunity, filteredQuotes, filteredSales, filters)
    && includesSearch([
      opportunity.opportunityName,
      opportunity.company,
      opportunity.contactPerson,
      opportunity.owner,
      opportunity.stage,
      opportunity.status,
      opportunity.source,
    ], filters.search)
  ));

  const filteredContacts = sources.contacts.filter((contact) => (
    (filters.seller === 'all' || contact.owner === filters.seller)
    && contactMatchesScope(contact, filteredQuotes, filteredSales, filters)
    && includesSearch([
      contact.company,
      contact.contactPerson,
      contact.email,
      contact.phone,
      contact.owner,
      contact.source,
      contact.role,
    ], filters.search)
  ));

  const filteredProducts = sources.products.filter((product) => (
    productMatchesScope(product, filteredQuotes, filteredSales, filters)
    && includesSearch([
      product.name,
      product.sku,
      product.category,
      product.type,
      product.status,
      product.visibility,
    ], filters.search)
  ));

  const filteredInventoryRows = sources.inventoryRows.filter((row) => (
    matchesValue(row.businessUnitId, filters.businessUnit)
    && matchesValue(row.businessId, filters.business)
    && filteredProducts.some((product) => product.id === row.productId)
    && includesSearch([
      row.name,
      row.sku,
      row.category,
      row.type,
      row.businessUnitName,
      row.businessName,
    ], filters.search)
  ));

  return {
    contacts: filteredContacts,
    opportunities: filteredOpportunities,
    quotes: filteredQuotes,
    sales: filteredSales,
    products: filteredProducts,
    inventoryRows: filteredInventoryRows,
  };
}

export function getSalesRevenue(sales: SaleRecord[]) {
  return sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
}

export function getAverageTicket(sales: SaleRecord[]) {
  return sales.length ? getSalesRevenue(sales) / sales.length : 0;
}

export function getPipelineValue(opportunities: SalesOpportunity[]) {
  return opportunities
    .filter((opportunity) => opportunity.status !== 'Closed')
    .reduce((sum, opportunity) => sum + parseSalesKpiMoney(opportunity.estimatedValue), 0);
}

export function getCommercialRisk(opportunities: SalesOpportunity[]) {
  return opportunities.filter((opportunity) => (
    opportunity.status === 'Overdue'
    || opportunity.status === 'Pending follow-up'
    || opportunity.stage === 'Negotiation'
  )).length;
}

export function getQuoteConversionRate(quotes: SalesQuote[]) {
  return getSalesKpiRate(quotes.filter((quote) => quote.status === 'Closed Won').length, quotes.length);
}

export function getInventoryReadiness(products: SalesCatalogItem[], inventoryRows: InventoryStockRow[]) {
  if (!products.length) return { rate: 0, prepared: 0, risk: 0 };

  const preparedProducts = products.filter((product) => {
    const row = inventoryRows.find((item) => item.productId === product.id);
    const available = row?.distributions.reduce((sum, distribution) => sum + distribution.available, 0) ?? 0;

    return (product.stockPrepared && product.warehousePrepared) || available > 0;
  }).length;
  const risk = inventoryRows.filter((row) => {
    if (!row.usesInventory) return false;
    const available = row.distributions.reduce((sum, distribution) => sum + distribution.available, 0);
    const minimum = row.distributions.reduce((sum, distribution) => sum + distribution.minimum, 0);

    return available <= 0 || available <= minimum;
  }).length;

  return {
    rate: getSalesKpiRate(preparedProducts, products.length),
    prepared: preparedProducts,
    risk,
  };
}

export function getSellerRanking({
  opportunities,
  quotes,
  sales,
}: {
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
  sales: SaleRecord[];
}): SalesKpiSellerRankingRow[] {
  const names = new Set<string>();
  opportunities.forEach((opportunity) => names.add(opportunity.owner));
  quotes.forEach((quote) => names.add(quote.assignedSeller));
  sales.forEach((sale) => names.add(sale.sellerName));

  return Array.from(names)
    .filter(Boolean)
    .map((seller) => {
      const sellerQuotes = quotes.filter((quote) => quote.assignedSeller === seller);
      const sellerSales = sales.filter((sale) => sale.sellerName === seller);
      const sellerPipeline = opportunities
        .filter((opportunity) => opportunity.owner === seller && opportunity.status !== 'Closed')
        .reduce((sum, opportunity) => sum + parseSalesKpiMoney(opportunity.estimatedValue), 0);

      return {
        seller,
        quotes: sellerQuotes.length,
        closed: sellerSales.length,
        sales: getSalesRevenue(sellerSales),
        conversion: getSalesKpiRate(sellerSales.length, sellerQuotes.length),
        pipeline: sellerPipeline,
      };
    })
    .sort((a, b) => b.sales - a.sales || b.closed - a.closed || b.pipeline - a.pipeline);
}

export function getSalesKpiMetrics(sources: SalesKpiDataSources): SalesKpiMetrics {
  const approvedQuotes = sources.quotes.filter((quote) => quote.status === 'Approved');
  const rejectedQuotes = sources.quotes.filter((quote) => quote.status === 'Rejected');
  const expiredQuotes = sources.quotes.filter((quote) => quote.status === 'Expired');
  const closedWonQuotes = sources.quotes.filter((quote) => quote.status === 'Closed Won');
  const inventory = getInventoryReadiness(sources.products, sources.inventoryRows);

  return {
    totalProspects: sources.opportunities.length,
    activeProspects: sources.opportunities.filter((opportunity) => opportunity.status !== 'Closed').length,
    overdueProspects: sources.opportunities.filter((opportunity) => opportunity.status === 'Overdue').length,
    pendingFollowUpProspects: sources.opportunities.filter((opportunity) => opportunity.status === 'Pending follow-up').length,
    wonProspects: sources.opportunities.filter((opportunity) => opportunity.stage === 'Won').length,
    lostProspects: sources.opportunities.filter((opportunity) => opportunity.stage === 'Lost').length,
    totalContacts: sources.contacts.length,
    activeCustomers: sources.contacts.filter((contact) => sources.sales.some((sale) => sale.contactId === contact.id || sale.customerId === contact.id || normalize(sale.customerName) === normalize(contact.company))).length,
    newCustomers: sources.contacts.filter((contact) => contact.source === 'Website' || contact.source === 'Referral').length,
    convertedProspects: sources.contacts.filter((contact) => sources.opportunities.some((opportunity) => opportunity.contactId === contact.id && opportunity.stage === 'Won')).length,
    totalQuotes: sources.quotes.length,
    draftQuotes: sources.quotes.filter((quote) => quote.status === 'Draft').length,
    approvedQuotes: approvedQuotes.length,
    rejectedQuotes: rejectedQuotes.length,
    expiredQuotes: expiredQuotes.length,
    closedWonQuotes: closedWonQuotes.length,
    totalSales: sources.sales.length,
    salesRevenue: getSalesRevenue(sources.sales),
    totalCommissions: sources.sales.reduce((sum, sale) => sum + (sale.commissionAmount || 0), 0),
    pipelineValue: getPipelineValue(sources.opportunities),
    averageTicket: getAverageTicket(sources.sales),
    quoteApprovalRate: getSalesKpiRate(approvedQuotes.length, sources.quotes.length),
    quoteRejectionRate: getSalesKpiRate(rejectedQuotes.length + expiredQuotes.length, sources.quotes.length),
    quoteConversionRate: getQuoteConversionRate(sources.quotes),
    inventoryReadiness: inventory.rate,
    inventoryPreparedProducts: inventory.prepared,
    inventoryRisk: inventory.risk,
    commercialRisk: getCommercialRisk(sources.opportunities),
    totalProducts: sources.products.length,
    activeProducts: sources.products.filter((product) => product.status === 'Active').length,
    inactiveProducts: sources.products.filter((product) => product.status === 'Inactive').length,
  };
}

export function getSalesKpiOptions(sources: SalesKpiDataSources) {
  const businessUnits = new Map<string, string>();
  const businesses = new Map<string, string>();
  const sellers = new Set<string>();

  sources.sales.forEach((sale) => {
    if (sale.businessUnitId && sale.businessUnitName) businessUnits.set(sale.businessUnitId, sale.businessUnitName);
    if (sale.businessId && sale.businessName) businesses.set(sale.businessId, sale.businessName);
    if (sale.sellerName) sellers.add(sale.sellerName);
  });
  sources.quotes.forEach((quote) => {
    quote.items.forEach((item) => {
      if (item.businessUnitId) businessUnits.set(item.businessUnitId, item.businessUnitId);
      if (item.businessId) businesses.set(item.businessId, item.businessId);
    });
    if (quote.assignedSeller) sellers.add(quote.assignedSeller);
  });
  sources.opportunities.forEach((opportunity) => {
    if (opportunity.owner) sellers.add(opportunity.owner);
  });
  sources.inventoryRows.forEach((row) => {
    if (row.businessUnitId && row.businessUnitName) businessUnits.set(row.businessUnitId, row.businessUnitName);
    if (row.businessId && row.businessName) businesses.set(row.businessId, row.businessName);
  });

  return {
    businessUnits: Array.from(businessUnits, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    businesses: Array.from(businesses, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    sellers: Array.from(sellers).sort((a, b) => a.localeCompare(b)),
  };
}
