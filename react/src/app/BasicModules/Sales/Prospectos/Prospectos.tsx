import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
import { useLanguage } from '../../../shared/context';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import {
  salesOwners,
  type OpportunityStage,
  type SalesOpportunity,
  useSalesCrm,
} from '../salesCrmContext';
import { salesApi } from '../salesApi';
import {
  fallbackOwnerValue,
  getOwnerUserCompanyIdFromValue,
  normalizeSalesOwnerOption,
  ownerOptionValue,
  type SalesOwnerOption,
} from '../utils/salesOwnerOptions';
import { normalizeTextKey } from '../utils/salesTextUtils';
import { useQuotesTranslations } from '../Cotizacion/translations';
import { SalesDetailModal } from '../Sales/components/SalesDetailModal';
import { useSalesRecords } from '../Sales/hooks/useSalesRecords';
import { useSalesTranslations } from '../Sales/hooks/useSalesTranslations';
import type { SalesCurrentSeller } from '../Sales/types/salesTypes';
import { inventoryApi } from '../Inventory/services/inventoryApi';
import type { InventoryWarehouse } from '../Inventory/types/inventoryTypes';
import { ProspectosHeader } from './components/ProspectosHeader';
import { ProspectosFilters } from './components/ProspectosFilters';
import { ProspectosKpiStrip } from './components/ProspectosKpiStrip';
import { ProspectosViewTabs } from './components/ProspectosViewTabs';
import { useProspectosFilters } from './hooks/useProspectosFilters';
import { useProspectosMetrics } from './hooks/useProspectosMetrics';
import { useProspectosViewState } from './hooks/useProspectosViewState';
import { ProspectosAgenda } from './agenda/ProspectosAgenda';
import { ProspectosKanban } from './kanban/ProspectosKanban';
import { CreateOpportunityModal } from './modals/CreateOpportunityModal';
import { OpportunityDeleteDialog } from './modals/OpportunityDeleteDialog';
import { OpportunityDetailModal } from './modals/OpportunityDetailModal';
import { OpportunityFilesModal } from './modals/OpportunityFilesModal';
import { ProspectosColumnsModal } from './table/ProspectosColumnsModal';
import { ProspectosTable } from './table/ProspectosTable';
import type {
  OpportunityColumnId,
  OpportunityFocusFilter,
  OpportunityFormState,
  OpportunityPeriodFilter,
} from './types/prospectosTypes';
import { canViewAllOpportunities, getContactById, getOwnerSelectValue } from './utils/prospectosFilters';
import {
  formatOpportunitySchedule,
  getOpportunityStatusForStage,
  getTodayInputValue,
  normalizeEstimatedValueInput,
  toEstimatedValueInputValue,
} from './utils/prospectosFormatters';
import { filterOpportunitiesForPeriodView, sortOpportunities } from './utils/prospectosMetrics';
import { initialOpportunityForm } from './utils/prospectosStatus';
import { useProspectosTranslations } from './hooks/useProspectosTranslations';

interface ProspectosProps {
  learningModeActive?: boolean;
}

