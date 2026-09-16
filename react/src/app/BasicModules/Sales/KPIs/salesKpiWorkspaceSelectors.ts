import type {
  SalesKpiContactRow,
  SalesKpiOpportunityRow,
  SalesKpiQuoteRow,
  SalesKpiSaleRow,
  SalesKpiWorkspaceSource,
} from '../salesApi';

export type SalesKpiPeriod = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month';
export type SalesKpiView = 'overview' | 'analysis' | 'units' | 'opportunities';
export type SalesKpiScope = { search: string; period: SalesKpiPeriod; unit: string; business: string; seller: string };
export type SalesKpiTablePreference = { currentPage: number; pageSize: number; sortKey: string; sortDirection: 'asc' | 'desc' };

export const salesKpiViews: SalesKpiView[] = ['overview', 'analysis', 'units', 'opportunities'];
export const defaultSalesKpiScope: SalesKpiScope = { search: '', period: 'this_month', unit: 'all', business: 'all', seller: 'all' };
const invalidSales = new Set(['cancelled', 'canceled', 'rejected', 'voided']);
const terminalStages = new Set(['won', 'lost']);

const normalized = (value: unknown) => String(value ?? '').trim().toLowerCase();
const key = (value: number | null) => value == null ? 'unassigned' : String(value);
const contains = (search: string, ...values: unknown[]) => !normalized(search)
  || values.some((value) => normalized(value).includes(normalized(search)));
const dateOnly = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function normalizeSalesKpiView(value: unknown): SalesKpiView {
  return salesKpiViews.includes(value as SalesKpiView) ? value as SalesKpiView : 'overview';
}

export function normalizeSalesKpiScope(value: Partial<SalesKpiScope>): SalesKpiScope {
  const periods: SalesKpiPeriod[] = ['all', 'today', 'this_week', 'this_month', 'last_month'];
  return {
    search: typeof value.search === 'string' ? value.search : '',
    period: periods.includes(value.period as SalesKpiPeriod) ? value.period as SalesKpiPeriod : defaultSalesKpiScope.period,
    unit: typeof value.unit === 'string' ? value.unit : 'all',
    business: typeof value.business === 'string' ? value.business : 'all',
    seller: typeof value.seller === 'string' ? value.seller : 'all',
  };
}

export function salesKpiDateRange(period: SalesKpiPeriod, asOfDate: string) {
  if (period === 'all') return { from: '', to: asOfDate };
  const asOf = new Date(`${asOfDate}T12:00:00`);
  if (period === 'today') return { from: asOfDate, to: asOfDate };
  if (period === 'this_week') {
    const from = new Date(asOf);
    const day = from.getDay() || 7;
    from.setDate(from.getDate() - day + 1);
    return { from: dateOnly(from), to: asOfDate };
  }
  if (period === 'this_month') return { from: `${asOfDate.slice(0, 7)}-01`, to: asOfDate };
  const first = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 1, 12);
  const last = new Date(asOf.getFullYear(), asOf.getMonth(), 0, 12);
  return { from: dateOnly(first), to: dateOnly(last) };
}

export function salesKpiExpectedCloseRange(period: SalesKpiPeriod, asOfDate: string) {
  const range = salesKpiDateRange(period, asOfDate);
  if (period === 'all' || period === 'today' || period === 'last_month') return range;
  const asOf = new Date(`${asOfDate}T12:00:00`);
  if (period === 'this_week') {
    const end = new Date(asOf);
    const day = end.getDay() || 7;
    end.setDate(end.getDate() + (7 - day));
    return { ...range, to: dateOnly(end) };
  }
  return { ...range, to: dateOnly(new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0, 12)) };
}

const inRange = (value: string | null, range: { from: string; to: string }) => (
  !range.from || Boolean(value && value >= range.from && value <= range.to)
);
const assignmentMatches = (unitId: number | null, businessId: number | null, scope: SalesKpiScope) => (
  (scope.unit === 'all' || key(unitId) === scope.unit)
  && (scope.business === 'all' || key(businessId) === scope.business)
);
const sellerKey = (id: number | null, name: string | null) => id == null ? `name:${normalized(name)}` : `id:${id}`;
const sellerMatches = (id: number | null, name: string | null, scope: SalesKpiScope) => (
  scope.seller === 'all' || sellerKey(id, name) === scope.seller
);

export const isValidSale = (sale: SalesKpiSaleRow) => !invalidSales.has(normalized(sale.commercialStatus));
export const isOpenOpportunity = (opportunity: SalesKpiOpportunityRow) => (
  !terminalStages.has(normalized(opportunity.lifecycleStatus || opportunity.stage))
  && normalized(opportunity.status) !== 'closed'
);
export const needsFollowUp = (opportunity: SalesKpiOpportunityRow, asOfDate: string) => (
  isOpenOpportunity(opportunity)
  && Boolean(opportunity.nextActionAt)
  && opportunity.nextActionAt!.slice(0, 10) < asOfDate
);
export const needsHandoff = (sale: SalesKpiSaleRow) => isValidSale(sale) && (
  ['pending', 'pending_validation'].includes(normalized(sale.financeStatus))
  || ['pending', 'not_generated'].includes(normalized(sale.inventoryMovementStatus))
  || !['delivered', 'completed', 'not_required'].includes(normalized(sale.deliveryStatus))
);

export type SalesKpiSelection = {
  contacts: SalesKpiContactRow[];
  opportunities: SalesKpiOpportunityRow[];
  currentQuotes: SalesKpiQuoteRow[];
  quotes: SalesKpiQuoteRow[];
  currentSales: SalesKpiSaleRow[];
  sales: SalesKpiSaleRow[];
  openOpportunities: SalesKpiOpportunityRow[];
  overdueFollowUps: SalesKpiOpportunityRow[];
  handoffSales: SalesKpiSaleRow[];
  range: { from: string; to: string };
};

