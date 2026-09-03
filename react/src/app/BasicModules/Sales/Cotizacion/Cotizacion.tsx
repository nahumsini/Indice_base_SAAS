import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileText,
  Link2,
  Loader2,
  Paperclip,
  PencilLine,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import {
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceOperationalTable,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../../../components/table/IndiceTableEngine';
import { Input } from '../../../components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  TableBody,
  TableCell,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { usePersistentColumnWidths } from '../../../hooks/usePersistentColumnWidths';
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../components/SalesFilterBar';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../components/SalesTitleBar';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { salesApi } from '../salesApi';
import { ApiClientError } from '../../../lib/apiClient';
import {
  opportunityLinkedQuoteStatuses,
  quoteStatuses,
  toVisibleQuoteStatus,
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
  type QuoteSortColumn,
  type QuoteSortState,
} from './components/QuoteUi';
import type {
  OperationalAlertChip,
  OperationalDistributionSegment,
  OperationalKpiMetric,
} from '../../shared/operational';
import { OperationalKpiArea } from '../../shared/operational';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { QuoteExpirationBadge } from './components/QuoteExpirationBadge';
import { QuoteLearningGuide } from './components/QuoteLearningGuide';
import { QuoteMarginBadge } from './components/QuoteMarginBadge';
import { QuotePreviewModal } from './components/QuotePreviewModal';
import { QuoteReadinessBadge } from './components/QuoteReadinessBadge';
import { QuoteBuilderModal } from './modals/QuoteBuilderModal';
import { useSalesTranslations } from '../Sales/hooks/useSalesTranslations';
import { useProspectosTranslations } from '../Prospectos/translations/prospectosTranslations';
import { downloadQuotePdf, printQuotePdf } from './quotePdf';
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
import { inventoryApi } from '../Inventory/services/inventoryApi';
import type { InventoryStockRow, InventoryWarehouse } from '../Inventory/types/inventoryTypes';
import { productUsesInventory } from './utils/quoteCatalogAdapters';

type QuoteOperationalColumnId =
  | 'number'
  | 'opportunity'
  | 'seller'
  | 'status'
  | 'readiness'
  | 'amount'
  | 'updated'
  | 'files';

const quoteColumnWidths: Record<QuoteOperationalColumnId, number> = {
  number: 230,
  opportunity: 190,
  seller: 180,
  status: 165,
  readiness: 160,
  amount: 165,
  updated: 185,
  files: 135,
};

const quoteMinimumColumnWidths: Record<QuoteOperationalColumnId, number> = {
  number: 190,
  opportunity: 170,
  seller: 170,
  status: 150,
  readiness: 150,
  amount: 145,
  updated: 170,
  files: 120,
};

const quoteTableColumnIds = Object.keys(quoteColumnWidths) as QuoteOperationalColumnId[];
const quoteSortableColumnIds: QuoteOperationalColumnId[] = quoteTableColumnIds.filter(
  (columnId) => columnId !== 'readiness',
);
const quoteActionsColumnWidth = 164;

export default function Cotizacion({ learningModeActive = false }: CotizacionProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useQuotesTranslations();
  const { identity: companyPrintIdentity } = useCompanyPrintIdentity();
  const {
    contacts,
    opportunities,
    products,
    quotes,
    salesRecords,
    createQuoteRecord,
    updateQuote,
    updateQuoteRecord,
    deleteQuote,
    connectQuoteRecord,
    createContactRecord,
  } = useSalesCrm();
  const salesT = useSalesTranslations();
  const prospectosT = useProspectosTranslations();

  const defaultFallbackSellerValue = getDefaultQuoteSellerValue(salesOwners[0]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<SalesQuote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<SalesQuote | null>(null);
  const [selectedFilesQuote, setSelectedFilesQuote] = useState<SalesQuote | null>(null);
  const [quotePendingDeletion, setQuotePendingDeletion] = useState<SalesQuote | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);
  const [quoteDeletionError, setQuoteDeletionError] = useState('');
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [quoteSaveError, setQuoteSaveError] = useState('');
  const [pendingAssignmentQuote, setPendingAssignmentQuote] = useState<SalesQuote | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('none');
  const [newOpportunityName, setNewOpportunityName] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentSaveError, setAssignmentSaveError] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<SalesOwnerOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [contextCurrentUserCompanyId, setContextCurrentUserCompanyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<FilterValue>('all');
  const [sellerFilter, setSellerFilter] = useState<FilterValue>('all');
  const [sortState, setSortState] = useState<QuoteSortState>({ columnId: 'created', direction: 'desc' });
  const quoteColumnLabels = useMemo<Record<QuoteOperationalColumnId, string>>(() => ({
    amount: t.table.columns.amount,
    files: t.table.columns.files,
    number: t.table.columns.number,
    opportunity: t.table.columns.opportunity,
    readiness: t.table.columns.readiness,
    seller: t.table.columns.seller,
    status: t.table.columns.status,
    updated: t.table.columns.expiration,
  }), [t]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<QuoteOperationalColumnId>({
    defaults: quoteColumnWidths,
    headerLabels: quoteColumnLabels,
    minWidths: quoteMinimumColumnWidths,
    sortableColumnIds: quoteSortableColumnIds,
    storageKey: 'sales-quotes-column-widths-v2',
  });
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
    warehouseId: '',
    notes: '',
    terms: '',
  }));
  const shouldReturnToOpportunities = searchParams.get('returnTo') === 'opportunities';
  const [items, setItems] = useState<SalesQuoteItem[]>([]);
  const [quoteWarehouses, setQuoteWarehouses] = useState<InventoryWarehouse[]>([]);
  const [quoteStockRows, setQuoteStockRows] = useState<InventoryStockRow[]>([]);

  const quoteTotals = useMemo(() => calculateQuoteBuilderTotals(items, products), [items, products]);

  useEffect(() => {
    if (!isBuilderOpen) return;
    let active = true;
    void inventoryApi.loadWorkspace(products).then((workspace) => {
      if (!active) return;
      const activeWarehouses = workspace.warehouses.filter((warehouse) => warehouse.status === 'active');
      setQuoteWarehouses(activeWarehouses);
      setQuoteStockRows(workspace.stockRows);
      setForm((current) => ({ ...current, warehouseId: current.warehouseId || activeWarehouses[0]?.id || '' }));
    }).catch(() => {
      if (!active) return;
      setQuoteWarehouses([]);
      setQuoteStockRows([]);
    });
    return () => { active = false; };
  }, [isBuilderOpen, products]);

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
    clientFilter,
    sellerFilter,
  }), [clientFilter, opportunities, ownerOptions, quotes, search, sellerFilter]);

  const getQuoteSortValue = (quote: SalesQuote, columnId: QuoteSortColumn) => {
    switch (columnId) {
      case 'number':
        return quote.quoteNumber;
      case 'client':
        return `${quote.clientName} ${quote.contactPerson}`;
      case 'opportunity':
        return quote.opportunityId ? opportunityNameById.get(quote.opportunityId) ?? '' : '';
      case 'status':
        return t.statusLabels[toVisibleQuoteStatus(quote.status)] ?? toVisibleQuoteStatus(quote.status);
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

    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : quoteSortCollator.compare(String(leftValue), String(rightValue));

    return (result * directionMultiplier) || quoteSortCollator.compare(left.quoteNumber, right.quoteNumber);
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
    resetKey: `${search}:${clientFilter}:${sellerFilter}:${sortState.columnId}:${sortState.direction}:${quotes.map((quote) => quote.id).join('|')}`,
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
    setClientFilter('all');
    setSellerFilter('all');
    setSortState({ columnId: 'expiration', direction: 'asc' });
  };
  const clientOptions = useMemo(() => {
    const clientsByKey = new Map<string, string>();
    quotes.forEach((quote) => {
      const key = normalizeTextKey(quote.clientName);
      if (key && !clientsByKey.has(key)) {
        clientsByKey.set(key, quote.clientName);
      }
    });

    return [
      { value: 'all', label: t.filters.allClients },
      ...Array.from(clientsByKey, ([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    ];
  }, [quotes, t.filters.allClients]);
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
    count: filteredQuotes.filter((quote) => toVisibleQuoteStatus(quote.status) === status).length,
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
      company: companyPrintIdentity,
      copy: t,
    });
  };
  const downloadSavedQuote = (quote: SalesQuote) => {
    downloadQuotePdf({
      quote,
      contact: getQuoteContact(quote),
      opportunity: getQuoteOpportunity(quote),
      company: companyPrintIdentity,
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
      warehouseId: productUsesInventory(product) ? form.warehouseId : undefined,
      availabilityStatus: productUsesInventory(product)
        ? ((quoteStockRows.find((row) => row.productId === product.id)?.distributions.find((distribution) => distribution.warehouseId === form.warehouseId)?.available ?? 0) >= 1 ? 'available' : 'unavailable')
        : 'not_required',
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
    setItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      const updated = { ...item, ...patch };
      const product = products.find((candidate) => candidate.id === updated.productId);
      if (!product || !productUsesInventory(product)) return { ...updated, warehouseId: undefined, availabilityStatus: 'not_required' };
      const available = quoteStockRows.find((row) => row.productId === product.id)
        ?.distributions.find((distribution) => distribution.warehouseId === form.warehouseId)?.available ?? 0;
      return { ...updated, warehouseId: form.warehouseId, availabilityStatus: available >= updated.quantity ? 'available' : 'unavailable' };
    }));
  };

  useEffect(() => {
    if (!form.warehouseId) return;
    setItems((current) => current.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product || !productUsesInventory(product)) return item;
      const available = quoteStockRows.find((row) => row.productId === product.id)
        ?.distributions.find((distribution) => distribution.warehouseId === form.warehouseId)?.available ?? 0;
      return { ...item, warehouseId: form.warehouseId, availabilityStatus: available >= item.quantity ? 'available' : 'unavailable' };
    }));
  }, [form.warehouseId, products, quoteStockRows]);

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
      warehouseId: '',
      notes: '',
      terms: '',
    });
    setItems([]);
  };

  const openCreateQuoteBuilder = () => {
    setEditingQuote(null);
    setQuoteSaveError('');
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
    setQuoteSaveError('');
    setForm({
      clientMode: 'contact',
      clientId: contact?.id ?? '',
      temporaryClient: '',
      contactPerson: '',
      opportunityId: quote.opportunityId ?? 'none',
      status: toVisibleQuoteStatus(quote.status),
      createdDate: quote.createdDate,
      expirationDate: quote.expirationDate,
      assignedSellerValue: sellerValue,
      assignedSeller: quote.assignedSeller,
      currency: quote.currency ?? defaultSalesCurrency,
      taxJurisdiction: defaultQuoteTaxJurisdiction,
      customJurisdictionName: '',
      customTaxLabel: '',
      customTaxRate: '0',
      warehouseId: quote.items.find((item) => item.warehouseId)?.warehouseId ?? '',
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

  const handleSaveQuote = async ({ printAfterSave = false }: { printAfterSave?: boolean } = {}) => {
    if (isSavingQuote) {
      return;
    }

    const clientName = selectedContact?.company;
    const contactPerson = selectedContact?.contactPerson;

    if (!clientName || items.length === 0) {
      return;
    }

    const sellerPayload = getSellerPayloadFromValue(form.assignedSellerValue);
    const quotePayload = {
      clientId: selectedContact?.id,
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
      setIsSavingQuote(true);
      setQuoteSaveError('');
      let updatedQuote: SalesQuote;
      try {
        updatedQuote = await updateQuoteRecord(editingQuote.id, quotePayload);
      } catch {
        setQuoteSaveError(t.builder.saveError);
        return;
      } finally {
        setIsSavingQuote(false);
      }

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

    setIsSavingQuote(true);
    setQuoteSaveError('');
    let createdQuote: SalesQuote;
    try {
      createdQuote = await createQuoteRecord({
        ...quotePayload,
        files: [],
      });
    } catch {
      setQuoteSaveError(t.builder.saveError);
      return;
    } finally {
      setIsSavingQuote(false);
    }

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

  const handleStatusChange = async (quote: SalesQuote, status: QuoteStatus) => {
    let updatedQuote: SalesQuote;
    try {
      updatedQuote = await updateQuoteRecord(quote.id, { status });
    } catch {
      return;
    }

    if (opportunityLinkedQuoteStatuses.includes(status)) {
      const matchingOpportunities = getAssignmentOpportunities(updatedQuote);
      setPendingAssignmentQuote(updatedQuote);
      setSelectedOpportunityId(updatedQuote.opportunityId ?? matchingOpportunities[0]?.id ?? 'none');
      setNewOpportunityName(`${updatedQuote.clientName} - ${updatedQuote.quoteNumber}`);
    }
  };

  const confirmQuoteDeletion = async () => {
    if (!quotePendingDeletion || isDeletingQuote) {
      return;
    }

    setIsDeletingQuote(true);
    setQuoteDeletionError('');
    try {
      await deleteQuote(quotePendingDeletion.id);
      setQuotePendingDeletion(null);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 400) {
        setQuoteDeletionError(t.deleteDialog.inUseError);
      } else if (error instanceof ApiClientError && error.status === 403) {
        setQuoteDeletionError(t.deleteDialog.permissionError);
      } else {
        setQuoteDeletionError(t.deleteDialog.error);
      }
    } finally {
      setIsDeletingQuote(false);
    }
  };

  const closeAssignmentModal = () => {
    setPendingAssignmentQuote(null);
    setSelectedOpportunityId('none');
    setNewOpportunityName('');
    setAssignmentSaveError('');
    returnToOriginIfNeeded();
  };

  const assignExistingOpportunity = async () => {
    if (!pendingAssignmentQuote || selectedOpportunityId === 'none') {
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentSaveError('');
    try {
      await connectQuoteRecord(pendingAssignmentQuote.id, {
        mode: 'existing_opportunity',
        opportunityId: selectedOpportunityId,
      });
      setIsSavingAssignment(false);
      closeAssignmentModal();
    } catch {
      setAssignmentSaveError(t.assignmentModal.saveError);
      setIsSavingAssignment(false);
    }
  };

  const createOpportunityFromQuote = async () => {
    if (!pendingAssignmentQuote || !newOpportunityName.trim()) {
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentSaveError('');
    try {
      await connectQuoteRecord(pendingAssignmentQuote.id, {
        mode: 'create_opportunity',
        opportunityName: newOpportunityName.trim(),
      });
      setIsSavingAssignment(false);
      closeAssignmentModal();
    } catch {
      setAssignmentSaveError(t.assignmentModal.saveError);
      setIsSavingAssignment(false);
    }
  };

  const keepCommercialQuoteOnly = async () => {
    if (!pendingAssignmentQuote) {
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentSaveError('');
    try {
      await connectQuoteRecord(pendingAssignmentQuote.id, { mode: 'quote_only' });
      setIsSavingAssignment(false);
      closeAssignmentModal();
    } catch {
      setAssignmentSaveError(t.assignmentModal.saveError);
      setIsSavingAssignment(false);
    }
  };

  const quoteTableColumns: Array<IndiceTableColumnDefinition<QuoteOperationalColumnId>> = quoteTableColumnIds.map((columnId) => ({
    id: columnId,
    label: quoteColumnLabels[columnId],
    width: columnWidths[columnId],
    defaultWidth: quoteColumnWidths[columnId],
    contentMinimumWidth: quoteMinimumColumnWidths[columnId],
    alignment: columnId === 'amount' || columnId === 'files' ? 'right' : columnId === 'status' || columnId === 'readiness' ? 'center' : 'left',
    sortable: columnId !== 'readiness',
    resizeLabel: `${quoteColumnLabels[columnId]}: ajustar ancho`,
  }));
  const quoteTableMinimumWidth = quoteTableColumns.reduce(
    (total, column) => total + column.width,
    quoteActionsColumnWidth,
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

      {learningModeActive ? <QuoteLearningGuide copy={t.learningMode} /> : null}

      <SalesFilterBar
        title={t.filters.title}
        gridClassName="xl:grid-cols-[1.5fr_repeat(2,minmax(0,1fr))]"
      >
        <SalesFilterSearch
          label={t.filters.search}
          value={search}
          onValueChange={setSearch}
          placeholder={t.filters.searchPlaceholder}
        />
        <SalesFilterSelect label={t.filters.client} value={clientFilter} onValueChange={setClientFilter} options={clientOptions} />
        <SalesFilterSelect label={t.filters.seller} value={sellerFilter} onValueChange={setSellerFilter} options={sellerOptions} />
      </SalesFilterBar>

      {!learningModeActive ? <OperationalKpiArea
        alertChips={quoteAlertChips}
        distributionSegments={quoteDistributionSegments}
        insight={quoteInsight}
        insightIcon={<AlertTriangle className="h-4 w-4" />}
        metrics={quoteMetrics}
      /> : null}

      <IndiceTableShell
        pagination={(
          <DataTablePagination
            currentPage={currentPage}
            itemLabel={t.header.title.toLocaleLowerCase()}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageEnd={pageEnd}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            pageStart={pageStart}
            totalCount={totalCount}
            totalPages={totalPages}
          />
        )}
      >
          <IndiceOperationalTable minimumWidth={quoteTableMinimumWidth}>
            <IndiceTableColGroup columns={quoteTableColumns} actionsWidth={quoteActionsColumnWidth} />
            <IndiceTableHeaderRow
              actions={{ label: t.table.columns.actions, width: quoteActionsColumnWidth }}
              columns={quoteTableColumns}
              onResize={resizeColumn}
              onSort={(columnId) => handleSort(columnId as QuoteSortColumn)}
              sortState={{ columnId: sortState.columnId as QuoteOperationalColumnId, direction: sortState.direction }}
            />
            <TableBody>
              {sortedQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-5 py-10 text-center text-sm font-medium text-slate-500 dark:text-slate-300">
                    {t.table.empty}
                  </TableCell>
                </TableRow>
              ) : paginatedQuotes.map((quote) => {
                const opportunity = opportunities.find((item) => item.id === quote.opportunityId);
                const sellerValue = getQuoteSellerSelectValue(quote, ownerOptions);
                const quoteContact = getQuoteContact(quote);
                const linkedSale = salesRecords.find((sale) => (
                  sale.quoteId === quote.id || sale.quoteReference === quote.quoteNumber
                ));
                const tableSignals = quoteTableSignalsById.get(quote.id) ?? getQuoteTableSignals({
                  quote,
                  products,
                  contact: quoteContact,
                });

                return (
                  <TableRow key={quote.id} className="border-slate-200 align-top hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-700/40">
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top font-medium text-slate-950 dark:text-white">
                      <span className="block min-w-0 break-all text-xs font-medium leading-5 text-[#B63B32] dark:text-[#FFB0AA]">{quote.quoteNumber}</span>
                      <p className="mt-1 break-words font-medium text-slate-950 dark:text-white">{quote.clientName}</p>
                      {quote.contactPerson ? <p className="mt-1 break-words text-xs font-medium text-slate-500 dark:text-slate-300">{quote.contactPerson}</p> : null}
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      {opportunity ? (
                        <Badge className="h-auto max-w-full whitespace-normal break-words rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-xs font-medium leading-5 text-[#B63B32]">
                          {opportunity.opportunityName}
                        </Badge>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{t.common.unassigned}</span>
                      )}
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-4 py-5 align-top">
                      <QuoteSellerSelect
                        value={sellerValue}
                        options={sellerSelectOptions}
                        selectedLabel={quote.assignedSeller}
                        fallbackLabel={t.common.unassigned}
                        onValueChange={(value) => updateQuote(quote.id, getSellerPayloadFromValue(value))}
                      />
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-5 py-5 align-top">
                      <Select value={toVisibleQuoteStatus(quote.status)} onValueChange={(value) => handleStatusChange(quote, value as QuoteStatus)}>
                          <SelectTrigger className={cn('h-10 w-full min-w-0 max-w-full rounded-full border px-3 text-sm font-medium shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20 [&>span]:truncate', statusClasses[toVisibleQuoteStatus(quote.status)])}>
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
                      {linkedSale ? (
                        <p className="mt-2 break-all text-xs font-medium leading-5 text-emerald-700 dark:text-emerald-300">
                          {salesT.table.columns.saleNumber}: {linkedSale.saleNumber}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-4 py-5 align-top">
                      <QuoteReadinessBadge signal={tableSignals.readiness} t={t} />
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-4 py-5 align-top">
                      <p className="break-words font-medium text-slate-950 dark:text-white">{formatCurrency(quote.total, quote.currency)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">{quote.currency ?? defaultSalesCurrency}</p>
                      <div className="mt-2"><QuoteMarginBadge signal={tableSignals.margin} t={t} /></div>
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-4 py-5 align-top">
                      {opportunity?.nextAction ? (
                        <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2 dark:border-blue-900/60 dark:bg-blue-950/30">
                          <p className="break-words text-xs font-medium text-blue-800 dark:text-blue-200">
                            {prospectosT.options.nextActions[opportunity.nextAction]}
                          </p>
                          {opportunity.nextActionDate ? (
                            <p className="mt-1 break-words text-xs font-medium text-blue-600 dark:text-blue-300">{opportunity.nextActionDate}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <QuoteExpirationBadge expirationDate={quote.expirationDate} signal={tableSignals.expiration} t={t} />
                      <p className="mt-2 break-words text-xs font-medium leading-5 text-slate-500 dark:text-slate-300">
                        {t.table.columns.updated}: {quote.lastUpdated}
                      </p>
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-3 py-5 align-top">
                      <div className="grid gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full gap-1.5 rounded-lg border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-2 text-xs font-medium text-[#B63B32] hover:bg-[#FF6B5E]/15 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
                          onClick={() => downloadSavedQuote(quote)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                        {quote.files.length > 0 ? (
                          <button
                            type="button"
                            className="inline-flex min-w-0 items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#B63B32] dark:text-slate-300 dark:hover:text-[#FFB0AA]"
                            onClick={() => setSelectedFilesQuote(quote)}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {quote.files.length}
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="overflow-hidden whitespace-normal px-3 py-5 text-right align-top">
                      <IndiceTableActionGroup>
                        <QuoteAction label={t.actions.view} icon={<Eye className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20" onClick={() => setPreviewQuote(quote)} />
                        <QuoteAction label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => openEditQuoteBuilder(quote)} />
                        <QuoteAction label={t.actions.delete} icon={<Trash2 className="h-4 w-4" />} className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70" onClick={() => {
                          setQuoteDeletionError('');
                          setQuotePendingDeletion(quote);
                        }} />
                      </IndiceTableActionGroup>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </IndiceOperationalTable>
      </IndiceTableShell>

      <AlertDialog
        open={Boolean(quotePendingDeletion)}
        onOpenChange={(open) => {
          if (!open && !isDeletingQuote) {
            setQuotePendingDeletion(null);
            setQuoteDeletionError('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteDialog.description(quotePendingDeletion?.quoteNumber ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {quoteDeletionError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {quoteDeletionError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingQuote}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingQuote}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                void confirmQuoteDeletion();
              }}
            >
              {isDeletingQuote ? t.deleteDialog.deleting : t.deleteDialog.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        customerT={salesT}
        opportunityOptions={opportunityOptions}
        sellerOptions={formSellerOptions}
        formatCurrency={(value, currency) => formatCurrency(value, currency ?? form.currency)}
        isSaving={isSavingQuote}
        submitError={quoteSaveError}
        onOpenChange={setIsBuilderOpen}
        onClose={closeQuoteBuilder}
        onFormChange={setForm}
        onCreateCustomer={createContactRecord}
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
        onSubmit={() => { void handleSaveQuote(); }}
        onSubmitAndPrint={() => { void handleSaveQuote({ printAfterSave: true }); }}
        warehouses={quoteWarehouses}
        stockRows={quoteStockRows}
      />

      <QuotePreviewModal
        quote={previewQuote}
        contact={previewContact}
        opportunity={previewOpportunity}
        company={companyPrintIdentity}
        copy={t}
        onClose={() => setPreviewQuote(null)}
      />

      <SalesModalFrame
        open={Boolean(selectedFilesQuote)}
        onOpenChange={(open) => !open && setSelectedFilesQuote(null)}
        closeLabel={t.common.close}
        title={t.filesModal.title}
        description={t.filesModal.description}
        icon={<Paperclip className="h-5 w-5" />}
        modalType="standard-form"
        bodyClassName="space-y-4"
        footerClassName="sm:justify-end"
        footer={(
          <Button className={quoteModalActionClassNames.primary} onClick={() => setSelectedFilesQuote(null)}>{t.common.close}</Button>
        )}
      >
            <div className="rounded-lg border border-[#FF6B5E]/20 bg-white p-4 shadow-sm dark:border-[#FF6B5E]/30 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.table.columns.number}</p>
              <p className="mt-2 break-all text-lg font-medium text-slate-950 dark:text-white">{selectedFilesQuote?.quoteNumber}</p>
              <p className="mt-1 break-words text-sm font-medium text-slate-500 dark:text-slate-400">{selectedFilesQuote?.clientName}</p>
            </div>

            {selectedFilesQuote ? (
              <div className="rounded-lg border border-[#FF6B5E]/25 bg-white p-4 shadow-sm dark:border-[#FF6B5E]/30 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-950 dark:text-white">{t.previewModal.documentTitle}</p>
                      <p className="mt-1 break-all text-xs font-medium text-slate-500 dark:text-slate-400">{selectedFilesQuote.quoteNumber}</p>
                      <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {formatCurrency(selectedFilesQuote.total, selectedFilesQuote.currency)} · {selectedFilesQuote.currency ?? defaultSalesCurrency} · {t.statusLabels[selectedFilesQuote.status]}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white text-xs font-medium text-[#B63B32] hover:bg-[#FF6B5E]/10 dark:bg-slate-900 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20"
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
                      className="h-9 gap-2 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
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
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.labels.files}</h3>
                {selectedFilesQuote.files.map((file) => (
                  <div key={file} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 break-all text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">{file}</span>
                  </div>
                ))}
              </section>
            ) : null}
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(pendingAssignmentQuote)}
        onOpenChange={(open) => !open && !isSavingAssignment && closeAssignmentModal()}
        closeLabel={t.common.cancel}
        title={t.assignmentModal.title}
        description={t.assignmentModal.description}
        icon={<Link2 className="h-5 w-5" />}
        modalType="large-workspace"
        bodyClassName="grid gap-4 lg:grid-cols-3"
        footerClassName="sm:justify-end"
        footer={(
          <Button variant="outline" className={quoteModalActionClassNames.secondary} onClick={closeAssignmentModal}>{t.common.cancel}</Button>
        )}
      >
            {assignmentSaveError ? (
              <div className="lg:col-span-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                {assignmentSaveError}
              </div>
            ) : null}
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-medium text-slate-950">{t.assignmentModal.existingTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm font-medium leading-6 text-slate-500">{t.assignmentModal.existingDescription}</p>
              <div className="mt-4">
                <FilterSelect
                  softTypography
                  label={t.labels.opportunity}
                  value={selectedOpportunityId}
                  onValueChange={setSelectedOpportunityId}
                  options={[
                    { value: 'none', label: t.common.none },
                    ...assignmentOpportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName })),
                  ]}
                />
              </div>
              <Button disabled={isSavingAssignment || selectedOpportunityId === 'none'} className="mt-4 h-11 w-full rounded-lg bg-[#FF6B5E] font-medium text-[#222831] hover:bg-[#E85C50]" onClick={assignExistingOpportunity}>
                {isSavingAssignment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {t.assignmentModal.assign}
              </Button>
            </div>

            <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/[0.04] p-5 shadow-sm">
              <h3 className="font-medium text-slate-950">{t.assignmentModal.newTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm font-medium leading-6 text-slate-500">{t.assignmentModal.newDescription}</p>
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-slate-700">{t.assignmentModal.opportunityName}</label>
                <Input className={cn('h-11 rounded-lg px-4 font-medium', coralFieldClassName)} value={newOpportunityName} onChange={(event) => setNewOpportunityName(event.target.value)} placeholder={t.assignmentModal.opportunityNamePlaceholder} />
              </div>
              <Button disabled={isSavingAssignment || !newOpportunityName.trim()} className="mt-4 h-11 w-full rounded-lg bg-[#FF6B5E] font-medium text-[#222831] hover:bg-[#E8564B]" onClick={createOpportunityFromQuote}>
                {isSavingAssignment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t.assignmentModal.createOpportunity}
              </Button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-medium text-slate-950">{t.assignmentModal.keepTitle}</h3>
              <p className="mt-2 min-h-[56px] text-sm font-medium leading-6 text-slate-500">{t.assignmentModal.keepDescription}</p>
              <Button disabled={isSavingAssignment} variant="outline" className="mt-4 h-11 w-full rounded-lg border-slate-200 bg-white font-medium text-slate-800 hover:bg-slate-50" onClick={keepCommercialQuoteOnly}>
                {isSavingAssignment ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {t.assignmentModal.keepQuote}
              </Button>
            </div>
      </SalesModalFrame>
    </section>
  );
}
