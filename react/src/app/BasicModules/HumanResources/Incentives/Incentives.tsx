import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { humanResourcesApi, type BackendHrUser } from '../../../api/humanResources';
import { hrIncentivesApi, type BackendHrIncentive, type CreateHrIncentivePayload } from '../../../api/HumanResources/incentives';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import type { IncentiveColumn } from './components/IncentiveColumnsModal';
import { IncentiveFilters } from './components/IncentiveFilters';
import { IncentiveHeaderBar } from './components/IncentiveHeaderBar';
import { IncentiveKpiStrip } from './components/IncentiveKpiStrip';
import { IncentivesTable, type IncentiveColumnId } from './components/IncentivesTable';
import { useIncentivesTranslations } from './hooks/useIncentivesTranslations';
import type { RHIncentivo } from './types';

const LazyIncentiveColumnsModal = lazy(() =>
  import('./components/IncentiveColumnsModal').then((module) => ({ default: module.IncentiveColumnsModal })),
);
const LazyIncentiveFormModal = lazy(() =>
  import('./components/IncentiveFormModal').then((module) => ({ default: module.IncentiveFormModal })),
);

type IncentiveViewModel = RHIncentivo & {
  appliedCount: number;
  backendId: number;
  eligibleCount: number;
};

const defaultVisibleIncentiveColumns: IncentiveColumnId[] = [
  'incentive',
  'type',
  'scope',
  'amount',
  'application',
  'status',
];

