import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../../../api/auth';
import { useLanguage } from '../../../shared/context';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useKpiMonetaryAggregates } from '../../shared/kpiMonetaryApi';
import { formatBusinessCurrencyAmount } from '../../shared/businessCurrency';
import {
  defaultOpportunityFlowStages,
  type OpportunityFlow,
  type OpportunityFlowPosition,
  type OpportunityFlowStage,
  type OpportunityStage,
  type SalesContact,
  type SalesOpportunity,
  type SalesQuote,
  useSalesCrm,
} from '../salesCrmContext';
import { salesApi } from '../salesApi';
import {
  toBackendOpportunityStageKey,
  toFrontendOpportunityFlowStage,
  toFrontendOpportunityStageKey,
} from '../adapters/salesApiAdapters';
import {
  fallbackOwnerValue,
  getOwnerUserCompanyIdFromValue,
  normalizeSalesOwnerOption,
  ownerOptionValue,
  type SalesOwnerOption,
} from '../utils/salesOwnerOptions';
import { normalizeTextKey } from '../utils/salesTextUtils';
import { useQuotesTranslations } from '../Cotizacion/translations';
import { downloadQuotePdf } from '../Cotizacion/quotePdf';
import { SalesDetailModal } from '../Sales/components/SalesDetailModal';
import { useSalesRecords } from '../Sales/hooks/useSalesRecords';
import { useSalesTranslations } from '../Sales/hooks/useSalesTranslations';
import type { SaleRecord, SalesCurrentSeller } from '../Sales/types/salesTypes';
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
import { OpportunityFlowManagerModal } from './modals/OpportunityFlowManagerModal';
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
import {
  getOpportunityStageConfig,
  getOpportunityStageLabelByKey,
} from './utils/prospectosFlow';
import { useProspectosTranslations } from './hooks/useProspectosTranslations';
import { useWorkspaceNavigationMemory } from '../../../hooks/useWorkspaceNavigationMemory';

interface ProspectosProps {
  learningModeActive?: boolean;
}

type ProspectosWorkspaceState = {
  searchQuery: string;
  focusFilter: OpportunityFocusFilter;
  periodFilter: OpportunityPeriodFilter;
  stageFilter: string;
  ownerFilter: string;
  temperatureFilter: string;
  sourceFilter: string;
  activeView: 'table' | 'kanban' | 'agenda';
  sortColumn: OpportunityColumnId;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
};

const prospectosWorkspaceDefaults: ProspectosWorkspaceState = {
  searchQuery: '',
  focusFilter: 'all',
  periodFilter: 'all',
  stageFilter: 'all',
  ownerFilter: 'all',
  temperatureFilter: 'all',
  sourceFilter: 'all',
  activeView: 'table',
  sortColumn: 'opportunity',
  sortDirection: 'asc',
  currentPage: 1,
  pageSize: 10,
};

const prospectosWorkspaceUrlFields: Partial<Record<keyof ProspectosWorkspaceState, string>> = {
  searchQuery: 'q', focusFilter: 'focus', periodFilter: 'period', stageFilter: 'stage',
  ownerFilter: 'owner', temperatureFilter: 'temperature', sourceFilter: 'source',
  activeView: 'view', sortColumn: 'sort', sortDirection: 'direction',
  currentPage: 'page', pageSize: 'pageSize',
};

