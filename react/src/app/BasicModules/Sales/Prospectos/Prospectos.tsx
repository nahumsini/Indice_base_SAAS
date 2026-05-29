import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../../../api/auth';
import { humanResourcesApi } from '../../../api/humanResources';
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
import { ProspectosHeader } from './components/ProspectosHeader';
import { ProspectosFilters } from './components/ProspectosFilters';
import { ProspectosInsightBar } from './components/ProspectosInsightBar';
import { ProspectosKpiStrip } from './components/ProspectosKpiStrip';
import { ProspectosViewTabs } from './components/ProspectosViewTabs';
import { useProspectosFilters } from './hooks/useProspectosFilters';
import { useProspectosMetrics } from './hooks/useProspectosMetrics';
import { useProspectosViewState } from './hooks/useProspectosViewState';
import { ProspectosAgenda } from './agenda/ProspectosAgenda';
import { ProspectosKanban } from './kanban/ProspectosKanban';
import { CreateOpportunityModal } from './modals/CreateOpportunityModal';
import { OpportunityDetailModal } from './modals/OpportunityDetailModal';
import { OpportunityFilesModal } from './modals/OpportunityFilesModal';
import { ProspectosColumnsModal } from './table/ProspectosColumnsModal';
import { ProspectosTable } from './table/ProspectosTable';
import type { OpportunityFormState } from './types/prospectosTypes';
import { canViewAllOpportunities, getContactById, getOwnerSelectValue } from './utils/prospectosFilters';
import {
  formatOpportunitySchedule,
  getOpportunityStatusForStage,
  normalizeEstimatedValueInput,
  toEstimatedValueInputValue,
} from './utils/prospectosFormatters';
import { sortOpportunities } from './utils/prospectosMetrics';
import { initialOpportunityForm } from './utils/prospectosStatus';

