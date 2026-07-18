import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
  Printer,
  Search,
} from 'lucide-react';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
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
import { useTablePagination } from '../../../hooks/useTablePagination';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../components/SalesTitleBar';
import { SalesModalFrame } from '../components/SalesModalFrame';
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
import {
  defaultSalesCurrency,
  formatSalesCurrencyBreakdown,
  normalizeSalesCurrencyCode,
} from '../utils/salesCurrency';
import {
  normalizeSalesOwnerOption,
  type SalesOwnerOption,
} from '../utils/salesOwnerOptions';
import { compactText, normalizeTextKey } from '../utils/salesTextUtils';
import {
  FilterSelect,
  QuoteAction,
  QuoteSellerSelect,
  QuoteSortableHeader,
  type QuoteSortColumn,
  type QuoteSortState,
} from './components/QuoteUi';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../shared/operational';
import { OperationalKpiArea } from '../../shared/operational';
import { QuoteExpirationBadge } from './components/QuoteExpirationBadge';
import { QuoteMarginBadge } from './components/QuoteMarginBadge';
import { QuotePreviewModal } from './components/QuotePreviewModal';
import { QuoteReadinessBadge } from './components/QuoteReadinessBadge';
import { QuoteBuilderModal } from './modals/QuoteBuilderModal';
import { printQuotePdf } from './quotePdf';
import { useQuotesTranslations } from './translations';
import type { QuoteFormState } from './types/quoteBuilderTypes';
import type { CotizacionProps, FilterValue } from './types/quotePageTypes';
import { ensureQuoteItemCurrencySnapshot, repriceQuoteItemForCurrency } from './utils/quoteCurrencyConversion';
import { calculateQuoteBuilderTotals } from './utils/quotePricing';
import {
  buildQuoteSellerNameByValue,
  buildQuoteSellerSelectOptions,
  filterQuotes,
  coralFieldClassName,
  defaultQuoteTaxJurisdiction,
  formatCurrency,
  getDaysUntil,
  getDefaultQuoteSellerValue,
  getFutureIsoDate,
  getQuoteSellerPayloadFromValue,
  getQuoteSellerSelectValue,
  getTodayIsoDate,
  quoteModalActionClassNames,
  quoteSortCollator,
  quoteStatusProgressStyles,
  statusClasses,
  stripQuoteBuilderOnlyItemFields,
} from './utils/quotePageUtils';
import { getQuoteTableSignals } from './utils/quoteTableSignals';
import { getDefaultTaxPresetForJurisdiction } from './utils/quoteTaxCatalog';

