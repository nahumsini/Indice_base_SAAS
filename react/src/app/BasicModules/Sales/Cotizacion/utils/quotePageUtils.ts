import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { QuoteStatus, SalesOpportunity, SalesQuote, SalesQuoteItem } from '../../salesCrmContext';
import { formatSalesCurrencyAmount } from '../../utils/salesCurrency';
import {
  fallbackOwnerValue,
  getOwnerUserCompanyIdFromValue,
  ownerOptionValue,
  type SalesOwnerOption,
} from '../../utils/salesOwnerOptions';
import { normalizeTextKey } from '../../utils/salesTextUtils';
import type { QuoteTaxJurisdiction } from './quoteTaxCatalog';

type QuoteBuilderOnlyItemFields = SalesQuoteItem & {
  taxCode?: unknown;
  taxLabel?: unknown;
  taxJurisdiction?: unknown;
  taxIsCustom?: unknown;
};

export const coralFieldClassName = 'border-slate-200 bg-white shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
export const quoteModalActionClassNames = getSalesModalActionClassNames('coral');
export const quoteSortCollator = new Intl.Collator('es-MX', { numeric: true, sensitivity: 'base' });
export const defaultQuoteTaxJurisdiction: QuoteTaxJurisdiction = 'mx';

export const statusClasses: Record<QuoteStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Sent: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  Viewed: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  Negotiation: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10 dark:text-[#7AD8BF]',
  Rejected: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FFB0AA]',
  Expired: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Closed Won': 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10 dark:text-[#7AD8BF]',
};

export const quoteStatusProgressStyles: Record<QuoteStatus, string> = {
  Draft: 'bg-slate-400',
  Sent: 'bg-[#2563EB]',
  Viewed: 'bg-[#59C3A5]',
  Negotiation: 'bg-[#FF6B5E]',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-[#F43F5E]',
  Expired: 'bg-slate-500',
  'Closed Won': 'bg-[#059669]',
};

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getFutureIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function stripQuoteBuilderOnlyItemFields(items: SalesQuoteItem[]): SalesQuoteItem[] {
  return items.map((item) => {
    const payloadItem: QuoteBuilderOnlyItemFields = { ...item };
    delete payloadItem.taxCode;
    delete payloadItem.taxLabel;
    delete payloadItem.taxJurisdiction;
    delete payloadItem.taxIsCustom;
    return payloadItem;
  });
}

export function formatCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

export type QuoteSellerSelectOption = {
  value: string;
  label: string;
};

export function getDefaultQuoteSellerValue(ownerName: string) {
  return fallbackOwnerValue(ownerName);
}

export function buildQuoteSellerSelectOptions({
  ownerOptions,
  fallbackOwnerNames,
}: {
  ownerOptions: SalesOwnerOption[];
  fallbackOwnerNames: Array<string | null | undefined>;
}): QuoteSellerSelectOption[] {
  const companyOwnerOptions = ownerOptions.map((owner) => ({
    value: ownerOptionValue(owner),
    label: owner.name,
  }));
  const uniqueFallbackOwnerNames = fallbackOwnerNames.filter((owner, index, owners): owner is string => (
    Boolean(owner) && owners.findIndex((candidate) => normalizeTextKey(candidate) === normalizeTextKey(owner)) === index
  ));
  const fallbackOwnerOptions = uniqueFallbackOwnerNames
    .map((owner) => ({ value: fallbackOwnerValue(owner), label: owner }))
    .filter((option) => !companyOwnerOptions.some((owner) => normalizeTextKey(owner.label) === normalizeTextKey(option.label)));

  return [...companyOwnerOptions, ...fallbackOwnerOptions];
}

export function buildQuoteSellerNameByValue(options: QuoteSellerSelectOption[]) {
  return new Map(options.map((owner) => [owner.value, owner.label]));
}

export function getQuoteSellerPayloadFromValue(
  value: string,
  sellerNameByValue: Map<string, string>,
  fallbackSeller: string,
) {
  const userCompanyId = getOwnerUserCompanyIdFromValue(value);
  const sellerName = sellerNameByValue.get(value) ?? value.replace('name:', '');

  return {
    assignedSellerUserCompanyId: userCompanyId,
    assignedSeller: sellerName || fallbackSeller,
  };
}

export function getQuoteSellerSelectValue(quote: SalesQuote, ownerOptions: SalesOwnerOption[]) {
  if (quote.assignedSellerUserCompanyId) {
    return `user-company:${quote.assignedSellerUserCompanyId}`;
  }

  const matchedOwner = ownerOptions.find((owner) => normalizeTextKey(owner.name) === normalizeTextKey(quote.assignedSeller));
  return matchedOwner ? ownerOptionValue(matchedOwner) : fallbackOwnerValue(quote.assignedSeller);
}

export function getDaysUntil(dateValue: string) {
  const expirationTime = new Date(dateValue).getTime();
  const now = new Date(getTodayIsoDate()).getTime();
  return Math.ceil((expirationTime - now) / 86400000);
}

export function filterQuotes({
  quotes,
  opportunities,
  ownerOptions,
  search,
  statusFilter,
  sellerFilter,
  opportunityFilter,
}: {
  quotes: SalesQuote[];
  opportunities: SalesOpportunity[];
  ownerOptions: SalesOwnerOption[];
  search: string;
  statusFilter: string;
  sellerFilter: string;
  opportunityFilter: string;
}) {
  const normalizedSearch = search.trim().toLowerCase();

  return quotes.filter((quote) => {
    const opportunity = opportunities.find((item) => item.id === quote.opportunityId);
    const matchesSearch = !normalizedSearch || [
      quote.quoteNumber,
      quote.clientName,
      quote.contactPerson,
      quote.assignedSeller,
      opportunity?.opportunityName ?? '',
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const matchesSeller = sellerFilter === 'all' || getQuoteSellerSelectValue(quote, ownerOptions) === sellerFilter;
    const matchesOpportunity = opportunityFilter === 'all'
      || (opportunityFilter === 'none' ? !quote.opportunityId : quote.opportunityId === opportunityFilter);

    return matchesSearch && matchesStatus && matchesSeller && matchesOpportunity;
  });
}
