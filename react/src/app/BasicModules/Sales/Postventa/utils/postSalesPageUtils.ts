import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type {
  CustomerRelationType,
  PostSaleRiskLevel,
  PostSaleStatus,
  SalesContact,
  SalesOpportunity,
  SalesPostSaleCase,
  SalesQuote,
} from '../../salesCrmContext';
import {
  getCustomerLifecycleSignals,
  type CustomerHealthStatus,
  type CustomerLifecycleSignals,
  type CustomerRelationshipStatus,
} from '../../utils/customerLifecycle';
import { formatSalesCurrencyAmount, normalizeSalesCurrencyCode } from '../../utils/salesCurrency';
import type { SaleRecord } from '../../Sales/types/salesTypes';
import type { CustomerHistory, FilterValue } from '../types/postSalesTypes';

export const postSaleModalActions = getSalesModalActionClassNames('coral');
export const futureOpportunityModalActions = getSalesModalActionClassNames('aqua');
export const salesModalIconClassName = 'h-5 w-5 text-white';

export const statusClasses: Record<PostSaleStatus, string> = {
  Active: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  'Pending follow-up': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  'In service': 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  'Renewal soon': 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
  Recurrent: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  'At risk': 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FFB0AA]',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10 dark:text-[#7AD8BF]',
  Closed: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const relationClasses: Record<CustomerRelationType, string> = {
  'One-time customer': 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Recurrent customer': 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  'Renewal customer': 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
  'Dormant customer': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  'Lost prospect': 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FFB0AA]',
};

export const riskClasses: Record<PostSaleRiskLevel, string> = {
  Low: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  Medium: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  High: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FFB0AA]',
};