export function selectSalesKpis(source: SalesKpiWorkspaceSource, scope: SalesKpiScope): SalesKpiSelection {
  const range = salesKpiDateRange(scope.period, source.asOfDate);
  const expectedCloseRange = salesKpiExpectedCloseRange(scope.period, source.asOfDate);
  const contactsById = new Map(source.contacts.map((row) => [row.id, row]));
  const opportunitiesById = new Map(source.opportunities.map((row) => [row.id, row]));
  const quotesById = new Map(source.quotes.map((row) => [row.id, row]));
  const assignmentFor = (opportunityId: number | null, contactId: number | null) => {
    const opportunity = opportunityId == null ? null : opportunitiesById.get(opportunityId);
    const contact = contactId == null ? null : contactsById.get(contactId);
    return { unitId: opportunity?.unitId ?? contact?.unitId ?? null, businessId: opportunity?.businessId ?? contact?.businessId ?? null };
  };

  const currentSales = source.sales.filter((row) => isValidSale(row)
    && assignmentMatches(row.unitId, row.businessId, scope)
    && sellerMatches(row.sellerUserCompanyId, row.sellerName, scope)
    && contains(scope.search, row.saleNumber, row.customerName, row.sellerName,
      opportunitiesById.get(row.opportunityId ?? -1)?.opportunityName,
      quotesById.get(row.quoteId ?? -1)?.quoteNumber,
      contactsById.get(row.contactId ?? -1)?.companyName));
  const sales = currentSales.filter((row) => inRange(row.saleDate, range));
  const currentQuotes = source.quotes.filter((row) => {
    const assignment = assignmentFor(row.opportunityId, row.contactId);
    return assignmentMatches(assignment.unitId, assignment.businessId, scope)
      && sellerMatches(row.sellerUserCompanyId, row.sellerName, scope)
      && contains(scope.search, row.quoteNumber, row.clientName, row.sellerName, row.status,
        opportunitiesById.get(row.opportunityId ?? -1)?.opportunityName,
        contactsById.get(row.contactId ?? -1)?.companyName);
  });
  const quotes = currentQuotes.filter((row) => inRange(row.createdDate, range));
  const opportunities = source.opportunities.filter((row) => assignmentMatches(row.unitId, row.businessId, scope)
    && sellerMatches(row.ownerUserCompanyId, row.ownerName, scope)
    && inRange(row.expectedCloseDate, expectedCloseRange)
    && contains(scope.search, row.opportunityCode, row.opportunityName, row.companyName, row.ownerName, row.stage, row.status));
  const linkedContactIds = new Set<number>([
    ...currentSales.flatMap((row) => row.contactId == null ? [] : [row.contactId]),
    ...currentQuotes.flatMap((row) => row.contactId == null ? [] : [row.contactId]),
    ...opportunities.flatMap((row) => row.contactId == null ? [] : [row.contactId]),
  ]);
  const contacts = source.contacts.filter((row) => assignmentMatches(row.unitId, row.businessId, scope)
    && sellerMatches(row.ownerUserCompanyId, row.ownerName, scope)
    && linkedContactIds.has(row.id)
    && contains(scope.search, row.companyName, row.contactPerson, row.ownerName, row.source));
  const openOpportunities = opportunities.filter(isOpenOpportunity);
  return {
    contacts,
    opportunities,
    currentQuotes,
    quotes,
    currentSales,
    sales,
    openOpportunities,
    overdueFollowUps: openOpportunities.filter((row) => needsFollowUp(row, source.asOfDate)),
    handoffSales: currentSales.filter(needsHandoff),
    range,
  };
}

export function buildSalesFunnel(selection: SalesKpiSelection) {
  const quotedOpportunityIds = new Set(selection.currentQuotes.flatMap((row) => row.opportunityId == null ? [] : [row.opportunityId]));
  const approvedOpportunityIds = new Set(selection.currentQuotes.filter((row) => ['approved', 'accepted', 'closed_won', 'closed won'].includes(normalized(row.status)))
    .flatMap((row) => row.opportunityId == null ? [] : [row.opportunityId]));
  const soldOpportunityIds = new Set(selection.currentSales.flatMap((row) => row.opportunityId == null ? [] : [row.opportunityId]));
  return {
    opportunities: selection.opportunities.length,
    quoted: selection.opportunities.filter((row) => quotedOpportunityIds.has(row.id)).length,
    approved: selection.opportunities.filter((row) => approvedOpportunityIds.has(row.id)).length,
    sold: selection.opportunities.filter((row) => soldOpportunityIds.has(row.id)).length,
  };
}

export function sellerIdentity(id: number | null, name: string | null) {
  return { key: sellerKey(id, name), label: name?.trim() || '—' };
}

export function normalizeSalesKpiTablePreferences(value: unknown): Record<string, SalesKpiTablePreference> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([name]) => ['sellers', 'units', 'opportunities'].includes(name)).map(([name, raw]) => {
    const row = raw && typeof raw === 'object' ? raw as Partial<SalesKpiTablePreference> : {};
    return [name, {
      currentPage: Number.isInteger(row.currentPage) && row.currentPage! > 0 ? row.currentPage! : 1,
      pageSize: [10, 25, 50, 100, 200].includes(row.pageSize!) ? row.pageSize! : 10,
      sortKey: typeof row.sortKey === 'string' ? row.sortKey : '0',
      sortDirection: row.sortDirection === 'asc' ? 'asc' : 'desc',
    }];
  }));
}