export default function Prospectos({ learningModeActive = false }: ProspectosProps) {
  const { currentLanguage } = useLanguage();
  const t = useProspectosTranslations();
  const quoteCopy = useQuotesTranslations();
  const salesCopy = useSalesTranslations();
  const {
    contacts,
    opportunities,
    products,
    quotes,
    createContactRecord,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    updateQuoteStatus,
  } = useSalesCrm();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<SalesOpportunity | null>(null);
  const [filesOpportunity, setFilesOpportunity] = useState<SalesOpportunity | null>(null);
  const [historyOpportunity, setHistoryOpportunity] = useState<SalesOpportunity | null>(null);
  const [pendingDeleteOpportunity, setPendingDeleteOpportunity] = useState<SalesOpportunity | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<SalesOwnerOption[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [contextCurrentUserCompanyId, setContextCurrentUserCompanyId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusFilter, setFocusFilter] = useState<OpportunityFocusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<OpportunityPeriodFilter>('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
  const [form, setForm] = useState<OpportunityFormState>({
    ...initialOpportunityForm,
    contactId: contacts[0]?.id ?? '',
  });

  const {
    activeView,
    setActiveView,
    isColumnsModalOpen,
    setIsColumnsModalOpen,
    columns,
    setColumns,
    visibleColumns,
    columnWidths,
    tableMinWidth,
    sortState,
    handleSort,
    handleResizeColumn,
  } = useProspectosViewState();

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
        setCurrentUserName(sessionResult.value?.user.name ?? '');
        setCurrentUserRole(sessionResult.value?.user.role ?? null);
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

  useEffect(() => {
    let isMounted = true;
    void inventoryApi.loadWarehouses()
      .then((items) => { if (isMounted) setWarehouses(items); })
      .catch(() => { if (isMounted) setWarehouses([]); });
    return () => { isMounted = false; };
  }, []);

  const ownerSelectOptions = useMemo(() => {
    const companyOwnerOptions = ownerOptions.map((owner) => ({ value: ownerOptionValue(owner), label: owner.name }));
    const fallbackOwnerNames = [...salesOwners, ...contacts.map((contact) => contact.owner), ...opportunities.map((opportunity) => opportunity.owner)]
      .filter((owner, index, owners) => owner && owners.findIndex((candidate) => normalizeTextKey(candidate) === normalizeTextKey(owner)) === index);
    const fallbackOwnerOptions = fallbackOwnerNames
      .map((owner) => ({ value: fallbackOwnerValue(owner), label: owner }))
      .filter((option) => !companyOwnerOptions.some((owner) => normalizeTextKey(owner.label) === normalizeTextKey(option.label)));

    return [...companyOwnerOptions, ...fallbackOwnerOptions];
  }, [contacts, opportunities, ownerOptions]);

  const ownerNameByValue = useMemo(
    () => new Map(ownerSelectOptions.map((owner) => [owner.value, owner.label])),
    [ownerSelectOptions],
  );

  const formOwnerSelectOptions = useMemo(
    () => (
      form.ownerValue && form.owner && !ownerSelectOptions.some((owner) => owner.value === form.ownerValue)
        ? [{ value: form.ownerValue, label: `${form.owner} (${t.table.unlinkedOwner})` }, ...ownerSelectOptions]
        : ownerSelectOptions
    ),
    [form.owner, form.ownerValue, ownerSelectOptions, t.table.unlinkedOwner],
  );

  const localizedColumns = useMemo(
    () => columns.map((column) => {
      const columnCopy = t.columns[column.id as OpportunityColumnId];
      return columnCopy ? { ...column, label: columnCopy.label, description: columnCopy.description } : column;
    }),
    [columns, t.columns],
  );

  const localizedVisibleColumns = useMemo(
    () => visibleColumns.map((column) => {
      const columnCopy = t.columns[column.id as OpportunityColumnId];
      return columnCopy ? { ...column, label: columnCopy.label, description: columnCopy.description } : column;
    }),
    [t.columns, visibleColumns],
  );

  const currentUserCompanyId = useMemo(
    () => contextCurrentUserCompanyId ?? ownerOptions.find((owner) => owner.userId === currentUserId)?.userCompanyId ?? null,
    [contextCurrentUserCompanyId, currentUserId, ownerOptions],
  );

  const currentUserOwnerName = useMemo(
    () => ownerOptions.find((owner) => owner.userCompanyId === currentUserCompanyId)?.name ?? '',
    [currentUserCompanyId, ownerOptions],
  );
  const currentSeller = useMemo<SalesCurrentSeller | undefined>(() => {
    if (!currentUserCompanyId) return undefined;
    return {
      sellerId: String(currentUserId ?? currentUserCompanyId),
      sellerUserCompanyId: currentUserCompanyId,
      sellerName: currentUserOwnerName || currentUserName,
    };
  }, [currentUserCompanyId, currentUserId, currentUserName, currentUserOwnerName]);

  const currentOwnerNames = useMemo(
    () => [currentUserName, currentUserOwnerName].filter(Boolean),
    [currentUserName, currentUserOwnerName],
  );

  const canViewAllVisibleOpportunities = canViewAllOpportunities(currentUserRole);
  const shouldScopeOpportunitiesByOwner = currentUserRole !== null && !canViewAllVisibleOpportunities;
  const preferredPipelineCurrency = preferredCurrency;
  const {
    createSaleRecord,
    updateSaleRecord,
  } = useSalesRecords(preferredPipelineCurrency, exchangeRatesPerUsd);
  const defaultOwnerValue = currentUserCompanyId
    ? `user-company:${currentUserCompanyId}`
    : ownerSelectOptions[0]?.value ?? fallbackOwnerValue(initialOpportunityForm.owner);

  const resolveOpportunityOwnerValue = (opportunity: SalesOpportunity) => {
    if (opportunity.ownerUserCompanyId) {
      return `user-company:${opportunity.ownerUserCompanyId}`;
    }
    const matchedOwner = ownerOptions.find((owner) => normalizeTextKey(owner.name) === normalizeTextKey(opportunity.owner));
    return matchedOwner ? ownerOptionValue(matchedOwner) : getOwnerSelectValue(opportunity);
  };

  const filteredOpportunities = useProspectosFilters({
    opportunities,
    quotes,
    searchQuery,
    focusFilter,
    stageFilter,
    ownerFilter,
    temperatureFilter,
    sourceFilter,
    statusFilter,
    shouldScopeOpportunitiesByOwner,
    currentUserCompanyId,
    currentOwnerNames,
    resolveOpportunityOwnerValue,
  });

  const periodScopedOpportunities = useMemo(
    () => filterOpportunitiesForPeriodView(filteredOpportunities, periodFilter),
    [filteredOpportunities, periodFilter],
  );

  const tableOpportunities = useMemo(
    () => sortOpportunities(periodScopedOpportunities, sortState, quotes, preferredPipelineCurrency, exchangeRatesPerUsd),
    [exchangeRatesPerUsd, periodScopedOpportunities, preferredPipelineCurrency, quotes, sortState],
  );

  const metrics = useProspectosMetrics(
    filteredOpportunities,
    quotes,
    preferredPipelineCurrency,
    periodFilter,
    exchangeRatesPerUsd,
  );
  const showConvertedPipeline = metrics.pipelineQuoteCount > 0 && (
    metrics.hasMultiplePipelineCurrencies
    || metrics.pipelineCurrencyTotals.some((total) => total.currency !== preferredPipelineCurrency)
  );

  const getOwnerPayloadFromValue = (value: string) => {
    const userCompanyId = getOwnerUserCompanyIdFromValue(value);
    const ownerName = ownerNameByValue.get(value) ?? value.replace('name:', '');
    return {
      ownerUserCompanyId: userCompanyId,
      owner: ownerName || initialOpportunityForm.owner,
    };
  };

  useEffect(() => {
    if (form.ownerValue || ownerSelectOptions.length === 0 || editingOpportunity) {
      return;
    }
    const defaultOwnerPayload = getOwnerPayloadFromValue(defaultOwnerValue);
    setForm((current) => ({
      ...current,
      ownerValue: defaultOwnerValue,
      owner: defaultOwnerPayload.owner,
    }));
  }, [defaultOwnerValue, editingOpportunity, form.ownerValue, ownerSelectOptions.length]);

  const handleContactChange = (contactId: string) => {
    const contact = getContactById(contacts, contactId);
    if (!contact) return;
    const matchedOwner = ownerOptions.find((owner) => normalizeTextKey(owner.name) === normalizeTextKey(contact.owner));
    const ownerValue = contact.ownerUserCompanyId
      ? `user-company:${contact.ownerUserCompanyId}`
      : matchedOwner
        ? ownerOptionValue(matchedOwner)
        : ownerOptions.length > 0
          ? defaultOwnerValue
          : fallbackOwnerValue(contact.owner);
    setForm((current) => ({
      ...current,
      contactId,
      source: contact.source,
      ownerValue,
      owner: ownerNameByValue.get(ownerValue) ?? contact.owner,
      opportunityName: current.opportunityName || `${contact.company} opportunity`,
    }));
  };

  const resetOpportunityForm = () => {
    const defaultOwnerPayload = getOwnerPayloadFromValue(defaultOwnerValue);
    setForm({
      ...initialOpportunityForm,
      contactId: contacts[0]?.id ?? '',
      ownerValue: defaultOwnerValue,
      owner: defaultOwnerPayload.owner,
    });
  };

  const handleOpenCreateOpportunity = () => {
    setEditingOpportunity(null);
    resetOpportunityForm();
    setIsCreateOpen(true);
  };

  const handleOpenCreateQuote = () => {
    navigate('/sales/quotes?create=quote&returnTo=opportunities');
  };

  const handleOpenCreateSale = () => {
    setIsSaleModalOpen(true);
  };

  const handleOpenEditOpportunity = (opportunity: SalesOpportunity) => {
    setEditingOpportunity(opportunity);
    setForm({
      opportunityName: opportunity.opportunityName,
      contactId: opportunity.contactId,
      source: opportunity.source,
      stage: opportunity.stage,
      temperature: opportunity.temperature,
      ownerValue: resolveOpportunityOwnerValue(opportunity),
      owner: opportunity.owner,
      estimatedValue: toEstimatedValueInputValue(opportunity.estimatedValue),
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expectedCloseDate,
      nextAction: opportunity.nextAction,
      nextActionDate: opportunity.nextActionDate,
      lastContact: opportunity.lastContact,
      status: opportunity.status,
      notes: opportunity.notes,
      files: opportunity.files.join(', '),
    });
    setIsCreateOpen(true);
  };

  const withClosureDatePatch = (
    opportunity: SalesOpportunity,
    patch: Partial<Omit<SalesOpportunity, 'id'>>,
  ) => {
    const nextStage = patch.stage ?? opportunity.stage;
    const isClosingStage = nextStage === 'Won' || nextStage === 'Lost';
    const wasClosed = opportunity.stage === 'Won' || opportunity.stage === 'Lost';

    if (!isClosingStage || wasClosed || patch.lastContact) {
      return patch;
    }

    return {
      ...patch,
      lastContact: getTodayInputValue(),
    };
  };

  const handleUpdateOpportunity = (
    opportunityId: string,
    patch: Partial<Omit<SalesOpportunity, 'id'>>,
  ) => {
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    updateOpportunity(opportunityId, opportunity ? withClosureDatePatch(opportunity, patch) : patch);
  };

  const handleDeleteOpportunity = (opportunity: SalesOpportunity) => {
    setPendingDeleteOpportunity(opportunity);
  };

  const handleConfirmDeleteOpportunity = () => {
    if (!pendingDeleteOpportunity) {
      return;
    }

    deleteOpportunity(pendingDeleteOpportunity.id);
    if (editingOpportunity?.id === pendingDeleteOpportunity.id) {
      setEditingOpportunity(null);
      setIsCreateOpen(false);
    }
    if (filesOpportunity?.id === pendingDeleteOpportunity.id) {
      setFilesOpportunity(null);
    }
    if (historyOpportunity?.id === pendingDeleteOpportunity.id) {
      setHistoryOpportunity(null);
    }
    setPendingDeleteOpportunity(null);
  };

  const handleOpportunityModalOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setEditingOpportunity(null);
      resetOpportunityForm();
    }
  };

  const handleSaveOpportunity = () => {
    const contact = getContactById(contacts, form.contactId);
    if (!contact || !form.opportunityName.trim()) return;
    const ownerPayload = getOwnerPayloadFromValue(form.ownerValue);
    const closesOpportunity = form.stage === 'Won' || form.stage === 'Lost';
    const isClosingTransition = closesOpportunity && (!editingOpportunity || !['Won', 'Lost'].includes(editingOpportunity.stage));

    const opportunityPayload = {
      opportunityName: form.opportunityName.trim(),
      contactId: contact.id,
      company: contact.company,
      contactPerson: contact.contactPerson,
      phone: contact.phone,
      email: contact.email,
      source: form.source,
      stage: form.stage,
      temperature: form.temperature,
      ownerUserCompanyId: ownerPayload.ownerUserCompanyId,
      owner: ownerPayload.owner,
      estimatedValue: normalizeEstimatedValueInput(form.estimatedValue) || '0',
      probability: form.probability,
      expectedCloseDate: form.expectedCloseDate,
      nextAction: form.nextAction,
      nextActionDate: form.nextActionDate,
      lastContact: isClosingTransition ? getTodayInputValue() : form.lastContact,
      files: form.files.split(',').map((file) => file.trim()).filter(Boolean),
      status: getOpportunityStatusForStage(form.stage, form.status),
      notes: form.notes.trim(),
    };

    if (editingOpportunity) {
      updateOpportunity(editingOpportunity.id, opportunityPayload);
    } else {
      addOpportunity(opportunityPayload);
    }

    handleOpportunityModalOpenChange(false);
  };

  const handleScheduleChange = (opportunity: SalesOpportunity, date: string, time: string) => {
    updateOpportunity(opportunity.id, { nextActionDate: formatOpportunitySchedule(date, time) });
  };

  const handleKanbanStageChange = (opportunity: SalesOpportunity, stage: OpportunityStage) => {
    handleUpdateOpportunity(opportunity.id, {
      stage,
      status: getOpportunityStatusForStage(stage, opportunity.status),
    });
  };

  const pendingDeleteQuotesCount = pendingDeleteOpportunity
    ? quotes.filter((quote) => quote.opportunityId === pendingDeleteOpportunity.id).length
    : 0;
  const pendingDeleteDescription = pendingDeleteOpportunity
    ? pendingDeleteQuotesCount > 0
      ? t.deleteConfirm.withQuotes(pendingDeleteOpportunity.opportunityName, pendingDeleteQuotesCount)
      : t.deleteConfirm.simple(pendingDeleteOpportunity.opportunityName)
    : '';

  return (
    <section className="space-y-5">
      <ProspectosHeader
        copy={t.header}
        onOpenColumns={() => setIsColumnsModalOpen(true)}
        onCreateSale={handleOpenCreateSale}
        onCreateQuote={handleOpenCreateQuote}
        onCreateOpportunity={handleOpenCreateOpportunity}
      />

      <ProspectosViewTabs labels={t.views} activeView={activeView} onViewChange={setActiveView} />

      <ProspectosFilters
        copy={t}
        searchQuery={searchQuery}
        focusFilter={focusFilter}
        periodFilter={periodFilter}
        stageFilter={stageFilter}
        ownerFilter={ownerFilter}
        temperatureFilter={temperatureFilter}
        sourceFilter={sourceFilter}
        statusFilter={statusFilter}
        ownerSelectOptions={ownerSelectOptions}
        onSearchChange={setSearchQuery}
        onFocusFilterChange={setFocusFilter}
        onPeriodFilterChange={setPeriodFilter}
        onStageFilterChange={setStageFilter}
        onOwnerFilterChange={setOwnerFilter}
        onTemperatureFilterChange={setTemperatureFilter}
        onSourceFilterChange={setSourceFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {!learningModeActive ? <ProspectosKpiStrip
        copy={t}
        visibleCount={metrics.visibleCount}
        openCount={metrics.openCount}
        hotCount={metrics.hotCount}
        weightedProbability={metrics.weightedProbability}
        proposalCount={metrics.proposalCount}
        scheduledCount={metrics.scheduledCount}
        unscheduledCount={metrics.unscheduledCount}
        overdueCount={metrics.overdueCount}
        periodFilter={metrics.periodFilter}
        periodClosedCount={metrics.periodClosedCount}
        periodWonCount={metrics.periodWonCount}
        periodLostCount={metrics.periodLostCount}
        periodWonValueLabel={metrics.periodWonValueLabel}
        periodWonConvertedLabel={metrics.periodWonConvertedLabel}
        periodLostValueLabel={metrics.periodLostValueLabel}
        periodLostConvertedLabel={metrics.periodLostConvertedLabel}
        periodConversionRate={metrics.periodConversionRate}
        formattedPipelineValue={metrics.formattedPipelineValue}
        convertedPipelineLabel={metrics.convertedPipelineLabel}
        showConvertedPipeline={showConvertedPipeline}
        pipelineExchangeRateDate={metrics.pipelineExchangeRateDate}
        stageCounts={metrics.stageCounts}
      /> : null}

      {activeView === 'table' ? (
        <ProspectosTable
          copy={t}
          opportunities={tableOpportunities}
          quotes={quotes}
          visibleColumns={localizedVisibleColumns}
          columnWidths={columnWidths}
          exchangeRatesPerUsd={exchangeRatesPerUsd}
          preferredCurrency={preferredPipelineCurrency}
          tableMinWidth={tableMinWidth}
          sortState={sortState}
          ownerSelectOptions={ownerSelectOptions}
          resolveOpportunityOwnerValue={resolveOpportunityOwnerValue}
          getOwnerPayloadFromValue={getOwnerPayloadFromValue}
          onSort={handleSort}
          onUpdateOpportunity={handleUpdateOpportunity}
          onOpenFiles={setFilesOpportunity}
          onOpenHistory={setHistoryOpportunity}
          onEdit={handleOpenEditOpportunity}
          onDelete={handleDeleteOpportunity}
          onScheduleChange={handleScheduleChange}
          onResizeColumn={handleResizeColumn}
        />
      ) : null}

      {activeView === 'kanban' ? (
        <ProspectosKanban
          copy={t}
          opportunities={periodScopedOpportunities}
          onOpenFiles={setFilesOpportunity}
          onOpenHistory={setHistoryOpportunity}
          onEdit={handleOpenEditOpportunity}
          onStageChange={handleKanbanStageChange}
        />
      ) : null}

      {activeView === 'agenda' ? (
        <ProspectosAgenda
          copy={t}
          opportunities={periodScopedOpportunities}
          onOpenFiles={setFilesOpportunity}
          onOpenHistory={setHistoryOpportunity}
          onEdit={handleOpenEditOpportunity}
          onScheduleChange={handleScheduleChange}
        />
      ) : null}

      <ProspectosColumnsModal
        copy={t}
        isOpen={isColumnsModalOpen}
        columns={localizedColumns}
        onClose={() => setIsColumnsModalOpen(false)}
        onSave={setColumns}
      />

      <OpportunityDetailModal
        copy={t.detailModal}
        opportunity={historyOpportunity}
        onClose={() => setHistoryOpportunity(null)}
      />

      <CreateOpportunityModal
        copy={{ ...t.modal, options: t.options }}
        isOpen={isCreateOpen}
        editingOpportunity={editingOpportunity}
        form={form}
        contacts={contacts}
        formOwnerSelectOptions={formOwnerSelectOptions}
        defaultOwnerValue={defaultOwnerValue}
        setForm={setForm}
        onContactChange={handleContactChange}
        getOwnerPayloadFromValue={getOwnerPayloadFromValue}
        onOpenChange={handleOpportunityModalOpenChange}
        onSave={handleSaveOpportunity}
      />

      <OpportunityFilesModal
        copy={t.filesModal}
        contact={filesOpportunity ? getContactById(contacts, filesOpportunity.contactId) : null}
        locale={currentLanguage.code}
        opportunity={filesOpportunity}
        quoteCopy={quoteCopy}
        quotes={quotes}
        onClose={() => setFilesOpportunity(null)}
      />

      <SalesDetailModal
        open={isSaleModalOpen}
        record={null}
        quotes={quotes}
        products={products}
        warehouses={warehouses}
        currentSeller={currentSeller}
        contacts={contacts}
        opportunities={opportunities}
        t={salesCopy}
        onOpenChange={setIsSaleModalOpen}
        onCreateCustomer={createContactRecord}
        onCreate={createSaleRecord}
        onUpdate={updateSaleRecord}
        onQuoteConverted={(quoteId, opportunityId) => {
          const convertedQuote = quotes.find((quote) => quote.id === quoteId);
          updateQuoteStatus(quoteId, 'Closed Won');
          if (opportunityId) {
            handleUpdateOpportunity(opportunityId, {
              stage: 'Won',
              status: 'Closed',
              probability: '100%',
              ...(convertedQuote ? {
                estimatedValue: String(convertedQuote.total),
                currency: convertedQuote.currency,
              } : {}),
            });
          }
        }}
      />

      <OpportunityDeleteDialog
        copy={t.deleteConfirm}
        description={pendingDeleteDescription}
        opportunity={pendingDeleteOpportunity}
        onConfirm={handleConfirmDeleteOpportunity}
        onCancel={() => setPendingDeleteOpportunity(null)}
      />
    </section>
  );
}