export default function Prospectos() {
  const { contacts, opportunities, quotes, addOpportunity, updateOpportunity, deleteOpportunity } = useSalesCrm();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<SalesOpportunity | null>(null);
  const [filesOpportunity, setFilesOpportunity] = useState<SalesOpportunity | null>(null);
  const [historyOpportunity, setHistoryOpportunity] = useState<SalesOpportunity | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<SalesOwnerOption[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [contextCurrentUserCompanyId, setContextCurrentUserCompanyId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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
    tableMinWidth,
    sortState,
    handleSort,
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
        ? [{ value: form.ownerValue, label: `${form.owner} (sin vincular)` }, ...ownerSelectOptions]
        : ownerSelectOptions
    ),
    [form.owner, form.ownerValue, ownerSelectOptions],
  );

  const currentUserCompanyId = useMemo(
    () => contextCurrentUserCompanyId ?? ownerOptions.find((owner) => owner.userId === currentUserId)?.userCompanyId ?? null,
    [contextCurrentUserCompanyId, currentUserId, ownerOptions],
  );

  const currentUserOwnerName = useMemo(
    () => ownerOptions.find((owner) => owner.userCompanyId === currentUserCompanyId)?.name ?? '',
    [currentUserCompanyId, ownerOptions],
  );

  const currentOwnerNames = useMemo(
    () => [currentUserName, currentUserOwnerName].filter(Boolean),
    [currentUserName, currentUserOwnerName],
  );

  const canViewAllVisibleOpportunities = canViewAllOpportunities(currentUserRole);
  const shouldScopeOpportunitiesByOwner = currentUserRole !== null && !canViewAllVisibleOpportunities;
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
    searchQuery,
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

  const tableOpportunities = useMemo(
    () => sortOpportunities(filteredOpportunities, sortState, quotes),
    [filteredOpportunities, quotes, sortState],
  );

  const metrics = useProspectosMetrics(filteredOpportunities);

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
    navigate('/sales/quotes?create=quote');
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

  const handleDeleteOpportunity = (opportunity: SalesOpportunity) => {
    const linkedQuotesCount = quotes.filter((quote) => quote.opportunityId === opportunity.id).length;
    const shouldDelete = window.confirm(
      linkedQuotesCount > 0
        ? `¿Eliminar la oportunidad ${opportunity.opportunityName}? Tiene ${linkedQuotesCount} cotización(es) ligada(s).`
        : `¿Eliminar la oportunidad ${opportunity.opportunityName}?`,
    );
    if (!shouldDelete) {
      return;
    }

    deleteOpportunity(opportunity.id);
    if (editingOpportunity?.id === opportunity.id) {
      setEditingOpportunity(null);
      setIsCreateOpen(false);
    }
    if (filesOpportunity?.id === opportunity.id) {
      setFilesOpportunity(null);
    }
    if (historyOpportunity?.id === opportunity.id) {
      setHistoryOpportunity(null);
    }
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
      lastContact: form.lastContact,
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
    updateOpportunity(opportunity.id, {
      stage,
      status: getOpportunityStatusForStage(stage, opportunity.status),
    });
  };

  return (
    <section className="space-y-5">
      <ProspectosHeader
        onOpenColumns={() => setIsColumnsModalOpen(true)}
        onCreateQuote={handleOpenCreateQuote}
        onCreateOpportunity={handleOpenCreateOpportunity}
      />

      <ProspectosViewTabs activeView={activeView} onViewChange={setActiveView} />

      <ProspectosFilters
        searchQuery={searchQuery}
        stageFilter={stageFilter}
        ownerFilter={ownerFilter}
        temperatureFilter={temperatureFilter}
        sourceFilter={sourceFilter}
        statusFilter={statusFilter}
        ownerSelectOptions={ownerSelectOptions}
        onSearchChange={setSearchQuery}
        onStageFilterChange={setStageFilter}
        onOwnerFilterChange={setOwnerFilter}
        onTemperatureFilterChange={setTemperatureFilter}
        onSourceFilterChange={setSourceFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <ProspectosKpiStrip
        visibleCount={metrics.visibleCount}
        openCount={metrics.openCount}
        weightedProbability={metrics.weightedProbability}
        proposalCount={metrics.proposalCount}
        formattedPipelineValue={metrics.formattedPipelineValue}
        stageCounts={metrics.stageCounts}
      />

      <ProspectosInsightBar
        hotCount={metrics.hotCount}
        formattedPipelineValue={metrics.formattedPipelineValue}
        weightedProbability={metrics.weightedProbability}
      />

      {activeView === 'table' ? (
        <ProspectosTable
          opportunities={tableOpportunities}
          quotes={quotes}
          visibleColumns={visibleColumns}
          tableMinWidth={tableMinWidth}
          sortState={sortState}
          ownerSelectOptions={ownerSelectOptions}
          resolveOpportunityOwnerValue={resolveOpportunityOwnerValue}
          getOwnerPayloadFromValue={getOwnerPayloadFromValue}
          onSort={handleSort}
          onUpdateOpportunity={updateOpportunity}
          onOpenFiles={setFilesOpportunity}
          onOpenHistory={setHistoryOpportunity}
          onEdit={handleOpenEditOpportunity}
          onDelete={handleDeleteOpportunity}
          onScheduleChange={handleScheduleChange}
        />
      ) : null}

      {activeView === 'kanban' ? (
        <ProspectosKanban
          opportunities={filteredOpportunities}
          onOpenFiles={setFilesOpportunity}
          onOpenHistory={setHistoryOpportunity}
          onEdit={handleOpenEditOpportunity}
          onStageChange={handleKanbanStageChange}
        />
      ) : null}

      {activeView === 'agenda' ? (
        <ProspectosAgenda
          opportunities={filteredOpportunities}
          onOpenFiles={setFilesOpportunity}
          onOpenHistory={setHistoryOpportunity}
          onEdit={handleOpenEditOpportunity}
          onScheduleChange={handleScheduleChange}
        />
      ) : null}

      <ProspectosColumnsModal
        isOpen={isColumnsModalOpen}
        columns={columns}
        onClose={() => setIsColumnsModalOpen(false)}
        onSave={setColumns}
      />

      <OpportunityDetailModal
        opportunity={historyOpportunity}
        onClose={() => setHistoryOpportunity(null)}
      />

      <CreateOpportunityModal
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
        opportunity={filesOpportunity}
        onClose={() => setFilesOpportunity(null)}
      />
    </section>
  );
}
