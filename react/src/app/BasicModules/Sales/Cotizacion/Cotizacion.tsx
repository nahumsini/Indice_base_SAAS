import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  FileText,
  Link2,
  Paperclip,
  PencilLine,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import { salesApi } from '../salesApi';
import {
  opportunityLinkedQuoteStatuses,
  quoteStatuses,
  salesOwners,
  type QuoteStatus,
  type SalesCatalogItem,
  type SalesQuote,
  type SalesQuoteItem,
  useSalesCrm,
} from '../salesCrmContext';
import { getSalesModalStyles } from '../salesModalStyles';
import {
  fallbackOwnerValue,
  getOwnerUserCompanyIdFromValue,
  normalizeSalesOwnerOption,
  ownerOptionValue,
  type SalesOwnerOption,
} from '../utils/salesOwnerOptions';
import { compactText, normalizeTextKey } from '../utils/salesTextUtils';
import {
  FilterSelect,
  QuoteAction,
  QuotePipelineMetric,
  QuoteSellerSelect,
  QuoteSortableHeader,
  type QuoteSortColumn,
  type QuoteSortState,
} from './components/QuoteUi';
import { QuoteExpirationBadge } from './components/QuoteExpirationBadge';
import { QuoteLearningGuide } from './components/QuoteLearningGuide';
import { QuoteMarginBadge } from './components/QuoteMarginBadge';
import { QuotePreviewModal } from './components/QuotePreviewModal';
import { QuoteReadinessBadge } from './components/QuoteReadinessBadge';
import { QuoteBuilderModal } from './modals/QuoteBuilderModal';
import { useQuotesTranslations } from './translations';
import type { QuoteFormState } from './types/quoteBuilderTypes';
import { getProductMargin } from './utils/quoteCatalogAdapters';
import { calculateQuoteBuilderTotals } from './utils/quotePricing';
import { getQuoteTableSignals } from './utils/quoteTableSignals';
import {
  getDefaultTaxPresetForJurisdiction,
  type QuoteTaxJurisdiction,
} from './utils/quoteTaxCatalog';

type FilterValue = 'all' | string;

interface CotizacionProps {
  learningModeActive?: boolean;
}

const quoteModalStyles = getSalesModalStyles('coral');
const coralFieldClassName = 'border-slate-200 bg-white shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20';
const quoteSortCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const defaultQuoteTaxJurisdiction: QuoteTaxJurisdiction = 'mx';

