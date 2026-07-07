import { Fragment, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  History,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
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
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../components/ui/utils';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { SalesTitleBar } from '../components/SalesTitleBar';
import {
  customerRelationTypes,
  postSaleStatuses,
  postSaleTypes,
  salesOwners,
  type CustomerRelationType,
  type PostSaleStatus,
  type PostSaleType,
  type SalesPostSaleCase,
  useSalesCrm,
} from '../salesCrmContext';
import type { SaleRecord } from '../Sales/types/salesTypes';
import { getPhoneHref, getWhatsAppHref } from '../utils/salesCommunicationUtils';
import { formatSalesCurrencyBreakdown, normalizeSalesCurrencyCode } from '../utils/salesCurrency';
import {
  ActionButton,
  FilterSelect,
  FollowUpLane,
  KpiMetric,
} from './components/PostSalesUi';
import type {
  CustomerHistory,
  FilterValue,
  FutureOpportunityFormState,
  OpportunityAutomationDelay,
  OpportunityAutomationFormState,
  PostSaleFormState,
  ViewMode,
} from './types/postSalesTypes';
import { usePostSalesTranslations } from './translations';
import { openSaleSummaryPdf } from './utils/postSalePdf';
import {
  buildCustomerHistories,
  buildLifecycleByHistoryId,
  filterCustomerHistories,
  filterPostSaleCases,
  formatCurrency,
  futureOpportunityModalActions,
  getDaysUntil,
  getEmailHref,
  getFutureIsoDate,
  getHistoryCurrency,
  getIsoDateAfter,
  getTodayIsoDate,
  healthClasses,
  parseFiles,
  postSaleModalActions,
  relationClasses,
  relationshipClasses,
  riskClasses,
  salesModalIconClassName,
  statusClasses,
  statusProgressClasses,
} from './utils/postSalesPageUtils';

export default function Postventa() {
  const t = usePostSalesTranslations();
  const {
    contacts,
    opportunities,
    quotes,
    salesRecords,
    postSaleCases,
    addPostSaleCase,
    addOpportunity,
    updatePostSaleCaseStatus,
  } = useSalesCrm();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [automationCase, setAutomationCase] = useState<CustomerHistory | null>(null);
  const [selectedFilesCase, setSelectedFilesCase] = useState<SalesPostSaleCase | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<string[]>([]);
  const [futureOpportunityCase, setFutureOpportunityCase] = useState<CustomerHistory | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterValue>('all');
  const [ownerFilter, setOwnerFilter] = useState<FilterValue>('all');
  const [healthFilter, setHealthFilter] = useState<FilterValue>('all');
  const [caseForm, setCaseForm] = useState<PostSaleFormState>(() => ({
    clientId: contacts[0]?.id ?? '',
    relatedOpportunityId: 'none',
    lastQuoteId: 'none',
    relationType: 'One-time customer',
    postSaleType: 'Standard post-sale',
    status: 'Active',
    owner: salesOwners[0],
    lastPurchaseDate: getTodayIsoDate(),
    nextFollowUpDate: getFutureIsoDate(7),
    renewalDate: getFutureIsoDate(90),
    lifetimeValue: '',
    nextAction: '',
    notes: '',
    files: '',
  }));
  const [automationForm, setAutomationForm] = useState<OpportunityAutomationFormState>(() => ({
    clientId: contacts[0]?.id ?? '',
    delay: '30',
    scheduledDate: getFutureIsoDate(30),
    opportunityName: '',
    expectedCloseDate: getFutureIsoDate(60),
    owner: salesOwners[0],
    notes: '',
  }));
  const [futureForm, setFutureForm] = useState<FutureOpportunityFormState>(() => ({
    opportunityName: '',
    expectedCloseDate: getFutureIsoDate(30),
    nextActionDate: getFutureIsoDate(7),
    notes: '',
  }));

  const postSaleTypeOptions = [
    { value: 'all', label: t.filters.allPostSaleTypes },
    ...postSaleTypes.map((postSaleType) => ({ value: postSaleType, label: t.postSaleTypeLabels[postSaleType] })),
  ];
  const ownerOptions = [
    { value: 'all', label: t.filters.allOwners },
    ...salesOwners.map((owner) => ({ value: owner, label: owner })),
  ];
  const healthOptions: Array<{ value: FilterValue; label: string }> = [
    { value: 'all', label: t.filters.allHealth },
    { value: 'healthy', label: t.lifecycle.health.healthy },
    { value: 'attention', label: t.lifecycle.health.attention },
    { value: 'at_risk', label: t.lifecycle.health.at_risk },
    { value: 'lost', label: t.lifecycle.health.lost },
  ];

  const customerHistories = useMemo<CustomerHistory[]>(() => buildCustomerHistories({
    contacts,
    postSaleCases,
    salesRecords,
  }), [contacts, postSaleCases, salesRecords]);

  const lifecycleByHistoryId = useMemo(
    () => buildLifecycleByHistoryId(customerHistories),
    [customerHistories],
  );

  const filteredCustomerHistories = useMemo(() => filterCustomerHistories({
    customerHistories,
    lifecycleByHistoryId,
    search,
    typeFilter,
    ownerFilter,
    healthFilter,
  }), [customerHistories, healthFilter, lifecycleByHistoryId, ownerFilter, search, typeFilter]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedCustomerHistories,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${search}:${typeFilter}:${ownerFilter}:${healthFilter}:${customerHistories.map((history) => history.id).join('|')}`,
    rows: filteredCustomerHistories,
  });

  const filteredCases = useMemo(() => filterPostSaleCases({
    postSaleCases,
    opportunities,
    quotes,
    search,
    typeFilter,
    ownerFilter,
  }), [opportunities, ownerFilter, postSaleCases, quotes, search, typeFilter]);

  const activePostSales = filteredCustomerHistories.length;
  const renewalsSoon = filteredCustomerHistories.filter((history) => lifecycleByHistoryId[history.id]?.renewalDueThisMonth).length;
  const revenueAtRiskDisplay = formatSalesCurrencyBreakdown(
    filteredCustomerHistories.filter((history) => (lifecycleByHistoryId[history.id]?.revenueAtRisk ?? 0) > 0),
    (history) => lifecycleByHistoryId[history.id]?.revenueAtRisk ?? 0,
    (history) => getHistoryCurrency(history),
  );
  const recoveredCustomers = filteredCustomerHistories.filter((history) => lifecycleByHistoryId[history.id]?.relationship === 'recovered').length;
  const futureOpportunities = filteredCustomerHistories.filter((history) => getDaysUntil(history.nextFollowUpDate) >= 0).length;
  const recurringRevenueDisplay = formatSalesCurrencyBreakdown(
    filteredCustomerHistories
      .filter((history) => ['recurring', 'renewal'].includes(lifecycleByHistoryId[history.id]?.relationship ?? ''))
      .flatMap((history) => history.sales),
    (sale) => sale.totalAmount,
    (sale) => sale.currency,
  );
  const atRiskClients = filteredCustomerHistories.filter((history) => ['at_risk', 'lost'].includes(lifecycleByHistoryId[history.id]?.health ?? '')).length;
  const statusDistribution = postSaleStatuses.map((status) => ({
    status,
    count: filteredCustomerHistories.filter((history) => history.status === status).length,
  }));

  const upcomingContacts = filteredCases
    .filter((postSaleCase) => {
      const days = getDaysUntil(postSaleCase.nextFollowUpDate);
      return days >= 0 && days <= 14;
    })
    .sort((first, second) => getDaysUntil(first.nextFollowUpDate) - getDaysUntil(second.nextFollowUpDate));
  const renewalCases = filteredCases.filter((postSaleCase) => {
    const days = getDaysUntil(postSaleCase.renewalDate);
    return days >= 0 && days <= 30;
  });
  const dormantCases = filteredCases.filter((postSaleCase) => postSaleCase.relationType === 'Dormant customer');
  const riskCases = filteredCases.filter((postSaleCase) => postSaleCase.status === 'At risk' || postSaleCase.riskLevel === 'High');
  const reactivationCases = filteredCases.filter((postSaleCase) => postSaleCase.relationType === 'Lost prospect');

  const handleCreateCase = () => {
    const contact = contacts.find((item) => item.id === caseForm.clientId);
    const relatedQuote = quotes.find((quote) => quote.id === caseForm.lastQuoteId);
    const relatedOpportunity = opportunities.find((opportunity) => opportunity.id === caseForm.relatedOpportunityId);
    const caseCurrency = normalizeSalesCurrencyCode(relatedQuote?.currency ?? relatedOpportunity?.currency);

    if (!contact || !caseForm.nextAction.trim()) {
      return;
    }

    addPostSaleCase({
      clientId: contact.id,
      clientName: contact.company,
      contactPerson: contact.contactPerson,
      relatedOpportunityId: caseForm.relatedOpportunityId === 'none' ? undefined : caseForm.relatedOpportunityId,
      lastQuoteId: caseForm.lastQuoteId === 'none' ? undefined : caseForm.lastQuoteId,
      relationType: caseForm.relationType,
      postSaleType: caseForm.postSaleType,
      status: caseForm.status,
      owner: caseForm.owner,
      lastPurchaseDate: caseForm.lastPurchaseDate || undefined,
      nextFollowUpDate: caseForm.nextFollowUpDate,
      renewalDate: caseForm.renewalDate || undefined,
      lifetimeValue: Number(caseForm.lifetimeValue) || 0,
      currency: caseCurrency,
      notes: caseForm.notes,
      files: parseFiles(caseForm.files),
      nextAction: caseForm.nextAction,
      riskLevel: caseForm.status === 'At risk' ? 'High' : 'Low',
      commercialHistory: [
        contact.company,
        caseForm.relatedOpportunityId === 'none' ? t.common.unassigned : caseForm.relatedOpportunityId,
        caseForm.nextAction,
      ],
    });
    setIsCaseModalOpen(false);
  };

  const openFutureOpportunityModal = (history: CustomerHistory) => {
    setFutureOpportunityCase(history);
    setFutureForm({
      opportunityName: `${history.clientName} ${t.forms.opportunity.defaultSuffix}`,
      expectedCloseDate: history.renewalDate ?? getFutureIsoDate(30),
      nextActionDate: history.nextFollowUpDate ?? getFutureIsoDate(7),
      notes: history.notes,
    });
  };

  const openFollowUpModal = (history: CustomerHistory) => {
    if (!history.clientId) {
      return;
    }

    const scheduledDate = getIsoDateAfter(history.lastPurchaseDate, 30);
    const expectedCloseDate = getIsoDateAfter(scheduledDate, 30);

    setAutomationCase(history);
    setAutomationForm({
      clientId: history.clientId,
      delay: '30',
      scheduledDate,
      opportunityName: `${history.clientName} ${t.forms.opportunity.defaultSuffix}`,
      expectedCloseDate,
      owner: history.owner,
      notes: history.notes,
    });
  };

  const handleAutomationDelayChange = (value: string) => {
    const delay = value as OpportunityAutomationDelay;
    setAutomationForm((current) => {
      if (delay === 'custom') {
        return { ...current, delay };
      }

      const days = Number(delay);
      const scheduledDate = getIsoDateAfter(automationCase?.lastPurchaseDate, days);

      return {
        ...current,
        delay,
        scheduledDate,
        expectedCloseDate: getIsoDateAfter(scheduledDate, 30),
      };
    });
  };

  const handleCreateAutomatedOpportunity = () => {
    if (!automationCase || !automationForm.opportunityName.trim() || !automationForm.scheduledDate || !automationForm.expectedCloseDate) {
      return;
    }

    const contact = contacts.find((item) => item.id === automationForm.clientId);
    const latestSale = automationCase.sales[0];
    const automationCurrency = getHistoryCurrency(automationCase);
    const opportunityNote = [
      automationForm.notes,
      t.forms.lost.generatedNote,
      `${t.table.columns.lastPurchase}: ${automationCase.lastPurchaseDate ?? t.common.notAvailable}`,
      latestSale ? `${t.saleDetail.saleReference}: ${latestSale.saleNumber}` : '',
    ].filter(Boolean).join('\n');

    addOpportunity({
      opportunityName: automationForm.opportunityName.trim(),
      contactId: contact?.id ?? automationCase.clientId ?? '',
      company: automationCase.clientName,
      contactPerson: automationCase.contactPerson,
      phone: contact?.phone ?? automationCase.phone ?? '',
      email: contact?.email ?? automationCase.email ?? '',
      source: 'Post Sale Opportunity',
      stage: 'New',
      temperature: automationCase.riskLevel === 'High' ? 'Warm' : 'Hot',
      owner: automationForm.owner,
      estimatedValue: String(Math.max(latestSale?.totalAmount ?? automationCase.lifetimeValue, 1)),
      currency: automationCurrency,
      probability: '25%',
      expectedCloseDate: automationForm.expectedCloseDate,
      nextAction: 'Follow up',
      nextActionDate: automationForm.scheduledDate,
      lastContact: automationCase.lastPurchaseDate ?? getTodayIsoDate(),
      files: automationCase.files,
      status: 'Active',
      notes: opportunityNote,
    });

    addPostSaleCase({
      clientId: contact?.id ?? automationCase.clientId,
      clientName: automationCase.clientName,
      contactPerson: automationCase.contactPerson,
      relatedOpportunityId: undefined,
      lastQuoteId: latestSale?.quoteId,
      relationType: automationCase.relationType,
      postSaleType: automationCase.postSaleType,
      status: 'Pending follow-up',
      owner: automationForm.owner,
      lastPurchaseDate: automationCase.lastPurchaseDate,
      nextFollowUpDate: automationForm.scheduledDate,
      renewalDate: automationCase.renewalDate,
      lifetimeValue: automationCase.lifetimeValue,
      currency: automationCurrency,
      notes: opportunityNote,
      files: automationCase.files,
      nextAction: t.forms.lost.nextAction,
      riskLevel: automationCase.riskLevel === 'High' ? 'High' : 'Medium',
      commercialHistory: [
        automationCase.clientName,
        latestSale?.saleNumber ?? t.common.notAvailable,
        automationForm.scheduledDate,
      ],
    });

    setAutomationCase(null);
  };

  const openPhoneCall = (phone?: string) => {
    if (!phone) return;
    window.location.href = getPhoneHref(phone);
  };

  const openWhatsApp = (phone?: string) => {
    if (!phone) return;
    window.open(getWhatsAppHref(phone), '_blank', 'noopener,noreferrer');
  };

  const openEmail = (email?: string, clientName?: string) => {
    if (!email) return;
    window.location.href = getEmailHref(email, `${t.header.title} · ${clientName ?? ''}`);
  };

  const handleCreateFutureOpportunity = () => {
    if (!futureOpportunityCase || !futureForm.opportunityName.trim()) {
      return;
    }

    const contact = contacts.find((item) => item.id === futureOpportunityCase.clientId);
    const futureOpportunityCurrency = getHistoryCurrency(futureOpportunityCase);

    addOpportunity({
      opportunityName: futureForm.opportunityName.trim(),
      contactId: contact?.id ?? '',
      company: futureOpportunityCase.clientName,
      contactPerson: futureOpportunityCase.contactPerson,
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      source: 'Post Sale Opportunity',
      stage: 'New',
      temperature: futureOpportunityCase.riskLevel === 'High' ? 'Warm' : 'Hot',
      owner: futureOpportunityCase.owner,
      estimatedValue: String(Math.max(futureOpportunityCase.lifetimeValue, 1)),
      currency: futureOpportunityCurrency,
      probability: '25%',
      expectedCloseDate: futureForm.expectedCloseDate,
      nextAction: 'Follow up',
      nextActionDate: futureForm.nextActionDate,
      lastContact: getTodayIsoDate(),
      files: futureOpportunityCase.files,
      status: 'Active',
      notes: futureForm.notes,
    });
    setFutureOpportunityCase(null);
  };

  return (
    <section className="space-y-5">
      <SalesTitleBar icon={t.header.emoji} title={t.header.title} subtitle={t.header.subtitle} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-sm text-slate-600">
          <KpiMetric icon={<ShieldCheck className="h-4 w-4" />} value={activePostSales} label={t.metrics.activeCustomers} valueClassName="text-[#177d66]" />
          <KpiMetric icon={<CalendarClock className="h-4 w-4" />} value={renewalsSoon} label={t.metrics.renewalsThisMonth} valueClassName="text-violet-600" />
          <KpiMetric icon={<AlertTriangle className="h-4 w-4" />} value={revenueAtRiskDisplay} label={t.metrics.revenueAtRisk} valueClassName="text-[#b63b32]" />
          <KpiMetric icon={<RefreshCw className="h-4 w-4" />} value={recoveredCustomers} label={t.metrics.recoveredCustomers} valueClassName="text-[#2563EB]" />
          <KpiMetric icon={<Sparkles className="h-4 w-4" />} value={futureOpportunities} label={t.metrics.futureOpportunities} valueClassName="text-[#B63B32]" />
          <KpiMetric icon={<Clock3 className="h-4 w-4" />} value={recurringRevenueDisplay} label={t.metrics.recurringRevenue} valueClassName="text-[#177d66]" />
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
            {statusDistribution.map(({ status, count }) => {
              const width = filteredCustomerHistories.length > 0 ? (count / filteredCustomerHistories.length) * 100 : 0;
              return <div key={status} className={cn('h-full', statusProgressClasses[status])} style={{ width: `${width}%` }} aria-hidden="true" />;
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
            {postSaleStatuses.map((status) => (
              <span key={status} className="inline-flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', statusProgressClasses[status])} />
                {t.statusLabels[status]}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-4 py-3 text-sm font-semibold leading-6 text-[#B63B32]">
          {t.insight.summary(recurringRevenueDisplay, atRiskClients, renewalsSoon)}
        </div>
      </section>

      <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {(['table', 'followUp'] as ViewMode[]).map((view) => (
          <Button
            key={view}
            type="button"
            variant={viewMode === view ? 'default' : 'ghost'}
            className={cn('h-10 rounded-lg px-4', viewMode === view && 'bg-[#FF6B5E] text-white hover:bg-[#E8564B]')}
            onClick={() => setViewMode(view)}
          >
            {view === 'table' ? <UsersRound className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {t.views[view]}
          </Button>
        ))}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-white">{t.filters.title}</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.filters.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.filters.searchPlaceholder}
                className="h-11 rounded-xl border-slate-200 bg-white pl-11 text-base font-semibold text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
          <FilterSelect label={t.filters.postSaleType} value={typeFilter} onValueChange={setTypeFilter} options={postSaleTypeOptions} />
          <FilterSelect label={t.filters.owner} value={ownerFilter} onValueChange={setOwnerFilter} options={ownerOptions} />
          <FilterSelect label={t.filters.customerHealth} value={healthFilter} onValueChange={setHealthFilter} options={healthOptions} />
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <TableHead className="min-w-[280px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.client}</TableHead>
                  <TableHead className="min-w-[170px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.customerHealth}</TableHead>
                  <TableHead className="min-w-[240px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.salesHistory}</TableHead>
                  <TableHead className="min-w-[130px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.lastPurchase}</TableHead>
                  <TableHead className="min-w-[140px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.lifetimeValue}</TableHead>
                  <TableHead className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.revenueAtRisk}</TableHead>
                  <TableHead className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.nextFollowUp}</TableHead>
                  <TableHead className="min-w-[170px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.futureOpportunities}</TableHead>
                  <TableHead className="min-w-[170px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.status}</TableHead>
                  <TableHead className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.owner}</TableHead>
                  <TableHead className="min-w-[240px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{t.table.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomerHistories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                      {t.table.empty}
                    </TableCell>
                  </TableRow>
                ) : paginatedCustomerHistories.map((history) => {
                  const isExpanded = expandedCustomerIds.includes(history.id);
                  const lifecycle = lifecycleByHistoryId[history.id];
                  const health = lifecycle?.health ?? 'healthy';
                  const relationship = lifecycle?.relationship ?? 'first_purchase';
                  const revenueAtRiskAmount = lifecycle?.revenueAtRisk ?? 0;
                  const hasFutureOpportunity = getDaysUntil(history.nextFollowUpDate) >= 0;

                  return (
                    <Fragment key={history.id}>
                      <TableRow className="align-top hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-700/40">
                        <TableCell className="px-5 py-4">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                              onClick={() => setExpandedCustomerIds((current) => (
                                current.includes(history.id)
                                  ? current.filter((id) => id !== history.id)
                                  : [...current, history.id]
                              ))}
                              aria-label={isExpanded ? t.actions.collapseHistory : t.actions.expandHistory}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <div>
                              <p className="font-black text-slate-950 dark:text-white">{history.clientName}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">{history.contactPerson}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', relationClasses[history.relationType])}>
                                  {t.relationTypeLabels[history.relationType]}
                                </Badge>
                                <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', riskClasses[history.riskLevel])}>
                                  {t.riskLabels[history.riskLevel]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="space-y-2">
                            <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', healthClasses[health])}>
                              {t.lifecycle.health[health]}
                            </Badge>
                            <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', relationshipClasses[relationship])}>
                              {t.lifecycle.relationship[relationship]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <p className="text-sm font-black text-slate-950 dark:text-white">{history.sales.length} {history.sales.length === 1 ? t.saleHistory.sale : t.saleHistory.sales}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {history.sales.slice(0, 3).map((sale) => (
                              <button
                                key={sale.id}
                                type="button"
                                className="rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-2 py-1 text-xs font-black text-[#B63B32] hover:bg-[#FF6B5E]/15"
                                onClick={() => setSelectedSale(sale)}
                              >
                                {sale.saleNumber}
                              </button>
                            ))}
                            {history.sales.length > 3 ? <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">+{history.sales.length - 3}</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">{history.lastPurchaseDate ?? t.common.notAvailable}</TableCell>
                        <TableCell className="px-5 py-4 font-black text-slate-950 dark:text-white">{formatCurrency(history.lifetimeValue, getHistoryCurrency(history))}</TableCell>
                        <TableCell className="px-5 py-4 font-black text-[#B63B32]">
                          {revenueAtRiskAmount > 0 ? formatCurrency(revenueAtRiskAmount, getHistoryCurrency(history)) : t.common.notAvailable}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <p className="font-black text-slate-950 dark:text-white">{history.nextFollowUpDate ?? t.common.notAvailable}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{history.renewalDate ? `${t.table.columns.renewalDate}: ${history.renewalDate}` : t.filters.renewalMissing}</p>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <Badge className={cn(
                            'rounded-full border px-2 py-1 text-xs font-bold',
                            hasFutureOpportunity
                              ? 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]'
                              : 'border-slate-200 bg-slate-50 text-slate-500',
                          )}>
                            {hasFutureOpportunity ? t.table.futureOpportunityScheduled : t.common.notAvailable}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          {history.postSaleCase ? (
                            <Select value={history.status} onValueChange={(value) => updatePostSaleCaseStatus(history.postSaleCase?.id ?? '', value as PostSaleStatus)}>
                              <SelectTrigger className={cn('h-9 rounded-lg border px-3 text-sm font-black shadow-none', statusClasses[history.status])}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {postSaleStatuses.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {t.statusLabels[status]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', statusClasses[history.status])}>
                              {t.statusLabels[history.status]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">{history.owner}</TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="mx-auto grid w-fit grid-cols-[repeat(5,2.25rem)] gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <ActionButton label={t.actions.call} icon={<Phone className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15 dark:text-blue-300 dark:hover:bg-[#2563EB]/20" disabled={!history.phone} onClick={() => openPhoneCall(history.phone)} />
                            <ActionButton label={t.actions.whatsapp} icon={<MessageCircle className="h-4 w-4" />} className="border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20 dark:text-[#7AD8BF] dark:hover:bg-[#59C3A5]/25" disabled={!history.phone} onClick={() => openWhatsApp(history.phone)} />
                            <ActionButton label={t.actions.email} icon={<Mail className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20" disabled={!history.email} onClick={() => openEmail(history.email, history.clientName)} />
                            <ActionButton label={t.actions.followUp} icon={<CalendarPlus className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20" disabled={!history.clientId} onClick={() => openFollowUpModal(history)} />
                            <ActionButton label={t.actions.futureOpportunity} icon={<Sparkles className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/20 dark:text-[#FFB0AA] dark:hover:bg-[#FF6B5E]/20" onClick={() => openFutureOpportunityModal(history)} />
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded ? (
                        <TableRow key={`${history.id}-history`} className="bg-slate-50/70 dark:bg-slate-900/70">
                          <TableCell colSpan={11} className="px-8 py-5">
                            <div className="rounded-[20px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
                                <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">{t.saleHistory.title}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.saleHistory.description}</p>
                              </div>
                              {history.sales.length ? (
                                <div className="divide-y divide-slate-100">
                                  {history.sales.map((sale) => (
                                    <button
                                      key={sale.id}
                                      type="button"
                                      className="grid w-full gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
                                      onClick={() => setSelectedSale(sale)}
                                    >
                                      <div>
                                        <p className="font-black text-slate-950 dark:text-white">{sale.saleNumber}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{sale.quoteReference}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{t.saleHistory.date}</p>
                                        <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">{sale.saleDate}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{t.saleHistory.total}</p>
                                        <p className="mt-1 font-black text-slate-950 dark:text-white">{formatCurrency(sale.totalAmount, sale.currency)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{t.saleHistory.products}</p>
                                        <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">{sale.saleLines.length}</p>
                                      </div>
                                      <span className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-3 text-sm font-black text-[#B63B32]">
                                        <Eye className="h-4 w-4" />
                                        {t.actions.viewSale}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-5 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-300">{t.saleHistory.empty}</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            currentPage={currentPage}
            itemLabel="clientes"
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageEnd={pageEnd}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            pageStart={pageStart}
            totalCount={totalCount}
            totalPages={totalPages}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#2563EB]" />
            <h3 className="text-xl font-black text-slate-950">{t.sections.followUpTitle}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t.sections.followUpDescription}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <FollowUpLane title={t.followUp.upcomingContacts} description={t.followUp.upcomingContactsDescription} cases={upcomingContacts} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => postSaleCase.nextFollowUpDate} />
            <FollowUpLane title={t.followUp.renewalsSoon} description={t.followUp.renewalsSoonDescription} cases={renewalCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => postSaleCase.renewalDate ?? t.common.notAvailable} />
            <FollowUpLane title={t.followUp.dormantCustomers} description={t.followUp.dormantCustomersDescription} cases={dormantCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => t.riskLabels[postSaleCase.riskLevel]} />
            <FollowUpLane title={t.followUp.atRiskClients} description={t.followUp.atRiskClientsDescription} cases={riskCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => t.statusLabels[postSaleCase.status]} />
            <FollowUpLane title={t.followUp.reactivations} description={t.followUp.reactivationsDescription} cases={reactivationCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => postSaleCase.lostReason ? t.lostReasonLabels[postSaleCase.lostReason] : t.common.none} />
          </div>
        </div>
      )}

      <SalesModalFrame
        open={Boolean(selectedSale)}
        onOpenChange={(open) => !open && setSelectedSale(null)}
        contentClassName="max-w-4xl"
        bodyClassName="space-y-5"
        title={t.saleDetail.title}
        description={t.saleDetail.description}
        icon={<History className={salesModalIconClassName} />}
        footer={
          <>
            {selectedSale ? (
              <Button variant="outline" className={postSaleModalActions.secondary} onClick={() => openSaleSummaryPdf(selectedSale, t)}>
                <FileText className="h-4 w-4" />
                {t.saleDetail.viewPdf}
              </Button>
            ) : null}
            <Button className={postSaleModalActions.primary} onClick={() => setSelectedSale(null)}>{t.common.close}</Button>
          </>
        }
      >
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.saleReference}</p>
            <p className="mt-2 font-black text-slate-950">{selectedSale?.saleNumber}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{selectedSale?.quoteReference}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.total}</p>
            <p className="mt-2 font-black text-slate-950">{formatCurrency(selectedSale?.totalAmount ?? 0, selectedSale?.currency)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{selectedSale?.currency}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.status}</p>
            <p className="mt-2 font-black text-slate-950">{selectedSale?.commercialStatus}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{selectedSale?.financeStatus} · {selectedSale?.inventoryStatus}</p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.lines}</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.product}</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.quantity}</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.unitPrice}</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.margin}</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.saleDetail.warehouse}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSale?.saleLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="px-5 py-4">
                      <p className="font-black text-slate-950">{line.productName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{line.sku}</p>
                    </TableCell>
                    <TableCell className="px-5 py-4 font-semibold text-slate-700">{line.quantity}</TableCell>
                    <TableCell className="px-5 py-4 font-semibold text-slate-700">{formatCurrency(line.unitPrice, selectedSale?.currency)}</TableCell>
                    <TableCell className="px-5 py-4 font-semibold text-slate-700">{formatCurrency(line.marginAmount, selectedSale?.currency)}</TableCell>
                    <TableCell className="px-5 py-4 font-semibold text-slate-700">{line.warehouseId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4 text-sm font-semibold leading-6 text-[#B63B32]">
          {selectedSale?.notes || t.common.notAvailable}
        </section>
      </SalesModalFrame>

      <SalesModalFrame
        open={isCaseModalOpen}
        onOpenChange={setIsCaseModalOpen}
        contentClassName="max-w-5xl"
        bodyClassName="grid gap-4 md:grid-cols-2"
        title={t.forms.postSale.title}
        description={t.forms.postSale.description}
        icon={<ShieldCheck className={salesModalIconClassName} />}
        footer={
          <>
            <Button variant="outline" className={postSaleModalActions.secondary} onClick={() => setIsCaseModalOpen(false)}>{t.common.cancel}</Button>
            <Button className={postSaleModalActions.primary} onClick={handleCreateCase}>
              <Plus className="h-4 w-4" />
              {t.forms.postSale.submit}
            </Button>
          </>
        }
      >
        <FilterSelect label={t.forms.postSale.client} value={caseForm.clientId} onValueChange={(value) => setCaseForm((current) => ({ ...current, clientId: value }))} options={contacts.map((contact) => ({ value: contact.id, label: `${contact.company} · ${contact.contactPerson}` }))} />
        <FilterSelect label={t.forms.postSale.opportunity} value={caseForm.relatedOpportunityId} onValueChange={(value) => setCaseForm((current) => ({ ...current, relatedOpportunityId: value }))} options={[{ value: 'none', label: t.common.none }, ...opportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName }))]} />
        <FilterSelect label={t.forms.postSale.quote} value={caseForm.lastQuoteId} onValueChange={(value) => setCaseForm((current) => ({ ...current, lastQuoteId: value }))} options={[{ value: 'none', label: t.common.none }, ...quotes.map((quote) => ({ value: quote.id, label: `${quote.quoteNumber} · ${quote.clientName}` }))]} />
        <FilterSelect label={t.forms.postSale.relationType} value={caseForm.relationType} onValueChange={(value) => setCaseForm((current) => ({ ...current, relationType: value as CustomerRelationType }))} options={customerRelationTypes.map((relationType) => ({ value: relationType, label: t.relationTypeLabels[relationType] }))} />
        <FilterSelect label={t.forms.postSale.postSaleType} value={caseForm.postSaleType} onValueChange={(value) => setCaseForm((current) => ({ ...current, postSaleType: value as PostSaleType }))} options={postSaleTypes.map((postSaleType) => ({ value: postSaleType, label: t.postSaleTypeLabels[postSaleType] }))} />
        <FilterSelect label={t.forms.postSale.status} value={caseForm.status} onValueChange={(value) => setCaseForm((current) => ({ ...current, status: value as PostSaleStatus }))} options={postSaleStatuses.map((status) => ({ value: status, label: t.statusLabels[status] }))} />
        <FilterSelect label={t.forms.postSale.owner} value={caseForm.owner} onValueChange={(value) => setCaseForm((current) => ({ ...current, owner: value }))} options={salesOwners.map((owner) => ({ value: owner, label: owner }))} />
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.postSale.lifetimeValue}</label>
          <Input type="number" value={caseForm.lifetimeValue} onChange={(event) => setCaseForm((current) => ({ ...current, lifetimeValue: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.postSale.lastPurchaseDate}</label>
          <Input type="date" value={caseForm.lastPurchaseDate} onChange={(event) => setCaseForm((current) => ({ ...current, lastPurchaseDate: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.postSale.nextFollowUpDate}</label>
          <Input type="date" value={caseForm.nextFollowUpDate} onChange={(event) => setCaseForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.postSale.renewalDate}</label>
          <Input type="date" value={caseForm.renewalDate} onChange={(event) => setCaseForm((current) => ({ ...current, renewalDate: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.postSale.nextAction}</label>
          <Input value={caseForm.nextAction} onChange={(event) => setCaseForm((current) => ({ ...current, nextAction: event.target.value }))} placeholder={t.forms.postSale.nextActionPlaceholder} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.postSale.notes}</label>
          <Textarea value={caseForm.notes} onChange={(event) => setCaseForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.forms.postSale.notesPlaceholder} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.postSale.files}</label>
          <Input value={caseForm.files} onChange={(event) => setCaseForm((current) => ({ ...current, files: event.target.value }))} placeholder={t.forms.postSale.filesPlaceholder} />
        </div>
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(automationCase)}
        onOpenChange={(open) => !open && setAutomationCase(null)}
        contentClassName="max-w-3xl"
        bodyClassName="space-y-4"
        title={t.forms.lost.title}
        description={t.forms.lost.description}
        icon={<CalendarPlus className={salesModalIconClassName} />}
        footer={
          <>
            <Button variant="outline" className={postSaleModalActions.secondary} onClick={() => setAutomationCase(null)}>{t.common.cancel}</Button>
            <Button className={postSaleModalActions.primary} onClick={handleCreateAutomatedOpportunity}>
              <CalendarPlus className="h-4 w-4" />
              {t.forms.lost.submit}
            </Button>
          </>
        }
      >
        <section className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B63B32]">{t.forms.lost.contextTitle}</p>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="font-black text-slate-950">{automationCase?.clientName}</p>
              <p className="mt-1 font-semibold text-slate-500">{automationCase?.contactPerson}</p>
            </div>
            <div>
              <p className="font-black text-slate-950">{automationCase?.lastPurchaseDate ?? t.common.notAvailable}</p>
              <p className="mt-1 font-semibold text-slate-500">{t.table.columns.lastPurchase}</p>
            </div>
            <div>
              <p className="font-black text-slate-950">{formatCurrency(automationCase?.sales[0]?.totalAmount ?? 0, automationCase?.sales[0]?.currency ?? getHistoryCurrency(automationCase))}</p>
              <p className="mt-1 font-semibold text-slate-500">{automationCase?.sales[0]?.saleNumber ?? t.common.notAvailable}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#B63B32]">{t.forms.lost.contextDescription}</p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <FilterSelect label={t.forms.lost.timing} value={automationForm.delay} onValueChange={handleAutomationDelayChange} options={[
            { value: '30', label: t.forms.lost.schedule30 },
            { value: '60', label: t.forms.lost.schedule60 },
            { value: '90', label: t.forms.lost.schedule90 },
            { value: '180', label: t.forms.lost.schedule180 },
            { value: 'custom', label: t.forms.lost.scheduleCustom },
          ]} />
          <FilterSelect label={t.forms.lost.owner} value={automationForm.owner} onValueChange={(value) => setAutomationForm((current) => ({ ...current, owner: value }))} options={salesOwners.map((owner) => ({ value: owner, label: owner }))} />
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.forms.lost.scheduledDate}</label>
            <Input type="date" value={automationForm.scheduledDate} onChange={(event) => setAutomationForm((current) => ({ ...current, delay: 'custom', scheduledDate: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.forms.lost.expectedCloseDate}</label>
            <Input type="date" value={automationForm.expectedCloseDate} onChange={(event) => setAutomationForm((current) => ({ ...current, expectedCloseDate: event.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700">{t.forms.lost.opportunityName}</label>
            <Input value={automationForm.opportunityName} onChange={(event) => setAutomationForm((current) => ({ ...current, opportunityName: event.target.value }))} placeholder={t.forms.lost.opportunityNamePlaceholder} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700">{t.forms.lost.notes}</label>
            <Textarea value={automationForm.notes} onChange={(event) => setAutomationForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.forms.lost.notesPlaceholder} />
          </div>
        </div>
        <div className="space-y-2">
          <p className="rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/10 p-3 text-sm font-semibold leading-6 text-[#177d66]">
            {t.forms.lost.backendReadyNote}
          </p>
        </div>
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(selectedFilesCase)}
        onOpenChange={(open) => !open && setSelectedFilesCase(null)}
        contentClassName="max-w-xl"
        bodyClassName="space-y-3"
        title={t.filesModal.title}
        description={t.filesModal.description}
        icon={<FileText className={salesModalIconClassName} />}
        footer={<Button className={postSaleModalActions.primary} onClick={() => setSelectedFilesCase(null)}>{t.common.close}</Button>}
      >
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{selectedFilesCase?.clientName}</p>
        {selectedFilesCase?.files.length ? selectedFilesCase.files.map((file) => (
          <div key={file} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <FileText className="h-4 w-4 text-[#B63B32] dark:text-[#FFB0AA]" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{file}</span>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            {t.filesModal.empty}
          </div>
        )}
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(futureOpportunityCase)}
        onOpenChange={(open) => !open && setFutureOpportunityCase(null)}
        tone="aqua"
        contentClassName="max-w-2xl"
        bodyClassName="space-y-4"
        title={t.forms.opportunity.title}
        description={t.forms.opportunity.description}
        icon={<Link2 className={salesModalIconClassName} />}
        footer={
          <>
            <Button variant="outline" className={futureOpportunityModalActions.secondary} onClick={() => setFutureOpportunityCase(null)}>{t.common.cancel}</Button>
            <Button className={futureOpportunityModalActions.primary} onClick={handleCreateFutureOpportunity}>
              <Sparkles className="h-4 w-4" />
              {t.forms.opportunity.submit}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.opportunityName}</label>
          <Input value={futureForm.opportunityName} onChange={(event) => setFutureForm((current) => ({ ...current, opportunityName: event.target.value }))} placeholder={t.forms.opportunity.opportunityNamePlaceholder} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.expectedCloseDate}</label>
            <Input type="date" value={futureForm.expectedCloseDate} onChange={(event) => setFutureForm((current) => ({ ...current, expectedCloseDate: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.nextActionDate}</label>
            <Input type="date" value={futureForm.nextActionDate} onChange={(event) => setFutureForm((current) => ({ ...current, nextActionDate: event.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.notes}</label>
          <Textarea value={futureForm.notes} onChange={(event) => setFutureForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.forms.opportunity.notesPlaceholder} />
        </div>
      </SalesModalFrame>
    </section>
  );
}