export default function Cotizacion({ learningModeActive = false }: CotizacionProps) {
  const navigate = useNavigate();
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
    updateOpportunity,
    updateQuoteStatus,
    connectQuoteToOpportunity,
  } = useSalesCrm();

  const defaultFallbackSellerValue = getDefaultQuoteSellerValue(salesOwners[0]);
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
    currency: defaultSalesCurrency,
    taxJurisdiction: defaultQuoteTaxJurisdiction,
    customJurisdictionName: '',
    customTaxLabel: '',
    customTaxRate: '0',
    notes: '',
    terms: '',
  }));
  const shouldReturnToOpportunities = searchParams.get('returnTo') === 'opportunities';
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

  const sellerSelectOptions = useMemo(() => buildQuoteSellerSelectOptions({
    ownerOptions,
    fallbackOwnerNames: [
      ...salesOwners,
      ...contacts.map((contact) => contact.owner),
      ...opportunities.map((opportunity) => opportunity.owner),
      ...quotes.map((quote) => quote.assignedSeller),
    ],
  }), [contacts, opportunities, ownerOptions, quotes]);

  const sellerNameByValue = useMemo(
    () => buildQuoteSellerNameByValue(sellerSelectOptions),
    [sellerSelectOptions],
  );
  const currentUserCompanyId = useMemo(
    () => contextCurrentUserCompanyId ?? ownerOptions.find((owner) => owner.userId === currentUserId)?.userCompanyId ?? null,
    [contextCurrentUserCompanyId, currentUserId, ownerOptions],
  );
  const defaultSellerValue = currentUserCompanyId
    ? `user-company:${currentUserCompanyId}`
    : sellerSelectOptions[0]?.value ?? defaultFallbackSellerValue;
  const getSellerPayloadFromValue = (value: string) => getQuoteSellerPayloadFromValue(
    value,
    sellerNameByValue,
    salesOwners[0],
  );
  const opportunityNameById = useMemo(
    () => new Map(opportunities.map((opportunity) => [opportunity.id, opportunity.opportunityName])),
    [opportunities],
  );

  const filteredQuotes = useMemo(() => filterQuotes({
    quotes,
    opportunities,
    ownerOptions,
    search,
    statusFilter,
    sellerFilter,
    opportunityFilter,
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
        return quote.files.length + 1;
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
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedQuotes,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${search}:${statusFilter}:${sellerFilter}:${opportunityFilter}:${sortState.columnId}:${sortState.direction}:${quotes.map((quote) => quote.id).join('|')}`,
    rows: sortedQuotes,
  });
  const handleSort = (columnId: QuoteSortColumn) => {
    setSortState((current) => (
      current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' }
    ));
  };
  const handleReviewExpirations = () => {
    setSearch('');
    setStatusFilter('all');
    setSellerFilter('all');
    setOpportunityFilter('all');
    setSortState({ columnId: 'expiration', direction: 'asc' });
  };
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
  const quoteTableSignalsById = useMemo(() => new Map(filteredQuotes.map((quote) => [
    quote.id,
    getQuoteTableSignals({
      quote,
      products,
      contact: getQuoteContact(quote),
    }),
  ])), [contacts, filteredQuotes, products]);
  const quoteTableSignals = Array.from(quoteTableSignalsById.values());
  const visibleLiveQuotesCount = filteredQuotes.filter((quote) => !['Rejected', 'Expired', 'Closed Won'].includes(quote.status)).length;
  const visibleQuotedValue = formatSalesCurrencyBreakdown(
    filteredQuotes,
    (quote) => quote.total,
    (quote) => quote.currency,
  );
  const visibleExpiringSoonCount = quoteTableSignals.filter((signal) => signal.expiration.key === 'expiringSoon').length;
  const visibleExpiredCount = quoteTableSignals.filter((signal) => signal.expiration.key === 'expired').length;
  const visibleReadyToSendCount = quoteTableSignals.filter((signal) => signal.readiness.key === 'readyToSend').length;
  const visibleReadinessIssueCount = quoteTableSignals.filter((signal) => signal.readiness.key !== 'readyToSend').length;
  const visibleLowMarginCount = quoteTableSignals.filter((signal) => signal.margin.key === 'lowMargin').length;
  const averageMargin = quoteTableSignals.length > 0
    ? Math.round(quoteTableSignals.reduce((total, signal) => total + signal.totals.estimatedMargin, 0) / quoteTableSignals.length)
    : 0;
  const statusCounts = quoteStatuses.map((status) => ({
    status,
    count: filteredQuotes.filter((quote) => quote.status === status).length,
  }));
  const quoteMetrics: OperationalKpiMetric[] = [
    {
      id: 'visible',
      icon: <FileText className="h-4 w-4" />,
      label: t.kpiEngine.labels.visible,
      value: filteredQuotes.length,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#FF6B5E]',
    },
    {
      id: 'live',
      icon: <Eye className="h-4 w-4" />,
      label: t.kpiEngine.labels.live,
      value: visibleLiveQuotesCount,
      iconClassName: 'text-[#2563EB]',
      valueClassName: 'text-[#2563EB]',
    },
    {
      id: 'quotedValue',
      icon: <CircleDollarSign className="h-4 w-4" />,
      label: t.kpiEngine.labels.quotedValue,
      value: visibleQuotedValue,
      iconClassName: 'text-[#177D66]',
      valueClassName: 'text-[#177D66]',
    },
    {
      id: 'readyToSend',
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: t.kpiEngine.labels.readyToSend,
      value: visibleReadyToSendCount,
      iconClassName: 'text-emerald-600',
      valueClassName: 'text-emerald-600',
    },
    {
      id: 'averageMargin',
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: t.kpiEngine.labels.averageMargin,
      value: `${averageMargin}%`,
      iconClassName: 'text-[#9A6B05]',
      valueClassName: 'text-[#9A6B05]',
    },
    {
      id: 'expiringSoon',
      icon: <Clock3 className="h-4 w-4" />,
      label: t.kpiEngine.labels.expiringSoon,
      value: visibleExpiringSoonCount,
      iconClassName: 'text-[#B63B32]',
      valueClassName: 'text-[#B63B32]',
    },
  ];
  const quoteAlertChips: OperationalAlertChip[] = [];

  if (visibleExpiredCount > 0) {
    quoteAlertChips.push({
      id: 'expired',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.expired(visibleExpiredCount),
      tone: 'danger',
    });
  }

  if (visibleExpiringSoonCount > 0) {
    quoteAlertChips.push({
      id: 'expiringSoon',
      icon: <Clock3 className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.expiringSoon(visibleExpiringSoonCount),
      tone: 'warning',
    });
  }

  if (visibleReadinessIssueCount > 0) {
    quoteAlertChips.push({
      id: 'readinessIssues',
      icon: <FileText className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.readinessIssues(visibleReadinessIssueCount),
      tone: 'info',
    });
  }

  if (visibleLowMarginCount > 0) {
    quoteAlertChips.push({
      id: 'lowMargin',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: t.kpiEngine.alerts.lowMargin(visibleLowMarginCount),
      tone: 'brand',
    });
  }

  const quoteDistributionSegments: OperationalDistributionSegment[] = statusCounts.map(({ status, count }) => ({
    id: status,
    label: t.kpiEngine.segments[status],
    count,
    className: quoteStatusProgressStyles[status],
  }));
  const quoteInsight = t.kpiEngine.insight({
    averageMargin,
    expiringSoon: visibleExpiringSoonCount,
    expired: visibleExpiredCount,
    lowMargin: visibleLowMarginCount,
    quotedValue: visibleQuotedValue,
    readinessIssues: visibleReadinessIssueCount,
    visible: filteredQuotes.length,
  });
  const previewContact = getQuoteContact(previewQuote);
  const previewOpportunity = previewQuote?.opportunityId
    ? opportunities.find((opportunity) => opportunity.id === previewQuote.opportunityId) ?? null
    : null;
  const getQuoteOpportunity = (quote?: SalesQuote | null) => (
    quote?.opportunityId ? opportunities.find((opportunity) => opportunity.id === quote.opportunityId) ?? null : null
  );
  const printSavedQuote = (quote: SalesQuote) => {
    printQuotePdf({
      quote,
      contact: getQuoteContact(quote),
      opportunity: getQuoteOpportunity(quote),
      copy: t,
    });
  };
  const getAssignmentOpportunities = (quote?: SalesQuote | null) => (
    quote?.clientId
      ? opportunities.filter((opportunity) => opportunity.contactId === quote.clientId)
      : opportunities
  );
  const assignmentOpportunities = getAssignmentOpportunities(pendingAssignmentQuote);

  const addProductToQuote = (product: SalesCatalogItem) => {
    const defaultTaxPreset = getDefaultTaxPresetForJurisdiction(form.taxJurisdiction);
    const quoteCurrency = normalizeSalesCurrencyCode(form.currency, defaultSalesCurrency);
    const exchangeRateDate = form.createdDate || getTodayIsoDate();
    const nextItem = repriceQuoteItemForCurrency({
      id: `TMP-${Date.now()}-${items.length + 1}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      section: t.sections.catalogTitle,
      quantity: 1,
      unitPrice: product.price,
      unitCost: product.cost,
      discountPercent: 0,
      taxPercent: defaultTaxPreset.defaultRate,
      taxCode: defaultTaxPreset.id,
      taxLabel: defaultTaxPreset.label,
      taxJurisdiction: form.taxJurisdiction,
      taxIsCustom: defaultTaxPreset.rateEditable,
      notes: '',
    }, products, quoteCurrency, exchangeRateDate);

    setItems((current) => [
      ...current,
      { ...nextItem, id: `TMP-${Date.now()}-${current.length + 1}` },
    ]);
  };

  const handleQuoteCurrencyChange = (currency: string) => {
    const quoteCurrency = normalizeSalesCurrencyCode(currency, defaultSalesCurrency);
    const exchangeRateDate = form.createdDate || getTodayIsoDate();

    setForm((current) => ({ ...current, currency: quoteCurrency }));
    setItems((current) => current.map((item) => (
      repriceQuoteItemForCurrency(item, products, quoteCurrency, exchangeRateDate)
    )));
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
      currency: defaultSalesCurrency,
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
      currency: quote.currency ?? defaultSalesCurrency,
      taxJurisdiction: defaultQuoteTaxJurisdiction,
      customJurisdictionName: '',
      customTaxLabel: '',
      customTaxRate: '0',
      notes: quote.notes,
      terms: quote.terms,
    });
    setItems(quote.items.map((item) => (
      ensureQuoteItemCurrencySnapshot({ ...item }, products, quote.currency ?? defaultSalesCurrency, quote.createdDate || getTodayIsoDate())
    )));
    setIsBuilderOpen(true);
  };

  const returnToOriginIfNeeded = () => {
    if (shouldReturnToOpportunities) {
      navigate('/sales/leads', { replace: true });
    }
  };

  const closeQuoteBuilder = ({ returnToOrigin = true }: { returnToOrigin?: boolean } = {}) => {
    setIsBuilderOpen(false);
    setEditingQuote(null);
    resetBuilder();
    if (returnToOrigin) {
      returnToOriginIfNeeded();
    }
  };

  const handleSaveQuote = ({ printAfterSave = false }: { printAfterSave?: boolean } = {}) => {
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
      currency: form.currency,
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

      const requiresAssignment = opportunityLinkedQuoteStatuses.includes(updatedQuote.status);
      if (requiresAssignment) {
        const matchingOpportunities = getAssignmentOpportunities(updatedQuote);
        setPendingAssignmentQuote(updatedQuote);
        setSelectedOpportunityId(updatedQuote.opportunityId ?? matchingOpportunities[0]?.id ?? 'none');
        setNewOpportunityName(`${updatedQuote.clientName} - ${updatedQuote.quoteNumber}`);
      }

      if (printAfterSave) {
        printSavedQuote(updatedQuote);
      }

      closeQuoteBuilder({ returnToOrigin: !requiresAssignment });
      return;
    }

    const createdQuote = addQuote({
      ...quotePayload,
      files: [],
    });

    const requiresAssignment = opportunityLinkedQuoteStatuses.includes(createdQuote.status);
    if (requiresAssignment) {
      const matchingOpportunities = getAssignmentOpportunities(createdQuote);
      setPendingAssignmentQuote(createdQuote);
      setSelectedOpportunityId(createdQuote.opportunityId ?? matchingOpportunities[0]?.id ?? 'none');
      setNewOpportunityName(`${createdQuote.clientName} - ${createdQuote.quoteNumber}`);
    }

    if (printAfterSave) {
      printSavedQuote(createdQuote);
    }

    closeQuoteBuilder({ returnToOrigin: !requiresAssignment });
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
    returnToOriginIfNeeded();
  };

  const assignExistingOpportunity = () => {
    if (!pendingAssignmentQuote || selectedOpportunityId === 'none') {
      return;
    }

    connectQuoteToOpportunity(pendingAssignmentQuote.id, selectedOpportunityId);
    if (pendingAssignmentQuote.status === 'Closed Won') {
      updateOpportunity(selectedOpportunityId, {
        stage: 'Won',
        status: 'Closed',
        probability: '100%',
        estimatedValue: String(pendingAssignmentQuote.total),
        currency: pendingAssignmentQuote.currency,
        lastContact: getTodayIsoDate(),
      });
    }
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
      estimatedValue: String(pendingAssignmentQuote.total),
      currency: pendingAssignmentQuote.currency,
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

  const renderSortableHead = (columnId: QuoteSortColumn, label: string, className?: string) => (
    <TableHead className={cn('whitespace-normal px-5 py-5', className)}>
      <QuoteSortableHeader columnId={columnId} label={label} sortState={sortState} onSort={handleSort} />
    </TableHead>
  );

  return (
    <section className="space-y-5">
      <SalesTitleBar
        icon="💬"
        rhIndent
        title={t.header.title}
        subtitle={t.header.subtitle}
        actions={(
          <>
            <Button type="button" variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={handleReviewExpirations}>
              <Clock3 className="h-4 w-4" />
              {t.header.secondaryAction}
            </Button>
            <Button type="button" className={salesTitleBarPrimaryActionClassName} onClick={openCreateQuoteBuilder}>
              <Plus className="h-4 w-4" />
              {t.header.primaryAction}
            </Button>
          </>
        )}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-white">{t.filters.title}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.filters.search}</label>
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

      {!learningModeActive ? <OperationalKpiArea
        alertChips={quoteAlertChips}
        distributionSegments={quoteDistributionSegments}
        insight={quoteInsight}
        insightIcon={<AlertTriangle className="h-4 w-4" />}
        metrics={quoteMetrics}
      /> : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <Table className="min-w-[2040px] table-fixed">
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
                {renderSortableHead('number', t.table.columns.number, 'w-[160px]')}
                {renderSortableHead('client', t.table.columns.client, 'w-[240px]')}
                {renderSortableHead('opportunity', t.table.columns.opportunity, 'w-[260px]')}
                {renderSortableHead('status', t.table.columns.status, 'w-[185px]')}
                <TableHead className="w-[190px] whitespace-normal px-5 py-5 text-xs font-black uppercase tracking-normal text-slate-500 dark:text-slate-300">{t.table.columns.readiness}</TableHead>
                {renderSortableHead('amount', t.table.columns.amount, 'w-[165px]')}
                {renderSortableHead('margin', t.table.columns.margin, 'w-[150px]')}
                {renderSortableHead('created', t.table.columns.created, 'w-[140px]')}
                {renderSortableHead('expiration', t.table.columns.expiration, 'w-[165px]')}
                {renderSortableHead('seller', t.table.columns.seller, 'w-[220px]')}
                {renderSortableHead('updated', t.table.columns.updated, 'w-[140px]')}
                {renderSortableHead('files', t.table.columns.files, 'w-[145px]')}
                <TableHead className="w-[120px] whitespace-normal px-4 py-5 text-center text-xs font-black uppercase tracking-normal text-slate-500 dark:text-slate-300">{t.table.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">
                    {t.table.empty}
                  </TableCell>
                </TableRow>
              ) : paginatedQuotes.map((quote) => {
                const opportunity = opportunities.find((item) => item.id === quote.opportunityId);
                const sellerValue = getQuoteSellerSelectValue(quote, ownerOptions);
                const quoteContact = getQuoteContact(quote);
                const tableSignals = quoteTableSignalsById.get(quote.id) ?? getQuoteTableSignals({
                  quote,
                  products,
                  contact: quoteContact,
                });

                return (
                  <TableRow key={quote.id} className="border-slate-200 align-top hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-700/40">
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-black text-slate-950 dark:text-white">
                      <span className="block min-w-0 break-all leading-6">{quote.quoteNumber}</span>
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <p className="break-words font-black text-slate-950 dark:text-white">{quote.clientName}</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-500 dark:text-slate-300">{quote.contactPerson}</p>
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      {opportunity ? (
                        <Badge className="h-auto max-w-full whitespace-normal break-words rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-xs font-bold leading-5 text-[#B63B32]">
                          {opportunity.opportunityName}
                        </Badge>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">{t.common.unassigned}</span>
                      )}
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <Select value={quote.status} onValueChange={(value) => handleStatusChange(quote, value as QuoteStatus)}>
                          <SelectTrigger className={cn('h-10 w-full min-w-0 max-w-full rounded-full border px-3 text-sm font-black shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20 [&>span]:truncate', statusClasses[quote.status])}>
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
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <QuoteReadinessBadge signal={tableSignals.readiness} t={t} />
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <p className="break-words font-black text-slate-950 dark:text-white">{formatCurrency(quote.total, quote.currency)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">{quote.currency ?? defaultSalesCurrency}</p>
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <QuoteMarginBadge signal={tableSignals.margin} t={t} />
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-semibold text-slate-600 dark:text-slate-300">{quote.createdDate}</TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <QuoteExpirationBadge expirationDate={quote.expirationDate} signal={tableSignals.expiration} t={t} />
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <QuoteSellerSelect
                        value={sellerValue}
                        options={sellerSelectOptions}
                        selectedLabel={quote.assignedSeller}
                        fallbackLabel={t.common.unassigned}
                        onValueChange={(value) => updateQuote(quote.id, getSellerPayloadFromValue(value))}
                      />
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-semibold text-slate-600 dark:text-slate-300">{quote.lastUpdated}</TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <button
                        type="button"
                        className="inline-flex w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-2 text-sm font-bold text-[#B63B32] shadow-sm transition-colors hover:bg-[#FF6B5E]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/25 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
                        onClick={() => setSelectedFilesQuote(quote)}
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="min-w-0 truncate">
                          {quote.files.length > 0 ? `${quote.files.length + 1} docs` : t.previewModal.documentTitle}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-4 py-5 align-top">
                      <div className="mx-auto grid w-fit grid-cols-[repeat(2,2.25rem)] gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <QuoteAction label={t.actions.view} icon={<Eye className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20" onClick={() => setPreviewQuote(quote)} />
                        <QuoteAction label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => openEditQuoteBuilder(quote)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          currentPage={currentPage}
          itemLabel="cotizaciones"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageEnd={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          pageStart={pageStart}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </section>

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
        sellerOptions={formSellerOptions}
        formatCurrency={(value, currency) => formatCurrency(value, currency ?? form.currency)}
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
        onCurrencyChange={handleQuoteCurrencyChange}
        onAddProduct={addProductToQuote}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onSubmit={handleSaveQuote}
        onSubmitAndPrint={() => handleSaveQuote({ printAfterSave: true })}
      />

      <QuotePreviewModal
        quote={previewQuote}
        contact={previewContact}
        opportunity={previewOpportunity}
        copy={t}
        onClose={() => setPreviewQuote(null)}
      />

      <SalesModalFrame
        open={Boolean(selectedFilesQuote)}
        onOpenChange={(open) => !open && setSelectedFilesQuote(null)}
        title={t.filesModal.title}
        description={t.filesModal.description}
        icon={<Paperclip className="h-5 w-5" />}
        contentClassName="w-[min(92vw,560px)]"
        bodyClassName="space-y-4 px-7 py-6"
        footerClassName="sm:justify-end"
        footer={(
          <Button className={quoteModalActionClassNames.primary} onClick={() => setSelectedFilesQuote(null)}>{t.common.close}</Button>
        )}
      >
            <div className="rounded-lg border border-[#FF6B5E]/20 bg-white p-4 shadow-sm dark:border-[#FF6B5E]/30 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-normal text-slate-500 dark:text-slate-400">{t.table.columns.number}</p>
              <p className="mt-2 break-all text-lg font-black text-slate-950 dark:text-white">{selectedFilesQuote?.quoteNumber}</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-500 dark:text-slate-400">{selectedFilesQuote?.clientName}</p>
            </div>

            {selectedFilesQuote ? (
              <div className="rounded-lg border border-[#FF6B5E]/25 bg-white p-4 shadow-sm dark:border-[#FF6B5E]/30 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950 dark:text-white">{t.previewModal.documentTitle}</p>
                      <p className="mt-1 break-all text-xs font-semibold text-slate-500 dark:text-slate-400">{selectedFilesQuote.quoteNumber}</p>
                      <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {formatCurrency(selectedFilesQuote.total, selectedFilesQuote.currency)} · {selectedFilesQuote.currency ?? defaultSalesCurrency} · {t.statusLabels[selectedFilesQuote.status]}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white text-xs font-bold text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
                      onClick={() => {
                        setPreviewQuote(selectedFilesQuote);
                        setSelectedFilesQuote(null);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t.actions.view}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-2 rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() => printSavedQuote(selectedFilesQuote)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {t.previewModal.print}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedFilesQuote?.files.length ? (
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-normal text-slate-500 dark:text-slate-400">{t.labels.files}</h3>
                {selectedFilesQuote.files.map((file) => (
                  <div key={file} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 break-all text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">{file}</span>
                  </div>
                ))}
              </section>
            ) : null}
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(pendingAssignmentQuote)}
        onOpenChange={(open) => !open && closeAssignmentModal()}
        title={t.assignmentModal.title}
        description={t.assignmentModal.description}
        icon={<Link2 className="h-5 w-5" />}
        contentClassName="w-[min(94vw,1040px)]"
        bodyClassName="grid gap-4 px-7 py-6 lg:grid-cols-3"
        footerClassName="sm:justify-end"
        footer={(
          <Button variant="outline" className={quoteModalActionClassNames.secondary} onClick={closeAssignmentModal}>{t.common.cancel}</Button>
        )}
      >
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black text-slate-950">{t.assignmentModal.existingTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm font-medium leading-6 text-slate-500">{t.assignmentModal.existingDescription}</p>
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
              <Button className="mt-4 h-11 w-full rounded-lg bg-[#FF6B5E] font-bold text-white hover:bg-[#E85C50]" onClick={assignExistingOpportunity}>
                <Link2 className="h-4 w-4" />
                {t.assignmentModal.assign}
              </Button>
            </div>

            <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/[0.04] p-5 shadow-sm">
              <h3 className="font-black text-slate-950">{t.assignmentModal.newTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm font-medium leading-6 text-slate-500">{t.assignmentModal.newDescription}</p>
              <div className="mt-4 space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.assignmentModal.opportunityName}</label>
                <Input className={cn('h-11 rounded-lg px-4 font-semibold', coralFieldClassName)} value={newOpportunityName} onChange={(event) => setNewOpportunityName(event.target.value)} placeholder={t.assignmentModal.opportunityNamePlaceholder} />
              </div>
              <Button className="mt-4 h-11 w-full rounded-lg bg-[#FF6B5E] font-bold text-white hover:bg-[#E8564B]" onClick={createOpportunityFromQuote}>
                <Plus className="h-4 w-4" />
                {t.assignmentModal.createOpportunity}
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black text-slate-950">{t.assignmentModal.keepTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm font-medium leading-6 text-slate-500">{t.assignmentModal.keepDescription}</p>
              <Button variant="outline" className="mt-4 h-11 w-full rounded-lg border-slate-200 bg-white font-bold text-slate-800 hover:bg-slate-50" onClick={keepCommercialQuoteOnly}>
                <FileText className="h-4 w-4" />
                {t.assignmentModal.keepQuote}
              </Button>
            </div>
      </SalesModalFrame>
    </section>
  );
}