export default function Incentives() {
  const copy = useIncentivesTranslations();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [incentivos, setIncentivos] = useState<IncentiveViewModel[]>([]);
  const [employees, setEmployees] = useState<BackendHrUser[]>([]);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | RHIncentivo['tipo']>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | RHIncentivo['estado']>('all');
  const [selectedIncentiveIds, setSelectedIncentiveIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<IncentiveColumnId[]>(defaultVisibleIncentiveColumns);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIncentives = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [incentivesResponse, usersResponse] = await Promise.all([
        hrIncentivesApi.list(),
        humanResourcesApi.listHrUsers(),
      ]);
      setEmployees(usersResponse.items);
      setEligibleTotal(Number(usersResponse.summary?.active_count ?? usersResponse.items.length));
      setIncentivos(incentivesResponse.items.map(mapIncentive));
      setSelectedIncentiveIds((current) => current.filter((id) => incentivesResponse.items.some((item) => item.incentive_code === id)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los incentivos.');
      setIncentivos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadIncentives();
  }, []);

  const activeCount = incentivos.filter((incentivo) => incentivo.estado === 'Activo').length;
  const scheduledCount = incentivos.filter((incentivo) => incentivo.estado === 'Programado').length;
  const pausedCount = incentivos.filter((incentivo) => incentivo.estado === 'Pausado').length;
  const automaticCount = incentivos.filter((incentivo) => incentivo.tipo === 'Automatizado').length;
  const manualCount = incentivos.filter((incentivo) => incentivo.tipo === 'Manual').length;

  const incentiveColumns = useMemo<IncentiveColumn[]>(
    () => [
      { id: 'incentive', label: copy.columns.incentive, locked: true },
      { id: 'type', label: copy.columns.type },
      { id: 'scope', label: copy.columns.scope },
      { id: 'amount', label: copy.columns.amount },
      { id: 'application', label: copy.columns.application },
      { id: 'status', label: copy.columns.status },
    ],
    [copy],
  );

  const filteredIncentives = useMemo(
    () =>
      incentivos.filter((incentivo) => {
        const haystack = [
          incentivo.nombre,
          incentivo.tipo,
          incentivo.alcance,
          incentivo.monto,
          incentivo.aplicacion,
          incentivo.estado,
        ].join(' ').toLowerCase();

        const matchesSearch = haystack.includes(searchQuery.trim().toLowerCase());
        const matchesType = selectedType === 'all' || incentivo.tipo === selectedType;
        const matchesStatus = selectedStatus === 'all' || incentivo.estado === selectedStatus;

        return matchesSearch && matchesType && matchesStatus;
      }),
    [incentivos, searchQuery, selectedStatus, selectedType],
  );

  const handleToggleRow = (incentiveId: string) => {
    setSelectedIncentiveIds((current) =>
      current.includes(incentiveId)
        ? current.filter((id) => id !== incentiveId)
        : [...current, incentiveId],
    );
  };

  const handleToggleRows = (incentiveIds: string[], checked: boolean) => {
    if (checked) {
      setSelectedIncentiveIds((current) =>
        Array.from(new Set([...current, ...incentiveIds])),
      );
      return;
    }

    setSelectedIncentiveIds((current) =>
      current.filter((id) => !incentiveIds.includes(id)),
    );
  };

  const handleToggleColumn = (columnId: string) => {
    const column = incentiveColumns.find((item) => item.id === columnId);
    if (column?.locked) {
      return;
    }

    setVisibleColumns((current) =>
      current.includes(columnId as IncentiveColumnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId as IncentiveColumnId],
    );
  };

  return (
    <>
      <IncentiveHeaderBar
        copy={copy}
        onColumns={() => setIsColumnsModalOpen(true)}
        onCreate={() => setIsModalOpen(true)}
      />

      <IncentiveFilters
        copy={copy}
        searchQuery={searchQuery}
        selectedStatus={selectedStatus}
        selectedType={selectedType}
        onSearchChange={setSearchQuery}
        onStatusChange={setSelectedStatus}
        onTypeChange={setSelectedType}
      />

      <IncentiveKpiStrip
        copy={copy}
        activeCount={activeCount}
        automatedCount={automaticCount}
        eligibleCount={eligibleTotal}
        manualCount={manualCount}
        pausedCount={pausedCount}
        scheduledCount={scheduledCount}
        selectedCount={selectedIncentiveIds.length}
        totalCount={incentivos.length}
        visibleCount={filteredIncentives.length}
      />

      {loadError ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {loadError}
        </div>
      ) : null}

      <IncentivesTable
        copy={copy}
        incentives={isLoading ? [] : filteredIncentives}
        selectedIds={selectedIncentiveIds}
        visibleColumns={visibleColumns}
        onToggleRow={handleToggleRow}
        onToggleRows={handleToggleRows}
      />

      <Suspense fallback={null}>
        {isColumnsModalOpen ? (
          <LazyIncentiveColumnsModal
            columns={incentiveColumns}
            copy={copy.columnsModal}
            isOpen={isColumnsModalOpen}
            visibleColumns={visibleColumns}
            onClose={() => setIsColumnsModalOpen(false)}
            onToggleColumn={handleToggleColumn}
          />
        ) : null}

        {isModalOpen ? (
          <LazyIncentiveFormModal
            copy={copy.form}
            defaultCurrency={preferredCurrency}
            employees={employees}
            isOpen={isModalOpen}
            isSaving={isSaving}
            onClose={() => setIsModalOpen(false)}
            onSave={async (payload: CreateHrIncentivePayload) => {
              setIsSaving(true);
              try {
                await hrIncentivesApi.create(payload);
                await loadIncentives();
                setIsModalOpen(false);
              } finally {
                setIsSaving(false);
              }
            }}
          />
        ) : null}
      </Suspense>
    </>
  );
}

function mapIncentive(incentive: BackendHrIncentive): IncentiveViewModel {
  const isCommissionCut = incentive.source_reference_type === 'sales_commission_cut';
  const appliedCount = Number(incentive.applied_count ?? 0);
  return {
    id: incentive.incentive_code,
    backendId: incentive.id,
    nombre: incentive.name,
    tipo: incentive.incentive_type === 'kpi' || isCommissionCut ? 'Automatizado' : 'Manual',
    alcance: `${incentive.scope_summary || `${incentive.eligible_count} colaboradores`}${isCommissionCut ? ` · Corte ${incentive.source_reference_id ?? ''}` : ''}`,
    monto: formatMoney(incentive.amount, incentive.currency_code),
    aplicacion: appliedCount > 0
      ? 'Consumido en nómina'
      : incentive.application_mode === 'specific_date'
      ? formatDate(incentive.effective_start_date)
      : 'Siguiente nómina',
    estado: mapStatus(incentive.status),
    eligibleCount: Number(incentive.eligible_count ?? 0),
    appliedCount,
  };
}

function mapStatus(status: BackendHrIncentive['status']): RHIncentivo['estado'] {
  if (status === 'scheduled') return 'Programado';
  if (status === 'paused') return 'Pausado';
  return 'Activo';
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode || 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value?: string | null) {
  if (!value) return 'Pendiente';
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