const statusClasses: Record<QuoteStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-600',
  Sent: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  Viewed: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  Negotiation: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Rejected: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  Expired: 'border-slate-300 bg-slate-100 text-slate-500',
  'Closed Won': 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const quoteStatusProgressStyles: Record<QuoteStatus, string> = {
  Draft: 'bg-slate-400',
  Sent: 'bg-[#2563EB]',
  Viewed: 'bg-[#59C3A5]',
  Negotiation: 'bg-[#FF6B5E]',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-[#F43F5E]',
  Expired: 'bg-slate-500',
  'Closed Won': 'bg-[#059669]',
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getFutureIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function stripQuoteBuilderOnlyItemFields(items: SalesQuoteItem[]): SalesQuoteItem[] {
  return items.map((item) => {
    const payloadItem = { ...item };
    delete payloadItem.taxCode;
    delete payloadItem.taxLabel;
    delete payloadItem.taxJurisdiction;
    delete payloadItem.taxIsCustom;
    return payloadItem;
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function getQuoteSellerSelectValue(quote: SalesQuote, ownerOptions: SalesOwnerOption[]) {
  if (quote.assignedSellerUserCompanyId) {
    return `user-company:${quote.assignedSellerUserCompanyId}`;
  }

  const matchedOwner = ownerOptions.find((owner) => normalizeTextKey(owner.name) === normalizeTextKey(quote.assignedSeller));
  return matchedOwner ? ownerOptionValue(matchedOwner) : fallbackOwnerValue(quote.assignedSeller);
}

function formatTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.split(`{${key}}`).join(String(value)),
    template,
  );
}

function getDaysUntil(dateValue: string) {
  const expirationTime = new Date(dateValue).getTime();
  const now = new Date(getTodayIsoDate()).getTime();
  return Math.ceil((expirationTime - now) / 86400000);
}

export default function Cotizacion({ learningModeActive = false }: CotizacionProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useQuotesTranslations();
  const {
    contacts,
    opportunities,
    products,
    quotes,
    addQuote,
    updateQuote,
    addOpportunity,
    updateQuoteStatus,
    connectQuoteToOpportunity,
  } = useSalesCrm();

  const defaultFallbackSellerValue = fallbackOwnerValue(salesOwners[0]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<SalesQuote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<SalesQuote | null>(null);
  const [selectedFilesQuote, setSelectedFilesQuote] = useState<SalesQuote | null>(null);
  const [pendingAssignmentQuote, setPendingAssignmentQuote] = useState<SalesQuote | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('none');
  const [newOpportunityName, setNewOpportunityName] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<SalesOwnerOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [contextCurrentUserCompanyId, setContextCurrentUserCompanyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [sellerFilter, setSellerFilter] = useState<FilterValue>('all');
  const [opportunityFilter, setOpportunityFilter] = useState<FilterValue>('all');
  const [sortState, setSortState] = useState<QuoteSortState>({ columnId: 'created', direction: 'desc' });
  const [form, setForm] = useState<QuoteFormState>(() => ({
    clientMode: 'contact',
    clientId: contacts[0]?.id ?? '',
    temporaryClient: '',
    contactPerson: '',
    opportunityId: 'none',
    status: 'Draft',
    createdDate: getTodayIsoDate(),
    expirationDate: getFutureIsoDate(15),
    assignedSellerValue: defaultFallbackSellerValue,
    assignedSeller: salesOwners[0],
    taxJurisdiction: defaultQuoteTaxJurisdiction,
    customJurisdictionName: '',
    customTaxLabel: '',
    customTaxRate: '0',
    notes: '',
    terms: '',
  }));
  const [items, setItems] = useState<SalesQuoteItem[]>([]);

  const quoteTotals = useMemo(() => calculateQuoteBuilderTotals(items, products), [items, products]);

  useEffect(() => {
    let isMounted = true;

    const loadSalesOwners = async () => {
      const [sessionResult, salesContextResult, hrUsersResult] = await Promise.allSettled([
        authApi.getSessionOrNull(),
        salesApi.context(),
        humanResourcesApi.listHrUsers(),
      ]);

      if (!isMounted) {
        return;
      }

      if (sessionResult.status === 'fulfilled') {
        setCurrentUserId(sessionResult.value?.user.id ?? null);
      }

      if (salesContextResult.status === 'fulfilled') {
        setContextCurrentUserCompanyId(salesContextResult.value.currentUserCompanyId ?? null);
      }

      const ownerMap = new Map<number, SalesOwnerOption>();
      const salesContextOwners = salesContextResult.status === 'fulfilled'
        ? salesContextResult.value.users
        : [];
      const hrOwners = hrUsersResult.status === 'fulfilled'
        ? hrUsersResult.value.items
        : [];

      [...salesContextOwners, ...hrOwners].forEach((user) => {
        const owner = normalizeSalesOwnerOption(user);
        if (owner && !ownerMap.has(owner.userCompanyId)) {
          ownerMap.set(owner.userCompanyId, owner);
        }
      });

      setOwnerOptions(Array.from(ownerMap.values()).sort((left, right) => left.name.localeCompare(right.name)));
    };

    void loadSalesOwners();

    return () => {
      isMounted = false;
    };
  }, []);

  const sellerSelectOptions = useMemo(() => {
    const companyOwnerOptions = ownerOptions.map((owner) => ({
      value: ownerOptionValue(owner),
      label: owner.name,
    }));
    const fallbackOwnerNames = [...salesOwners, ...contacts.map((contact) => contact.owner), ...opportunities.map((opportunity) => opportunity.owner), ...quotes.map((quote) => quote.assignedSeller)]
      .filter((owner, index, owners) => owner && owners.findIndex((candidate) => normalizeTextKey(candidate) === normalizeTextKey(owner)) === index);
    const fallbackOwnerOptions = fallbackOwnerNames
      .map((owner) => ({ value: fallbackOwnerValue(owner), label: owner }))
      .filter((option) => !companyOwnerOptions.some((owner) => normalizeTextKey(owner.label) === normalizeTextKey(option.label)));

    return [...companyOwnerOptions, ...fallbackOwnerOptions];
  }, [contacts, opportunities, ownerOptions, quotes]);

  const sellerNameByValue = useMemo(
    () => new Map(sellerSelectOptions.map((owner) => [owner.value, owner.label])),
    [sellerSelectOptions],
  );
  const currentUserCompanyId = useMemo(
    () => contextCurrentUserCompanyId ?? ownerOptions.find((owner) => owner.userId === currentUserId)?.userCompanyId ?? null,
    [contextCurrentUserCompanyId, currentUserId, ownerOptions],
  );
  const defaultSellerValue = currentUserCompanyId
    ? `user-company:${currentUserCompanyId}`
    : sellerSelectOptions[0]?.value ?? defaultFallbackSellerValue;
  const getSellerPayloadFromValue = (value: string) => {
    const userCompanyId = getOwnerUserCompanyIdFromValue(value);
    const sellerName = sellerNameByValue.get(value) ?? value.replace('name:', '');

    return {
      assignedSellerUserCompanyId: userCompanyId,
      assignedSeller: sellerName || salesOwners[0],
    };
  };
  const resolveQuoteSellerValue = (quote: SalesQuote) => getQuoteSellerSelectValue(quote, ownerOptions);
  const opportunityNameById = useMemo(
    () => new Map(opportunities.map((opportunity) => [opportunity.id, opportunity.opportunityName])),
    [opportunities],
  );

  const filteredQuotes = useMemo(() => quotes.filter((quote) => {
    const normalizedSearch = search.trim().toLowerCase();
    const opportunity = opportunities.find((item) => item.id === quote.opportunityId);
    const matchesSearch = !normalizedSearch || [
      quote.quoteNumber,
      quote.clientName,
      quote.contactPerson,
      quote.assignedSeller,
      opportunity?.opportunityName ?? '',
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const matchesSeller = sellerFilter === 'all' || resolveQuoteSellerValue(quote) === sellerFilter;
    const matchesOpportunity = opportunityFilter === 'all'
      || (opportunityFilter === 'none' ? !quote.opportunityId : quote.opportunityId === opportunityFilter);

    return matchesSearch && matchesStatus && matchesSeller && matchesOpportunity;
  }), [opportunities, opportunityFilter, ownerOptions, quotes, search, sellerFilter, statusFilter]);

  const getQuoteSortValue = (quote: SalesQuote, columnId: QuoteSortColumn) => {
    switch (columnId) {
      case 'number':
        return quote.quoteNumber;
      case 'client':
        return `${quote.clientName} ${quote.contactPerson}`;
      case 'opportunity':
        return quote.opportunityId ? opportunityNameById.get(quote.opportunityId) ?? '' : '';
      case 'status':
        return t.statusLabels[quote.status] ?? quote.status;
      case 'amount':
        return quote.total;
      case 'margin':
        return calculateQuoteBuilderTotals(quote.items, products).estimatedMargin;
      case 'created':
        return quote.createdDate;
      case 'expiration':
        return quote.expirationDate;
      case 'seller':
        return quote.assignedSeller;
      case 'updated':
        return quote.lastUpdated;
      case 'files':
        return quote.files.length;
      default:
        return '';
    }
  };
  const sortedQuotes = useMemo(() => [...filteredQuotes].sort((left, right) => {
    const leftValue = getQuoteSortValue(left, sortState.columnId);
    const rightValue = getQuoteSortValue(right, sortState.columnId);
    const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * directionMultiplier;
    }

    return quoteSortCollator.compare(String(leftValue), String(rightValue)) * directionMultiplier;
  }), [filteredQuotes, opportunityNameById, products, sortState, t.statusLabels]);
  const handleSort = (columnId: QuoteSortColumn) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
  };
  const visibleLiveQuotesCount = filteredQuotes.filter((quote) => !['Rejected', 'Expired', 'Closed Won'].includes(quote.status)).length;
  const visibleQuotedValue = filteredQuotes.reduce((total, quote) => total + quote.total, 0);
  const visibleExpiringSoonCount = filteredQuotes.filter((quote) => {
    const differenceInDays = getDaysUntil(quote.expirationDate);
    return differenceInDays >= 0 && differenceInDays <= 7;
  }).length;
  const averageMargin = Math.round(products.reduce((total, product) => total + getProductMargin(product), 0) / Math.max(products.length, 1));
  const statusCounts = quoteStatuses.map((status) => ({
    status,
    count: filteredQuotes.filter((quote) => quote.status === status).length,
  }));
  const kpiSummary = formatTemplate(t.metrics.summary, {
    expiring: visibleExpiringSoonCount,
    value: formatCurrency(visibleQuotedValue),
    margin: averageMargin,
  });

  const statusOptions = [
    { value: 'all', label: t.filters.allStatuses },
    ...quoteStatuses.map((status) => ({ value: status, label: t.statusLabels[status] })),
  ];
  const sellerOptions = [
    { value: 'all', label: t.filters.allSellers },
    ...sellerSelectOptions,
  ];
  const formSellerOptions = form.assignedSellerValue && !sellerSelectOptions.some((seller) => seller.value === form.assignedSellerValue)
    ? [{ value: form.assignedSellerValue, label: form.assignedSeller || t.common.unassigned }, ...sellerSelectOptions]
    : sellerSelectOptions;
  const opportunityOptions = [
    { value: 'all', label: t.filters.allOpportunities },
    { value: 'none', label: t.common.unassigned },
    ...opportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName })),
  ];

  const selectedContact = contacts.find((contact) => contact.id === form.clientId);
  const selectedBuilderOpportunity = form.opportunityId === 'none'
    ? null
    : opportunities.find((opportunity) => opportunity.id === form.opportunityId) ?? null;
  const getQuoteContact = (quote?: SalesQuote | null) => {
    if (!quote) {
      return null;
    }

    return quote.clientId
      ? contacts.find((contact) => contact.id === quote.clientId) ?? null
      : contacts.find((contact) => (
          normalizeTextKey(contact.company) === normalizeTextKey(quote.clientName)
          && normalizeTextKey(contact.contactPerson) === normalizeTextKey(quote.contactPerson)
        )) ?? null;
  };
  const previewContact = getQuoteContact(previewQuote);
  const previewOpportunity = previewQuote?.opportunityId
    ? opportunities.find((opportunity) => opportunity.id === previewQuote.opportunityId) ?? null
    : null;
  const getAssignmentOpportunities = (quote?: SalesQuote | null) => (
    quote?.clientId
      ? opportunities.filter((opportunity) => opportunity.contactId === quote.clientId)
      : opportunities
  );
  const assignmentOpportunities = getAssignmentOpportunities(pendingAssignmentQuote);

  const addProductToQuote = (product: SalesCatalogItem) => {
    const defaultTaxPreset = getDefaultTaxPresetForJurisdiction(form.taxJurisdiction);

    setItems((current) => [
      ...current,
      {
        id: `TMP-${Date.now()}-${current.length + 1}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        section: t.sections.catalogTitle,
        quantity: 1,
        unitPrice: product.price,
        discountPercent: 0,
        taxPercent: defaultTaxPreset.defaultRate,
        taxCode: defaultTaxPreset.id,
        taxLabel: defaultTaxPreset.label,
        taxJurisdiction: form.taxJurisdiction,
        taxIsCustom: defaultTaxPreset.rateEditable,
        notes: '',
      },
    ]);
  };

  const updateItem = (itemId: string, patch: Partial<SalesQuoteItem>) => {
    setItems((current) => current.map((item) => (
      item.id === itemId ? { ...item, ...patch } : item
    )));
  };

  const removeItem = (itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const resetBuilder = () => {
    setForm({
      clientMode: 'contact',
      clientId: contacts[0]?.id ?? '',
      temporaryClient: '',
      contactPerson: '',
      opportunityId: 'none',
      status: 'Draft',
      createdDate: getTodayIsoDate(),
      expirationDate: getFutureIsoDate(15),
      assignedSellerValue: defaultSellerValue,
      assignedSeller: getSellerPayloadFromValue(defaultSellerValue).assignedSeller,
      taxJurisdiction: defaultQuoteTaxJurisdiction,
      customJurisdictionName: '',
      customTaxLabel: '',
      customTaxRate: '0',
      notes: '',
      terms: '',
    });
    setItems([]);
  };

  const openCreateQuoteBuilder = () => {
    setEditingQuote(null);
    resetBuilder();
    setIsBuilderOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('create') !== 'quote') {
      return;
    }

    openCreateQuoteBuilder();
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('create');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const openEditQuoteBuilder = (quote: SalesQuote) => {
    const contact = quote.clientId
      ? contacts.find((item) => item.id === quote.clientId)
      : null;
    const sellerValue = getQuoteSellerSelectValue(quote, ownerOptions);

    setEditingQuote(quote);
    setForm({
      clientMode: contact ? 'contact' : 'temporary',
      clientId: contact?.id ?? contacts[0]?.id ?? '',
      temporaryClient: contact ? '' : quote.clientName,
      contactPerson: contact ? '' : quote.contactPerson,
      opportunityId: quote.opportunityId ?? 'none',
      status: quote.status,
      createdDate: quote.createdDate,
      expirationDate: quote.expirationDate,
      assignedSellerValue: sellerValue,
      assignedSeller: quote.assignedSeller,
      taxJurisdiction: defaultQuoteTaxJurisdiction,
      customJurisdictionName: '',
      customTaxLabel: '',
      customTaxRate: '0',
      notes: quote.notes,
      terms: quote.terms,
    });
    setItems(quote.items.map((item) => ({ ...item })));
    setIsBuilderOpen(true);
  };

  const closeQuoteBuilder = () => {
    setIsBuilderOpen(false);
    setEditingQuote(null);
    resetBuilder();
  };

  const handleSaveQuote = () => {
    const clientName = form.clientMode === 'contact' ? selectedContact?.company : form.temporaryClient.trim();
    const contactPerson = form.clientMode === 'contact' ? selectedContact?.contactPerson : form.contactPerson.trim();

    if (!clientName || items.length === 0) {
      return;
    }

    const sellerPayload = getSellerPayloadFromValue(form.assignedSellerValue);
    const quotePayload = {
      clientId: form.clientMode === 'contact' ? selectedContact?.id : undefined,
      clientName,
      contactPerson: contactPerson || t.common.unassigned,
      opportunityId: form.opportunityId === 'none' ? undefined : form.opportunityId,
      status: form.status,
      createdDate: form.createdDate,
      expirationDate: form.expirationDate,
      assignedSellerUserCompanyId: sellerPayload.assignedSellerUserCompanyId,
      assignedSeller: sellerPayload.assignedSeller,
      items: stripQuoteBuilderOnlyItemFields(items),
      subtotal: quoteTotals.subtotal,
      discountTotal: quoteTotals.discountTotal,
      taxTotal: quoteTotals.taxTotal,
      total: quoteTotals.total,
      notes: form.notes,
      terms: form.terms,
    };

    if (editingQuote) {
      updateQuote(editingQuote.id, quotePayload);
      const updatedQuote = {
        ...editingQuote,
        ...quotePayload,
      };

      if (opportunityLinkedQuoteStatuses.includes(updatedQuote.status)) {
        const matchingOpportunities = getAssignmentOpportunities(updatedQuote);
        setPendingAssignmentQuote(updatedQuote);
        setSelectedOpportunityId(updatedQuote.opportunityId ?? matchingOpportunities[0]?.id ?? 'none');
        setNewOpportunityName(`${updatedQuote.clientName} - ${updatedQuote.quoteNumber}`);
      }

      closeQuoteBuilder();
      return;
    }

    const createdQuote = addQuote({
      ...quotePayload,
      files: [],
    });

    if (opportunityLinkedQuoteStatuses.includes(createdQuote.status)) {
      const matchingOpportunities = getAssignmentOpportunities(createdQuote);
      setPendingAssignmentQuote(createdQuote);
      setSelectedOpportunityId(createdQuote.opportunityId ?? matchingOpportunities[0]?.id ?? 'none');
      setNewOpportunityName(`${createdQuote.clientName} - ${createdQuote.quoteNumber}`);
    }

    closeQuoteBuilder();
  };

  const handleStatusChange = (quote: SalesQuote, status: QuoteStatus) => {
    updateQuoteStatus(quote.id, status);
    const updatedQuote = { ...quote, status };

    if (opportunityLinkedQuoteStatuses.includes(status)) {
      const matchingOpportunities = getAssignmentOpportunities(updatedQuote);
      setPendingAssignmentQuote(updatedQuote);
      setSelectedOpportunityId(quote.opportunityId ?? matchingOpportunities[0]?.id ?? 'none');
      setNewOpportunityName(`${quote.clientName} - ${quote.quoteNumber}`);
    }
  };

  const closeAssignmentModal = () => {
    setPendingAssignmentQuote(null);
    setSelectedOpportunityId('none');
    setNewOpportunityName('');
  };

  const assignExistingOpportunity = () => {
    if (!pendingAssignmentQuote || selectedOpportunityId === 'none') {
      return;
    }

    connectQuoteToOpportunity(pendingAssignmentQuote.id, selectedOpportunityId);
    closeAssignmentModal();
  };

  const createOpportunityFromQuote = () => {
    if (!pendingAssignmentQuote || !newOpportunityName.trim()) {
      return;
    }

    const contact = contacts.find((item) => item.id === pendingAssignmentQuote.clientId);
    const createdOpportunity = addOpportunity({
      opportunityName: newOpportunityName.trim(),
      contactId: contact?.id ?? '',
      company: pendingAssignmentQuote.clientName,
      contactPerson: pendingAssignmentQuote.contactPerson,
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      source: contact?.source ?? 'Manual',
      stage: 'Won',
      temperature: 'Hot',
      ownerUserCompanyId: pendingAssignmentQuote.assignedSellerUserCompanyId ?? null,
      owner: pendingAssignmentQuote.assignedSeller,
      estimatedValue: formatCurrency(pendingAssignmentQuote.total),
      probability: '100%',
      expectedCloseDate: pendingAssignmentQuote.expirationDate,
      nextAction: 'Close deal',
      nextActionDate: pendingAssignmentQuote.expirationDate,
      lastContact: getTodayIsoDate(),
      files: pendingAssignmentQuote.files,
      status: 'Closed',
      notes: pendingAssignmentQuote.notes,
    });

    connectQuoteToOpportunity(pendingAssignmentQuote.id, createdOpportunity.id);
    closeAssignmentModal();
  };

  const keepCommercialQuoteOnly = () => {
    if (!pendingAssignmentQuote) {
      return;
    }

    connectQuoteToOpportunity(pendingAssignmentQuote.id, undefined);
    closeAssignmentModal();
  };

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <span className="text-2xl leading-none" aria-hidden="true">{t.header.emoji}</span>
              {t.header.title}
            </h2>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">{t.header.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button className="h-10 gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]" onClick={openCreateQuoteBuilder}>
              <Plus className="h-4 w-4" />
              {t.header.primaryAction}
            </Button>
            <Button variant="outline" className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10">
              <Clock3 className="h-4 w-4" />
              {t.header.secondaryAction}
            </Button>
          </div>
        </div>
      </div>

      {learningModeActive ? <QuoteLearningGuide copy={t.learningMode} /> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-950">{t.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.filters.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.filters.searchPlaceholder}
                className={cn('h-11 rounded-lg pl-11 text-base font-semibold text-slate-950 placeholder:text-slate-400', coralFieldClassName)}
              />
            </div>
          </div>
          <FilterSelect label={t.filters.status} value={statusFilter} onValueChange={setStatusFilter} options={statusOptions} />
          <FilterSelect label={t.filters.seller} value={sellerFilter} onValueChange={setSellerFilter} options={sellerOptions} />
          <FilterSelect label={t.filters.opportunity} value={opportunityFilter} onValueChange={setOpportunityFilter} options={opportunityOptions} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-slate-600">
          <QuotePipelineMetric icon={<FileText className="h-4 w-4" />} value={visibleLiveQuotesCount} label={t.metrics.liveQuotes} valueClassName="text-[#FF6B5E]" />
          <QuotePipelineMetric icon={<CircleDollarSign className="h-4 w-4" />} value={formatCurrency(visibleQuotedValue)} label={t.metrics.quotedValue} valueClassName="text-[#177d66]" />
          <QuotePipelineMetric icon={<CheckCircle2 className="h-4 w-4" />} value={`${averageMargin}%`} label={t.metrics.averageMargin} valueClassName="text-[#9a6b05]" />
          <QuotePipelineMetric icon={<Clock3 className="h-4 w-4" />} value={visibleExpiringSoonCount} label={t.metrics.expiringSoon} valueClassName="text-[#b63b32]" />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
            {statusCounts.map(({ status, count }) => {
              const width = filteredQuotes.length > 0 ? (count / filteredQuotes.length) * 100 : 0;
              return <div key={status} className={cn('h-full', quoteStatusProgressStyles[status])} style={{ width: `${width}%` }} aria-hidden="true" />;
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
            {quoteStatuses.map((status) => (
              <span key={status} className="inline-flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', quoteStatusProgressStyles[status])} />
                {t.statusLabels[status]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-5 py-4 text-sm font-medium text-slate-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#B63B32]" />
          <span>{kpiSummary}</span>
        </div>
      </section>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#FF6B5E]" />
            <h3 className="text-xl font-black text-slate-950">{t.sections.tableTitle}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t.sections.tableDescription}</p>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1780px]">
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="min-w-[140px] px-5 py-5"><QuoteSortableHeader columnId="number" label={t.table.columns.number} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[220px] px-5 py-5"><QuoteSortableHeader columnId="client" label={t.table.columns.client} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[240px] px-5 py-5"><QuoteSortableHeader columnId="opportunity" label={t.table.columns.opportunity} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[180px] px-5 py-5"><QuoteSortableHeader columnId="status" label={t.table.columns.status} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[170px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.readiness}</TableHead>
                <TableHead className="min-w-[140px] px-5 py-5"><QuoteSortableHeader columnId="amount" label={t.table.columns.amount} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[130px] px-5 py-5"><QuoteSortableHeader columnId="margin" label={t.table.columns.margin} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[130px] px-5 py-5"><QuoteSortableHeader columnId="created" label={t.table.columns.created} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[150px] px-5 py-5"><QuoteSortableHeader columnId="expiration" label={t.table.columns.expiration} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[220px] px-5 py-5"><QuoteSortableHeader columnId="seller" label={t.table.columns.seller} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[130px] px-5 py-5"><QuoteSortableHeader columnId="updated" label={t.table.columns.updated} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[110px] px-5 py-5"><QuoteSortableHeader columnId="files" label={t.table.columns.files} sortState={sortState} onSort={handleSort} /></TableHead>
                <TableHead className="min-w-[130px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    {t.table.empty}
                  </TableCell>
                </TableRow>
              ) : sortedQuotes.map((quote) => {
                const opportunity = opportunities.find((item) => item.id === quote.opportunityId);
                const sellerValue = resolveQuoteSellerValue(quote);
                const quoteContact = getQuoteContact(quote);
                const tableSignals = getQuoteTableSignals({
                  quote,
                  products,
                  contact: quoteContact,
                });

                return (
                  <TableRow key={quote.id} className="border-slate-200 align-top hover:bg-slate-50/80">
                    <TableCell className="px-5 py-5 font-black text-slate-950">{quote.quoteNumber}</TableCell>
                    <TableCell className="px-5 py-5">
                      <p className="font-black text-slate-950">{quote.clientName}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{quote.contactPerson}</p>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      {opportunity ? (
                        <Badge className="rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-2 py-1 text-xs font-bold text-[#B63B32]">
                          {opportunity.opportunityName}
                        </Badge>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">{t.common.unassigned}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <Select value={quote.status} onValueChange={(value) => handleStatusChange(quote, value as QuoteStatus)}>
                          <SelectTrigger className={cn('h-9 rounded-lg border px-3 text-sm font-black shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20', statusClasses[quote.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {quoteStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {t.statusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <QuoteReadinessBadge signal={tableSignals.readiness} t={t} />
                    </TableCell>
                    <TableCell className="px-5 py-5 font-black text-slate-950">{formatCurrency(quote.total)}</TableCell>
                    <TableCell className="px-5 py-5">
                      <QuoteMarginBadge signal={tableSignals.margin} t={t} />
                    </TableCell>
                    <TableCell className="px-5 py-5 font-semibold text-slate-600">{quote.createdDate}</TableCell>
                    <TableCell className="px-5 py-5">
                      <QuoteExpirationBadge expirationDate={quote.expirationDate} signal={tableSignals.expiration} t={t} />
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <QuoteSellerSelect
                        value={sellerValue}
                        options={sellerSelectOptions}
                        selectedLabel={quote.assignedSeller}
                        fallbackLabel={t.common.unassigned}
                        onValueChange={(value) => updateQuote(quote.id, getSellerPayloadFromValue(value))}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-5 font-semibold text-slate-600">{quote.lastUpdated}</TableCell>
                    <TableCell className="px-5 py-5">
                      <button
                        type="button"
                        className={cn(
                          'inline-flex min-w-[118px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors',
                          quote.files.length > 0
                            ? 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100',
                        )}
                        onClick={() => setSelectedFilesQuote(quote)}
                      >
                        <Paperclip className="h-4 w-4" />
                        {quote.files.length > 0 ? `${quote.files.length} docs` : t.labels.noFiles}
                      </button>
                    </TableCell>
                    <TableCell className="px-5 py-5">
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                        <QuoteAction label={t.actions.view} icon={<Eye className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15" onClick={() => setPreviewQuote(quote)} />
                        <QuoteAction label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => openEditQuoteBuilder(quote)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <QuoteBuilderModal
        open={isBuilderOpen}
        isEditMode={Boolean(editingQuote)}
        form={form}
        items={items}
        contacts={contacts}
        products={products}
        selectedContact={selectedContact}
        selectedOpportunity={selectedBuilderOpportunity}
        totals={quoteTotals}
        t={t}
        opportunityOptions={opportunityOptions}
        quoteStatusOptions={quoteStatuses.map((status) => ({ value: status, label: t.statusLabels[status] }))}
        sellerOptions={formSellerOptions}
        formatCurrency={formatCurrency}
        onOpenChange={setIsBuilderOpen}
        onClose={closeQuoteBuilder}
        onFormChange={setForm}
        onSellerChange={(value) => {
          const sellerPayload = getSellerPayloadFromValue(value);
          setForm((current) => ({
            ...current,
            assignedSellerValue: value,
            assignedSeller: sellerPayload.assignedSeller,
          }));
        }}
        onAddProduct={addProductToQuote}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onSubmit={handleSaveQuote}
      />

      <QuotePreviewModal
        quote={previewQuote}
        contact={previewContact}
        opportunity={previewOpportunity}
        copy={t}
        onClose={() => setPreviewQuote(null)}
      />

      <Dialog open={Boolean(selectedFilesQuote)} onOpenChange={(open) => !open && setSelectedFilesQuote(null)}>
        <DialogContent className={cn(quoteModalStyles.content, 'max-w-xl')} closeButtonClassName={quoteModalStyles.close}>
          <DialogHeader className={quoteModalStyles.header}>
            <DialogTitle className={quoteModalStyles.smallTitle}>
              <Paperclip className={cn('h-5 w-5', quoteModalStyles.icon)} />
              {t.filesModal.title}
            </DialogTitle>
            <DialogDescription className={quoteModalStyles.description}>{t.filesModal.description}</DialogDescription>
          </DialogHeader>
          <div className={cn(quoteModalStyles.body, 'space-y-3')}>
            <p className="text-sm font-bold text-slate-500">{selectedFilesQuote?.quoteNumber}</p>
            {selectedFilesQuote?.files.length ? selectedFilesQuote.files.map((file) => (
              <div key={file} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <FileText className="h-4 w-4 text-[#FF6B5E]" />
                <span className="text-sm font-semibold text-slate-700">{file}</span>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                {t.labels.noFiles}
              </div>
            )}
          </div>
          <DialogFooter className={quoteModalStyles.footer}>
            <Button className={quoteModalStyles.primaryButton} onClick={() => setSelectedFilesQuote(null)}>{t.common.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAssignmentQuote)} onOpenChange={(open) => !open && closeAssignmentModal()}>
        <DialogContent className={cn(quoteModalStyles.content, 'max-w-4xl')} closeButtonClassName={quoteModalStyles.close}>
          <DialogHeader className={quoteModalStyles.header}>
            <DialogTitle className={quoteModalStyles.title}>
              <Link2 className={cn('h-5 w-5', quoteModalStyles.icon)} />
              {t.assignmentModal.title}
            </DialogTitle>
            <DialogDescription className={quoteModalStyles.description}>{t.assignmentModal.description}</DialogDescription>
          </DialogHeader>

          <div className={cn(quoteModalStyles.body, 'grid gap-4 lg:grid-cols-3')}>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-slate-950">{t.assignmentModal.existingTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm leading-6 text-slate-500">{t.assignmentModal.existingDescription}</p>
              <div className="mt-4">
                <FilterSelect
                  label={t.labels.opportunity}
                  value={selectedOpportunityId}
                  onValueChange={setSelectedOpportunityId}
                  options={[
                    { value: 'none', label: t.common.none },
                    ...assignmentOpportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName })),
                  ]}
                />
              </div>
              <Button className="mt-4 w-full rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E85C50]" onClick={assignExistingOpportunity}>
                <Link2 className="h-4 w-4" />
                {t.assignmentModal.assign}
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-slate-950">{t.assignmentModal.newTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm leading-6 text-slate-500">{t.assignmentModal.newDescription}</p>
              <div className="mt-4 space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.assignmentModal.opportunityName}</label>
                <Input className={coralFieldClassName} value={newOpportunityName} onChange={(event) => setNewOpportunityName(event.target.value)} placeholder={t.assignmentModal.opportunityNamePlaceholder} />
              </div>
              <Button className="mt-4 w-full rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E8564B]" onClick={createOpportunityFromQuote}>
                <Plus className="h-4 w-4" />
                {t.assignmentModal.createOpportunity}
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-slate-950">{t.assignmentModal.keepTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm leading-6 text-slate-500">{t.assignmentModal.keepDescription}</p>
              <Button variant="outline" className="mt-4 w-full border-slate-200 bg-white text-slate-800 hover:bg-slate-50" onClick={keepCommercialQuoteOnly}>
                <FileText className="h-4 w-4" />
                {t.assignmentModal.keepQuote}
              </Button>
            </div>
          </div>
          <DialogFooter className={quoteModalStyles.footer}>
            <Button variant="outline" className={quoteModalStyles.secondaryButton} onClick={closeAssignmentModal}>{t.common.cancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