export const healthClasses: Record<CustomerHealthStatus, string> = {
  healthy: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  attention: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  at_risk: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]',
  lost: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const relationshipClasses: Record<CustomerRelationshipStatus, string> = {
  first_purchase: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  recurring: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  renewal: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  recovered: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F7D973]',
  dormant: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const statusProgressClasses: Record<PostSaleStatus, string> = {
  Active: 'bg-[#59C3A5]',
  'Pending follow-up': 'bg-[#F4C84A]',
  'In service': 'bg-[#2563EB]',
  'Renewal soon': 'bg-violet-500',
  Recurrent: 'bg-[#177d66]',
  'At risk': 'bg-[#FF6B5E]',
  Completed: 'bg-emerald-500',
  Closed: 'bg-slate-400',
};

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getFutureIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getIsoDateAfter(baseDate: string | undefined, days: number) {
  const date = baseDate ? new Date(baseDate) : new Date();

  if (Number.isNaN(date.getTime())) {
    return getFutureIsoDate(days);
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDaysUntil(date?: string) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  const target = new Date(date).getTime();
  const today = new Date(getTodayIsoDate()).getTime();
  return Math.ceil((target - today) / 86400000);
}

export function formatCurrency(value: number, currency?: string | null) {
  return formatSalesCurrencyAmount(value, currency);
}

export function parseFiles(value: string) {
  return value.split(',').map((file) => file.trim()).filter(Boolean);
}

export function normalizeKey(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

export function getHistoryCurrency(history?: Pick<CustomerHistory, 'currency' | 'sales' | 'postSaleCase'> | null) {
  return normalizeSalesCurrencyCode(history?.sales[0]?.currency ?? history?.currency ?? history?.postSaleCase?.currency);
}

export function getEmailHref(email: string, subject: string) {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}`;
}

export function getLatestDate(values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .sort((left, right) => new Date(right as string).getTime() - new Date(left as string).getTime())[0];
}

export function getHistoryRelationType(salesCount: number, postSaleCase?: SalesPostSaleCase): CustomerRelationType {
  if (postSaleCase) return postSaleCase.relationType;
  if (salesCount > 1) return 'Recurrent customer';
  if (salesCount === 1) return 'One-time customer';
  return 'Dormant customer';
}

export function getHistoryStatus(salesCount: number, postSaleCase?: SalesPostSaleCase): PostSaleStatus {
  if (postSaleCase) return postSaleCase.status;
  return salesCount > 0 ? 'Active' : 'Pending follow-up';
}

export function getHistoryRisk(history: Pick<CustomerHistory, 'sales' | 'postSaleCase' | 'nextFollowUpDate'>): PostSaleRiskLevel {
  if (history.postSaleCase) return history.postSaleCase.riskLevel;
  const days = getDaysUntil(history.nextFollowUpDate);
  if (days < 0) return 'High';
  return history.sales.length > 0 ? 'Low' : 'Medium';
}

export function buildCustomerHistories({
  contacts,
  postSaleCases,
  salesRecords,
}: {
  contacts: SalesContact[];
  postSaleCases: SalesPostSaleCase[];
  salesRecords: SaleRecord[];
}) {
  const histories = new Map<string, CustomerHistory>();

  salesRecords.forEach((sale) => {
    const contact = contacts.find((item) => item.id === sale.contactId || item.id === sale.customerId)
      ?? contacts.find((item) => normalizeKey(item.company) === normalizeKey(sale.customerName));
    const key = contact?.id ?? `sale-${normalizeKey(sale.customerName)}`;
    const existing = histories.get(key);
    const saleHistory = [...(existing?.sales ?? []), sale].sort((left, right) => new Date(right.saleDate).getTime() - new Date(left.saleDate).getTime());

    histories.set(key, {
      id: key,
      clientId: contact?.id ?? sale.contactId ?? sale.customerId,
      clientName: contact?.company ?? sale.customerName,
      contactPerson: contact?.contactPerson ?? sale.customerName,
      phone: existing?.phone ?? contact?.phone ?? '',
      email: existing?.email ?? contact?.email ?? '',
      owner: existing?.owner ?? contact?.owner ?? sale.sellerName,
      relationType: existing?.relationType ?? 'One-time customer',
      postSaleType: existing?.postSaleType ?? 'Standard post-sale',
      status: existing?.status ?? 'Active',
      riskLevel: existing?.riskLevel ?? 'Low',
      lastPurchaseDate: getLatestDate([existing?.lastPurchaseDate, sale.saleDate]),
      nextFollowUpDate: existing?.nextFollowUpDate,
      renewalDate: existing?.renewalDate,
      lifetimeValue: (existing?.lifetimeValue ?? 0) + sale.totalAmount,
      currency: saleHistory[0]?.currency ?? existing?.currency ?? sale.currency,
      notes: existing?.notes ?? sale.notes,
      files: existing?.files ?? [],
      sales: saleHistory,
      postSaleCase: existing?.postSaleCase,
    });
  });

  postSaleCases.forEach((postSaleCase) => {
    const contact = contacts.find((item) => item.id === postSaleCase.clientId)
      ?? contacts.find((item) => normalizeKey(item.company) === normalizeKey(postSaleCase.clientName));
    const key = contact?.id ?? postSaleCase.clientId ?? `case-${normalizeKey(postSaleCase.clientName)}`;
    const existing = histories.get(key);

    if (!existing) {
      return;
    }

    histories.set(key, {
      id: key,
      clientId: contact?.id ?? postSaleCase.clientId,
      clientName: postSaleCase.clientName,
      contactPerson: postSaleCase.contactPerson,
      phone: existing?.phone ?? contact?.phone ?? '',
      email: existing?.email ?? contact?.email ?? '',
      owner: postSaleCase.owner,
      relationType: postSaleCase.relationType,
      postSaleType: postSaleCase.postSaleType,
      status: postSaleCase.status,
      riskLevel: postSaleCase.riskLevel,
      lastPurchaseDate: getLatestDate([existing?.lastPurchaseDate, postSaleCase.lastPurchaseDate]),
      nextFollowUpDate: postSaleCase.nextFollowUpDate,
      renewalDate: postSaleCase.renewalDate,
      lifetimeValue: Math.max(existing?.lifetimeValue ?? 0, postSaleCase.lifetimeValue),
      currency: existing?.currency ?? postSaleCase.currency,
      notes: postSaleCase.notes || existing?.notes || '',
      files: Array.from(new Set([...(existing?.files ?? []), ...postSaleCase.files])),
      sales: existing?.sales ?? [],
      postSaleCase,
    });
  });

  return Array.from(histories.values())
    .map((history) => {
      const relationType = getHistoryRelationType(history.sales.length, history.postSaleCase);
      const status = getHistoryStatus(history.sales.length, history.postSaleCase);
      const riskLevel = getHistoryRisk(history);

      return {
        ...history,
        relationType,
        status,
        riskLevel,
        lifetimeValue: history.lifetimeValue || history.sales.reduce((total, sale) => total + sale.totalAmount, 0),
        currency: getHistoryCurrency(history),
      };
    })
    .sort((left, right) => new Date(right.lastPurchaseDate ?? '1900-01-01').getTime() - new Date(left.lastPurchaseDate ?? '1900-01-01').getTime());
}

export function buildLifecycleByHistoryId(customerHistories: CustomerHistory[]): Record<string, CustomerLifecycleSignals> {
  return Object.fromEntries(customerHistories.map((history) => {
    const fallbackSale = {
      customerName: history.clientName,
      contactId: history.clientId,
      saleDate: history.lastPurchaseDate,
      totalAmount: history.lifetimeValue,
    };
    const primarySale = history.sales[0] ?? fallbackSale;
    const customerSales = history.sales.length ? history.sales : [fallbackSale];

    return [
      history.id,
      getCustomerLifecycleSignals({
        sale: primarySale,
        sales: customerSales,
        postSaleRecords: history.postSaleCase ? [history.postSaleCase] : [],
      }),
    ];
  }));
}

export function filterCustomerHistories({
  customerHistories,
  lifecycleByHistoryId,
  search,
  typeFilter,
  ownerFilter,
  healthFilter,
}: {
  customerHistories: CustomerHistory[];
  lifecycleByHistoryId: Record<string, CustomerLifecycleSignals>;
  search: string;
  typeFilter: FilterValue;
  ownerFilter: FilterValue;
  healthFilter: FilterValue;
}) {
  const normalizedSearch = search.trim().toLowerCase();

  return customerHistories.filter((history) => {
    const lifecycle = lifecycleByHistoryId[history.id];
    const matchesSearch = !normalizedSearch || [
      history.clientName,
      history.contactPerson,
      history.owner,
      history.notes,
      ...history.sales.flatMap((sale) => [sale.saleNumber, sale.quoteReference, sale.paymentReference, sale.notes]),
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
    const matchesType = typeFilter === 'all' || history.postSaleType === typeFilter;
    const matchesOwner = ownerFilter === 'all' || history.owner === ownerFilter;
    const matchesHealth = healthFilter === 'all' || lifecycle?.health === healthFilter;

    return matchesSearch && matchesType && matchesOwner && matchesHealth;
  });
}

export function filterPostSaleCases({
  postSaleCases,
  opportunities,
  quotes,
  search,
  typeFilter,
  ownerFilter,
}: {
  postSaleCases: SalesPostSaleCase[];
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
  search: string;
  typeFilter: FilterValue;
  ownerFilter: FilterValue;
}) {
  const normalizedSearch = search.trim().toLowerCase();

  return postSaleCases.filter((postSaleCase) => {
    const opportunity = opportunities.find((item) => item.id === postSaleCase.relatedOpportunityId);
    const quote = quotes.find((item) => item.id === postSaleCase.lastQuoteId);
    const matchesSearch = !normalizedSearch || [
      postSaleCase.clientName,
      postSaleCase.contactPerson,
      postSaleCase.owner,
      postSaleCase.notes,
      postSaleCase.nextAction,
      opportunity?.opportunityName ?? '',
      quote?.quoteNumber ?? '',
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
    const matchesType = typeFilter === 'all' || postSaleCase.postSaleType === typeFilter;
    const matchesOwner = ownerFilter === 'all' || postSaleCase.owner === ownerFilter;

    return matchesSearch && matchesType && matchesOwner;
  });
}
