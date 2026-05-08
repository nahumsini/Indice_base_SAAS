import { useMemo, useState } from 'react';
import { NuevoIncentivoModal } from '../../../components/NuevoIncentivoModal';
import { RHIncentivo, rhColaboradores, rhIncentivosSeed } from '../mockData';
import { IncentiveColumnsModal, type IncentiveColumn } from './components/IncentiveColumnsModal';
import { IncentiveFilters } from './components/IncentiveFilters';
import { IncentiveHeaderBar } from './components/IncentiveHeaderBar';
import { IncentiveKpiStrip } from './components/IncentiveKpiStrip';
import { IncentivesTable, type IncentiveColumnId } from './components/IncentivesTable';

const defaultVisibleIncentiveColumns: IncentiveColumnId[] = [
  'incentive',
  'type',
  'scope',
  'amount',
  'application',
  'status',
];

const incentiveColumns: IncentiveColumn[] = [
  { id: 'incentive', label: 'Incentive', locked: true },
  { id: 'type', label: 'Type' },
  { id: 'scope', label: 'Scope' },
  { id: 'amount', label: 'Amount' },
  { id: 'application', label: 'Application' },
  { id: 'status', label: 'Status' },
];

export default function Incentives() {
  const [incentivos, setIncentivos] = useState<RHIncentivo[]>(rhIncentivosSeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | RHIncentivo['tipo']>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | RHIncentivo['estado']>('all');
  const [selectedIncentiveIds, setSelectedIncentiveIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<IncentiveColumnId[]>(defaultVisibleIncentiveColumns);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);

  const activeCount = incentivos.filter((incentivo) => incentivo.estado === 'Activo').length;
  const scheduledCount = incentivos.filter((incentivo) => incentivo.estado === 'Programado').length;
  const pausedCount = incentivos.filter((incentivo) => incentivo.estado === 'Pausado').length;
  const automaticCount = incentivos.filter((incentivo) => incentivo.tipo === 'Automatizado').length;
  const manualCount = incentivos.filter((incentivo) => incentivo.tipo === 'Manual').length;

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

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIncentiveIds((current) =>
        Array.from(new Set([...current, ...filteredIncentives.map((incentive) => incentive.id)])),
      );
      return;
    }

    setSelectedIncentiveIds((current) =>
      current.filter((id) => !filteredIncentives.some((incentive) => incentive.id === id)),
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
        onColumns={() => setIsColumnsModalOpen(true)}
        onCreate={() => setIsModalOpen(true)}
      />

      <IncentiveFilters
        searchQuery={searchQuery}
        selectedStatus={selectedStatus}
        selectedType={selectedType}
        onSearchChange={setSearchQuery}
        onStatusChange={setSelectedStatus}
        onTypeChange={setSelectedType}
      />

      <IncentiveKpiStrip
        activeCount={activeCount}
        automatedCount={automaticCount}
        eligibleCount={rhColaboradores.length}
        manualCount={manualCount}
        pausedCount={pausedCount}
        scheduledCount={scheduledCount}
        selectedCount={selectedIncentiveIds.length}
        totalCount={incentivos.length}
        visibleCount={filteredIncentives.length}
      />

      <IncentivesTable
        incentives={filteredIncentives}
        selectedIds={selectedIncentiveIds}
        visibleColumns={visibleColumns}
        onToggleAll={handleToggleAll}
        onToggleRow={handleToggleRow}
      />

      <IncentiveColumnsModal
        columns={incentiveColumns}
        isOpen={isColumnsModalOpen}
        visibleColumns={visibleColumns}
        onClose={() => setIsColumnsModalOpen(false)}
        onToggleColumn={handleToggleColumn}
      />

      <NuevoIncentivoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          const nextId = `INC-${210 + incentivos.length + 1}`;
          setIncentivos((prev) => [
            {
              id: nextId,
              nombre: data.nombre,
              tipo: data.tipo === 'manual' ? 'Manual' : 'Automatizado',
              alcance:
                data.tipo === 'manual'
                  ? `${data.colaboradoresSeleccionados.length} colaboradores`
                  : 'Regla automatica',
              monto:
                data.tipo === 'manual'
                  ? `$${data.montoManual || '0'} fijo`
                  : `${data.montoAutomatizado || '0'} ${data.tipoMontoAuto === 'porcentaje' ? '%' : 'fijo'}`,
              aplicacion: data.aplicacion === 'especifica' ? data.fechaEspecifica || 'Pendiente' : 'Siguiente nomina',
              estado: data.activo ? 'Activo' : 'Pausado',
            },
            ...prev,
          ]);
          setIsModalOpen(false);
        }}
        colaboradores={rhColaboradores.map(({ id, nombre, puesto, unidad }) => ({
          id,
          nombre,
          puesto,
          unidad,
        }))}
      />
    </>
  );
}