export default function Prospectos({ learningModeActive = false }: ProspectosProps) {
  const { currentLanguage } = useLanguage();
  const t = useProspectosTranslations();
  const quoteCopy = useQuotesTranslations();
  const salesCopy = useSalesTranslations();
  const {
    contacts,
    opportunities: storedOpportunities,
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
  const [isFlowManagerOpen, setIsFlowManagerOpen] = useState(false);
  const [opportunityFlows, setOpportunityFlows] = useState<OpportunityFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [flowPositions, setFlowPositions] = useState<OpportunityFlowPosition[]>([]);
  const [flowCanManage, setFlowCanManage] = useState(false);
  const [flowLoadError, setFlowLoadError] = useState('');
  const [flowReloadVersion, setFlowReloadVersion] = useState(0);
  const flowPositionRequestId = useRef(0);
  const [pendingWonTransition, setPendingWonTransition] = useState<{
    opportunity: SalesOpportunity;
    patch: Partial<Omit<SalesOpportunity, 'id'>>;
  } | null>(null);
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
  const [paginationState, setPaginationState] = useState({ currentPage: 1, pageSize: 10 });
  const { exchangeRateMetadata, preferredCurrency } = usePreferredBusinessCurrency();
  const [form, setForm] = useState<OpportunityFormState>({
    ...initialOpportunityForm,
    contactId: '',
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
    setSortState,
    handleSort,
    handleResizeColumn,
  } = useProspectosViewState();

  const workspaceState = useMemo<ProspectosWorkspaceState>(() => ({
    searchQuery, focusFilter, periodFilter, stageFilter, ownerFilter, temperatureFilter,
    sourceFilter, activeView, sortColumn: sortState.columnId,
    sortDirection: sortState.direction, ...paginationState,
  }), [
    activeView, focusFilter, ownerFilter, paginationState, periodFilter, searchQuery,
    sortState, sourceFilter, stageFilter, temperatureFilter,
  ]);

  useWorkspaceNavigationMemory({
    moduleKey: 'sales',
    tabKey: 'prospects',
    state: workspaceState,
    defaults: prospectosWorkspaceDefaults,
    urlFields: prospectosWorkspaceUrlFields,
    onRestore: (restored) => {
      setSearchQuery(restored.searchQuery);
      setFocusFilter(restored.focusFilter);
      setPeriodFilter(restored.periodFilter);
      setStageFilter(restored.stageFilter);
      setOwnerFilter(restored.ownerFilter);
      setTemperatureFilter(restored.temperatureFilter);
      setSourceFilter(restored.sourceFilter);
      setActiveView(restored.activeView);
      setSortState({ columnId: restored.sortColumn, direction: restored.sortDirection });
      setPaginationState({ currentPage: restored.currentPage, pageSize: restored.pageSize });
    },
  });

  const resetPage = () => setPaginationState((current) => ({ ...current, currentPage: 1 }));
  const changeFilter = <Value,>(setter: (value: Value) => void) => (value: Value) => {
    setter(value);
    resetPage();
  };
  const handleClearFilters = () => {
    setSearchQuery('');
    setFocusFilter('all');
    setPeriodFilter('all');
    setStageFilter('all');
    setOwnerFilter('all');
    setTemperatureFilter('all');
    setSourceFilter('all');
    resetPage();
  };

  useEffect(() => {
    let isMounted = true;

    const loadSalesOwners = async () => {
      const [sessionResult, salesContextResult] = await Promise.allSettled([
        authApi.getSessionOrNull(),
        salesApi.context(),
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

      salesContextOwners.forEach((user) => {
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
    void salesApi.getOpportunityFlows()
      .then((response) => {
        if (!isMounted) return;
        const flows = response.flows.map((flow): OpportunityFlow => ({
          ...flow,
          stages: flow.stages.map((stage) => toFrontendOpportunityFlowStage(stage, flow.factory)),
        }));
        setOpportunityFlows(flows);
        setSelectedFlowId((current) => (
          current !== null && flows.some((flow) => flow.id === current) ? current : response.defaultFlowId
        ));
        setFlowCanManage(response.canManage);
        setFlowLoadError('');
      })
      .catch(() => {
        if (!isMounted) return;
        setOpportunityFlows([{
          id: -1,
          key: 'factory',
          name: t.flow.factory,
          factory: true,
          defaultFlow: true,
          stages: defaultOpportunityFlowStages,
        }]);
        setSelectedFlowId(-1);
        setFlowCanManage(false);
        setFlowLoadError(t.flow.loadError);
      });
    return () => {
      isMounted = false;
    };
  }, [flowReloadVersion, isFlowManagerOpen, t.flow.factory, t.flow.loadError]);

  const opportunityBackendSignature = useMemo(
    () => storedOpportunities.map((opportunity) => opportunity.backendId).filter(Boolean).join(','),
    [storedOpportunities],
  );

  useEffect(() => {
    let isMounted = true;
    const requestId = flowPositionRequestId.current + 1;
    flowPositionRequestId.current = requestId;
    if (selectedFlowId === null || selectedFlowId < 0) {
      setFlowPositions([]);
      return () => { isMounted = false; };
    }
    void salesApi.getOpportunityFlowPositions(selectedFlowId)
      .then((response) => {
        if (!isMounted || flowPositionRequestId.current !== requestId) return;
        setFlowPositions(response.positions.map((position) => ({
          ...position,
          stageKey: toFrontendOpportunityStageKey(position.stageKey),
        })));
      })
      .catch(() => {
        if (isMounted) setFlowLoadError(t.flow.loadError);
      });
    return () => { isMounted = false; };
  }, [opportunityBackendSignature, selectedFlowId, t.flow.loadError]);

  useEffect(() => {
    let isMounted = true;
    void inventoryApi.loadWarehouses()
      .then((items) => { if (isMounted) setWarehouses(items); })
      .catch(() => { if (isMounted) setWarehouses([]); });
    return () => { isMounted = false; };
  }, []);

  const selectedFlow = useMemo(
    () => opportunityFlows.find((flow) => flow.id === selectedFlowId) ?? opportunityFlows[0] ?? null,
    [opportunityFlows, selectedFlowId],
  );
  const flowStages = selectedFlow?.stages ?? defaultOpportunityFlowStages;
  const opportunities = useMemo(() => {
    const positionsByOpportunity = new Map(
      flowPositions.map((position) => [position.opportunityId, position]),
    );
    const wonStage = flowStages.find((stage) => stage.type === 'WON');
    const lostStage = flowStages.find((stage) => stage.type === 'LOST');

    return storedOpportunities.map((opportunity) => {
      const inferredLifecycle = opportunity.lifecycleStatus
        ?? (opportunity.stage === 'Won' ? 'WON' : opportunity.stage === 'Lost' ? 'LOST' : 'OPEN');
      const terminalStage = inferredLifecycle === 'WON' ? wonStage : inferredLifecycle === 'LOST' ? lostStage : null;
      const position = opportunity.backendId === undefined
        ? undefined
        : positionsByOpportunity.get(opportunity.backendId);
      const stage = terminalStage?.key ?? position?.stageKey ?? opportunity.stage;
      const stageConfig = flowStages.find((item) => item.key === stage);
      const probabilityPercent = terminalStage?.defaultProbabilityPercent
        ?? position?.probabilityPercent
        ?? Number.parseInt(opportunity.probability.replace('%', ''), 10);
      return {
        ...opportunity,
        flowId: selectedFlow?.id,
        lifecycleStatus: inferredLifecycle,
        stage,
        probability: `${Number.isFinite(probabilityPercent) ? probabilityPercent : stageConfig?.defaultProbabilityPercent ?? 0}%`,
      };
    });
  }, [flowPositions, flowStages, selectedFlow?.id, storedOpportunities]);

  const ownerSelectOptions = useMemo(() => {
    return ownerOptions.map((owner) => ({ value: ownerOptionValue(owner), label: owner.name }));
  }, [ownerOptions]);

  const ownerFilterSelectOptions = useMemo(() => {
    const historicalOwnerNames = opportunities.map((opportunity) => opportunity.owner)
      .filter((owner, index, owners) => owner && owners.findIndex((candidate) => normalizeTextKey(candidate) === normalizeTextKey(owner)) === index);
    const historicalOwnerOptions = historicalOwnerNames
      .map((owner) => ({ value: fallbackOwnerValue(owner), label: owner }))
      .filter((option) => !ownerSelectOptions.some((owner) => normalizeTextKey(owner.label) === normalizeTextKey(option.label)));

    return [...ownerSelectOptions, ...historicalOwnerOptions];
  }, [opportunities, ownerSelectOptions]);

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
  const canManageOpportunityFlow = flowCanManage;
  const shouldScopeOpportunitiesByOwner = currentUserRole !== null && !canViewAllVisibleOpportunities;
  const opportunityFlowStages = useMemo(() => flowStages.map((stage) => ({
    ...stage,
    opportunityCount: opportunities.filter(
      (opportunity) => opportunity.stage.trim().toLowerCase() === stage.key.trim().toLowerCase(),
    ).length,
  })), [flowStages, opportunities]);
  const opportunityFlowsWithCurrentCounts = useMemo(
    () => opportunityFlows.map((flow) => (
      flow.id === selectedFlowId ? { ...flow, stages: opportunityFlowStages } : flow
    )),
    [opportunityFlowStages, opportunityFlows, selectedFlowId],
  );
  const preferredPipelineCurrency = preferredCurrency;
  const {
    createSaleRecord,
    updateSaleRecord,
  } = useSalesRecords(preferredPipelineCurrency);
  const defaultOwnerValue = currentUserCompanyId
    ? `user-company:${currentUserCompanyId}`
    : ownerSelectOptions[0]?.value ?? '';

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
    ownerFilter: canViewAllVisibleOpportunities ? ownerFilter : 'all',
    temperatureFilter,
    sourceFilter,
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
    () => sortOpportunities(
      periodScopedOpportunities,
      sortState,
      quotes,
      opportunityFlowStages.map((stage) => stage.key),
    ),
    [opportunityFlowStages, periodScopedOpportunities, quotes, sortState],
  );

  const metrics = useProspectosMetrics(
    filteredOpportunities,
    quotes,
    preferredPipelineCurrency,
    periodFilter,
    opportunityFlowStages,
  );
  const opportunityAggregateQueries = useMemo(() => {
    const ids = (items: SalesOpportunity[]) => items
      .map((item) => item.backendId)
      .filter((id): id is number => Boolean(id));
    return [
      {
        key: 'pipeline',
        metric: 'SALES_OPPORTUNITY_PIPELINE' as const,
        preferredCurrency: preferredPipelineCurrency,
        ids: ids(filteredOpportunities.filter((item) => !['Won', 'Lost'].includes(item.stage))),
      },
      {
        key: 'won',
        metric: 'SALES_OPPORTUNITY_WON' as const,
        preferredCurrency: preferredPipelineCurrency,
        ids: ids(periodScopedOpportunities.filter((item) => item.stage === 'Won')),
      },
      {
        key: 'lost',
        metric: 'SALES_OPPORTUNITY_LOST' as const,
        preferredCurrency: preferredPipelineCurrency,
        ids: ids(periodScopedOpportunities.filter((item) => item.stage === 'Lost')),
      },
    ];
  }, [filteredOpportunities, periodScopedOpportunities, preferredPipelineCurrency]);
  const { data: opportunityMoney, error: opportunityMoneyError } = useKpiMonetaryAggregates(opportunityAggregateQueries);
  const pipelineNativeBreakdown = opportunityMoney.pipeline?.nativeTotals
    .map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency))
    .join(' / ') ?? '';
  const pipelinePreferredLabel = opportunityMoneyError
    ? 'No disponible'
    : formatBusinessCurrencyAmount(opportunityMoney.pipeline?.preferredTotal ?? 0, preferredPipelineCurrency);

  const getOwnerPayloadFromValue = (value: string) => {
    const userCompanyId = getOwnerUserCompanyIdFromValue(value);
    const ownerName = ownerNameByValue.get(value)
      ?? (value.startsWith('name:') ? value.replace('name:', '') : '');
    return {
      ownerUserCompanyId: userCompanyId,
      owner: ownerName,
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

  const handleContactChange = (contactId: string, createdContact?: SalesContact) => {
    const contact = createdContact ?? getContactById(contacts, contactId);
    if (!contact) return;
    const matchedOwner = ownerOptions.find((owner) => normalizeTextKey(owner.name) === normalizeTextKey(contact.owner));
    const ownerValue = contact.ownerUserCompanyId
      ? `user-company:${contact.ownerUserCompanyId}`
      : matchedOwner
        ? ownerOptionValue(matchedOwner)
        : ownerOptions.length > 0
          ? defaultOwnerValue
          : '';
    setForm((current) => ({
      ...current,
      contactId,
      source: contact.source,
      ownerValue,
      owner: ownerNameByValue.get(ownerValue) ?? '',
      opportunityName: current.opportunityName || `${contact.company} opportunity`,
    }));
  };

  const resetOpportunityForm = () => {
    const defaultOwnerPayload = getOwnerPayloadFromValue(defaultOwnerValue);
    const initialStage = opportunityFlowStages.find((stage) => stage.type === 'OPEN')?.key ?? initialOpportunityForm.stage;
    setForm({
      ...initialOpportunityForm,
      stage: initialStage,
      contactId: '',
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
    setPendingWonTransition(null);
    setIsSaleModalOpen(true);
  };

  const handleSendToCredit = (record: SaleRecord) => {
    updateSaleRecord(record.id, {
      commercialStatus: record.commercialStatus === 'pending_validation' ? 'approved' : record.commercialStatus,
      financeStatus: 'pending',
      paymentMethod: 'credit',
    });
    const candidateSaleId = record.backendId ? `sales:${record.backendId}` : record.id;
    navigate(`/receivables/credit-sales?candidateSaleId=${encodeURIComponent(candidateSaleId)}&openCreditSale=1`);
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

  const commitOpportunityUpdate = (
    opportunityId: string,
    patch: Partial<Omit<SalesOpportunity, 'id'>>,
  ) => {
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    const datedPatch = opportunity ? withClosureDatePatch(opportunity, patch) : patch;
    const nextStage = datedPatch.stage ?? opportunity?.stage;
    const stageConfig = nextStage ? getOpportunityStageConfig(opportunityFlowStages, nextStage) : undefined;
    const nextPatch = {
      ...datedPatch,
      ...(selectedFlowId !== null && selectedFlowId > 0 ? { flowId: selectedFlowId } : {}),
      ...(nextStage ? {
        stage: nextStage,
        probability: datedPatch.probability
          ?? (stageConfig ? `${stageConfig.defaultProbabilityPercent}%` : opportunity?.probability),
        lifecycleStatus: stageConfig?.type ?? opportunity?.lifecycleStatus,
      } : {}),
    };
    updateOpportunity(opportunityId, nextPatch);
    if (opportunity?.backendId !== undefined && nextStage && stageConfig) {
      setFlowPositions((current) => {
        const nextPosition = {
          opportunityId: opportunity.backendId as number,
          stageKey: nextStage,
          probabilityPercent: stageConfig.defaultProbabilityPercent,
        };
        return current.some((position) => position.opportunityId === opportunity.backendId)
          ? current.map((position) => (position.opportunityId === opportunity.backendId ? nextPosition : position))
          : [...current, nextPosition];
      });
    }
  };

  const handleUpdateOpportunity = (
    opportunityId: string,
    patch: Partial<Omit<SalesOpportunity, 'id'>>,
  ) => {
    const opportunity = opportunities.find((item) => item.id === opportunityId);

    if (opportunity && patch.stage === 'Won' && opportunity.stage !== 'Won') {
      setPendingWonTransition({ opportunity, patch });
      setIsSaleModalOpen(true);
      return;
    }

    commitOpportunityUpdate(opportunityId, patch);
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
    if (!ownerPayload.ownerUserCompanyId) return;
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
      flowId: selectedFlowId !== null && selectedFlowId > 0 ? selectedFlowId : undefined,
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
      handleUpdateOpportunity(editingOpportunity.id, opportunityPayload);
    } else {
      addOpportunity(opportunityPayload);
    }

    handleOpportunityModalOpenChange(false);
  };

  const handleScheduleChange = (opportunity: SalesOpportunity, date: string, time: string) => {
    commitOpportunityUpdate(opportunity.id, { nextActionDate: formatOpportunitySchedule(date, time) });
  };

  const handleDownloadQuote = (opportunity: SalesOpportunity, quote: SalesQuote) => {
    downloadQuotePdf({
      quote,
      contact: contacts.find((contact) => contact.id === opportunity.contactId) ?? null,
      opportunity,
      copy: quoteCopy,
      locale: currentLanguage.code,
    });
  };

  const opportunityFlowPayload = (stages: OpportunityFlowStage[]) => stages.map((stage) => ({
      key: stage.key.startsWith('__draft_') ? undefined : toBackendOpportunityStageKey(stage.key),
      label: stage.label,
      colorToken: stage.colorToken,
      defaultProbabilityPercent: stage.defaultProbabilityPercent,
    }));

  const toOpportunityFlow = (flow: Awaited<ReturnType<typeof salesApi.createOpportunityFlow>>): OpportunityFlow => ({
    ...flow,
    stages: flow.stages.map((stage) => toFrontendOpportunityFlowStage(stage, flow.factory)),
  });

  const handleCreateOpportunityFlow = async (name: string, stages: OpportunityFlowStage[]) => {
    const savedFlow = toOpportunityFlow(await salesApi.createOpportunityFlow(name, opportunityFlowPayload(stages)));
    setOpportunityFlows((current) => [...current, savedFlow]);
    setFlowLoadError('');
    return savedFlow;
  };

  const handleUpdateOpportunityFlow = async (flowId: number, name: string, stages: OpportunityFlowStage[]) => {
    const savedFlow = toOpportunityFlow(await salesApi.updateOpportunityFlow(
      flowId,
      name,
      opportunityFlowPayload(stages),
    ));
    setOpportunityFlows((current) => current.map((flow) => (flow.id === flowId ? savedFlow : flow)));
    setFlowLoadError('');
    if (flowId === selectedFlowId && stageFilter !== 'all'
      && !savedFlow.stages.some((stage) => stage.key === stageFilter)) {
      setStageFilter('all');
      resetPage();
    }
    return savedFlow;
  };

  const handleSelectOpportunityFlow = async (flowId: number) => {
    if (flowId < 0) {
      setFlowPositions([]);
      setSelectedFlowId(flowId);
      return;
    }
    const requestId = flowPositionRequestId.current + 1;
    flowPositionRequestId.current = requestId;
    try {
      const response = await salesApi.getOpportunityFlowPositions(flowId);
      if (flowPositionRequestId.current !== requestId) return;
      setFlowPositions(response.positions.map((position) => ({
        ...position,
        stageKey: toFrontendOpportunityStageKey(position.stageKey),
      })));
      setSelectedFlowId(flowId);
      setStageFilter('all');
      resetPage();
      setFlowLoadError('');
    } catch {
      if (flowPositionRequestId.current === requestId) setFlowLoadError(t.flow.loadError);
    }
  };

  const handleKanbanStageChange = (opportunity: SalesOpportunity, stage: OpportunityStage) => {
    const stageConfig = getOpportunityStageConfig(opportunityFlowStages, stage);
    handleUpdateOpportunity(opportunity.id, {
      stage,
      status: getOpportunityStatusForStage(stage, opportunity.status),
      probability: stageConfig ? `${stageConfig.defaultProbabilityPercent}%` : opportunity.probability,
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
        flows={opportunityFlows}
        selectedFlowId={selectedFlowId}
        activeFlowLabel={t.flow.selectFlow}
        factoryLabel={t.flow.factory}
        onSelectFlow={handleSelectOpportunityFlow}
        onManageFlow={() => setIsFlowManagerOpen(true)}
        onOpenColumns={() => setIsColumnsModalOpen(true)}
        onCreateSale={handleOpenCreateSale}
        onCreateQuote={handleOpenCreateQuote}
        onCreateOpportunity={handleOpenCreateOpportunity}
      />

      {flowLoadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {flowLoadError}
        </div>
      ) : null}

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
        stages={opportunityFlowStages}
        showOwnerFilter={canViewAllVisibleOpportunities}
        ownerSelectOptions={ownerFilterSelectOptions}
        onSearchChange={changeFilter(setSearchQuery)}
        onFocusFilterChange={changeFilter(setFocusFilter)}
        onPeriodFilterChange={changeFilter(setPeriodFilter)}
        onStageFilterChange={changeFilter(setStageFilter)}
        onOwnerFilterChange={changeFilter(setOwnerFilter)}
        onTemperatureFilterChange={changeFilter(setTemperatureFilter)}
        onSourceFilterChange={changeFilter(setSourceFilter)}
        onClearFilters={handleClearFilters}
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
        periodWonConvertedLabel={formatBusinessCurrencyAmount(opportunityMoney.won?.preferredTotal ?? 0, preferredPipelineCurrency)}
        periodLostConvertedLabel={formatBusinessCurrencyAmount(opportunityMoney.lost?.preferredTotal ?? 0, preferredPipelineCurrency)}
        periodConversionRate={metrics.periodConversionRate}
        convertedPipelineLabel={pipelinePreferredLabel}
        pipelineExchangeRateDate={metrics.pipelineExchangeRateDate}
        stageCounts={metrics.stageCounts}
        stages={opportunityFlowStages}
        currencyContext={{
          preferredCurrency: preferredPipelineCurrency,
          nativeBreakdown: pipelineNativeBreakdown || pipelinePreferredLabel,
          rateLabel: exchangeRateMetadata.mode === 'manual'
            ? t.kpiEngine.currencyContext.configuredRate
            : t.kpiEngine.currencyContext.dailyRate,
          effectiveDate: exchangeRateMetadata.sourceDate || metrics.pipelineExchangeRateDate,
          source: exchangeRateMetadata.sourceName,
          isPartial: opportunityMoney.pipeline?.partial ?? false,
          excludedCount: opportunityMoney.pipeline?.excludedRecords ?? 0,
          labels: t.kpiEngine.currencyContext,
        }}
      /> : null}

      {activeView === 'table' ? (
        <ProspectosTable
          copy={t}
          opportunities={tableOpportunities}
          quotes={quotes}
          stages={opportunityFlowStages}
          visibleColumns={localizedVisibleColumns}
          columnWidths={columnWidths}
          tableMinWidth={tableMinWidth}
          sortState={sortState}
          ownerSelectOptions={ownerSelectOptions}
          resolveOpportunityOwnerValue={resolveOpportunityOwnerValue}
          getOwnerPayloadFromValue={getOwnerPayloadFromValue}
          onSort={(columnId) => {
            handleSort(columnId);
            resetPage();
          }}
          onUpdateOpportunity={handleUpdateOpportunity}
          onStageChange={handleKanbanStageChange}
          onOpenFiles={setFilesOpportunity}
          onOpenHistory={setHistoryOpportunity}
          onEdit={handleOpenEditOpportunity}
          onDelete={handleDeleteOpportunity}
          onScheduleChange={handleScheduleChange}
          onDownloadQuote={handleDownloadQuote}
          onResizeColumn={handleResizeColumn}
          paginationState={paginationState}
          onPaginationChange={setPaginationState}
        />
      ) : null}

      {activeView === 'kanban' ? (
        <ProspectosKanban
          copy={t}
          opportunities={periodScopedOpportunities}
          stages={opportunityFlowStages}
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
          stages={opportunityFlowStages}
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
        stageLabel={historyOpportunity
          ? getOpportunityStageLabelByKey(
              opportunityFlowStages,
              historyOpportunity.stage,
              t.options.stages as Record<string, string>,
            )
          : undefined}
        onClose={() => setHistoryOpportunity(null)}
      />

      <OpportunityFlowManagerModal
        open={isFlowManagerOpen}
        flows={opportunityFlowsWithCurrentCounts}
        selectedFlowId={selectedFlowId}
        canManage={canManageOpportunityFlow}
        loadError={flowLoadError}
        copy={t.flow}
        localizedDefaultLabels={t.options.stages as Record<string, string>}
        onOpenChange={setIsFlowManagerOpen}
        onRetry={() => setFlowReloadVersion((current) => current + 1)}
        onSelectFlow={handleSelectOpportunityFlow}
        onCreate={handleCreateOpportunityFlow}
        onUpdate={handleUpdateOpportunityFlow}
      />

      <CreateOpportunityModal
        copy={{ ...t.modal, options: t.options }}
        customerCopy={salesCopy}
        isOpen={isCreateOpen}
        editingOpportunity={editingOpportunity}
        form={form}
        contacts={contacts}
        formOwnerSelectOptions={formOwnerSelectOptions}
        defaultOwnerValue={defaultOwnerValue}
        setForm={setForm}
        onContactChange={handleContactChange}
        onCreateCustomer={createContactRecord}
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
        requiredOpportunityId={pendingWonTransition?.opportunity.id}
        quotes={quotes}
        products={products}
        warehouses={warehouses}
        currentSeller={currentSeller}
        contacts={contacts}
        opportunities={opportunities}
        locale={currentLanguage.code}
        t={salesCopy}
        onOpenChange={(open) => {
          setIsSaleModalOpen(open);
          if (!open) {
            setPendingWonTransition(null);
          }
        }}
        onCreateCustomer={createContactRecord}
        onCreate={createSaleRecord}
        onUpdate={updateSaleRecord}
        onCreditSaleCreated={handleSendToCredit}
        onQuoteConverted={(quoteId, opportunityId) => {
          const convertedQuote = quotes.find((quote) => quote.id === quoteId);
          updateQuoteStatus(quoteId, 'Closed Won');
          if (opportunityId) {
            const pendingPatch = pendingWonTransition?.opportunity.id === opportunityId
              ? pendingWonTransition.patch
              : {};
            commitOpportunityUpdate(opportunityId, {
              ...pendingPatch,
              stage: 'Won',
              status: 'Closed',
              probability: '100%',
              ...(convertedQuote ? {
                estimatedValue: String(convertedQuote.total),
                currency: convertedQuote.currency,
              } : {}),
            });
            setPendingWonTransition(null);
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
