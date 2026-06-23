import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutList, Table2 } from 'lucide-react';
import { CorteDetailModal } from './components/CorteDetailModal';
import { CortesColumnsModal } from './components/CortesColumnsModal';
import { CortesDayView } from './components/CortesDayView';
import { CortesFiltersBar } from './components/CortesFiltersBar';
import { CortesHeader } from './components/CortesHeader';
import { CortesKpiArea } from './components/CortesKpiArea';
import { CortesTable } from './components/CortesTable';
import { useCashClosingHistory } from './hooks/useCashClosingHistory';
import type { PosCashClosingSummaryRow } from './types/cashClosingHistory.types';
import { defaultCortesColumns, type CortesColumnId } from './utils/cortesColumns';
import {
  type CortesFilters,
  type CortesSortDirection,
  type CortesSortKey,
  type CortesViewMode,
  buildCortesAnalytics,
  filterCortesRows,
  formatCurrency,
  sortCortesRows,
  toLocalInputDate,
  toNumber,
} from './utils/cortesUtils';

const today = toLocalInputDate(new Date());
const pageSize = 50;

const initialFilters: CortesFilters = {
  cashRegisterId: '',
  dateFrom: today,
  dateTo: today,
  difference: 'all',
  search: '',
  userId: '',
  warehouseId: '',
};

export default function Cortes() {
  const [filters, setFilters] = useState<CortesFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<CortesViewMode>('table');
  const [sortKey, setSortKey] = useState<CortesSortKey>('closedAt');
  const [sortDirection, setSortDirection] = useState<CortesSortDirection>('desc');
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState('');
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<CortesColumnId[]>(defaultCortesColumns);

  const {
    clearSelectedDetail,
    detailError,
    detailLoading,
    error,
    loading,
    rows,
    selectedDetail,
    totalCount,
    refresh,
    selectDetail,
  } = useCashClosingHistory({
    cashRegisterId: filters.cashRegisterId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit: pageSize,
    offset,
    userId: filters.userId,
    warehouseId: filters.warehouseId,
  });

  const visibleRows = useMemo(() => {
    const filteredRows = filterCortesRows(rows, filters);
    return sortCortesRows(filteredRows, sortKey, sortDirection);
  }, [filters, rows, sortDirection, sortKey]);

  const analytics = useMemo(() => buildCortesAnalytics(visibleRows), [visibleRows]);
  const currencyCode = selectedDetail?.shift?.currencyCode ?? 'MXN';

  const updateFilter = <Key extends keyof CortesFilters>(key: Key, value: CortesFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setOffset(0);
  };

  const handleSort = (nextSortKey: CortesSortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('desc');
  };

  const openDetail = (row: PosCashClosingSummaryRow) => {
    setIsDetailOpen(true);
    selectDetail(row.id);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    clearSelectedDetail();
  };

  const exportCsv = () => {
    const csvRows = [
      ['Corte', 'Fecha cierre', 'Almacen', 'Caja', 'Cajero', 'Turno', 'Tickets', 'Ventas', 'Esperado', 'Contado', 'Diferencia'],
      ...visibleRows.map((row) => [
        `COR-${row.id}`,
        row.closedAt,
        row.warehouseId,
        row.cashRegisterId,
        row.closedByUserId,
        row.shiftId,
        row.ticketsCount,
        toNumber(row.totalSalesAmount),
        toNumber(row.expectedCashAmount),
        toNumber(row.countedCashAmount),
        toNumber(row.overShortAmount),
      ]),
    ];
    const csv = csvRows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cortes-pos-${filters.dateFrom}-${filters.dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRowDownload = (row: PosCashClosingSummaryRow) => {
    setNotice(`El corte COR-${row.id} esta listo para descarga desde el detalle.`);
    openDetail(row);
  };

  const handleRowPrint = (row: PosCashClosingSummaryRow) => {
    setNotice(`Abriendo COR-${row.id} para impresion.`);
    openDetail(row);
  };

  const nextPageDisabled = offset + pageSize >= totalCount;
  const previousPageDisabled = offset === 0;

  return (
    <div className="space-y-6">
      <CortesHeader
        loading={loading}
        onColumns={() => setIsColumnsOpen(true)}
        onExport={exportCsv}
        onRefresh={() => {
          refresh();
          setNotice('Cortes actualizados desde el historial real de POS.');
        }}
      />

      {notice ? (
        <div className="rounded-[20px] border border-[#F4C84A]/25 bg-[#F4C84A]/10 px-4 py-3 text-sm font-black text-[#9A6B05] dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/15 dark:text-[#F4C84A]">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <CortesFiltersBar filters={filters} onChange={updateFilter} onReset={resetFilters} />
      <CortesKpiArea analytics={analytics} currencyCode={currencyCode} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ViewButton active={viewMode === 'table'} icon={<Table2 className="h-4 w-4" />} label="Tabla" onClick={() => setViewMode('table')} />
          <ViewButton active={viewMode === 'day'} icon={<LayoutList className="h-4 w-4" />} label="Por día" onClick={() => setViewMode('day')} />
        </div>

        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Mostrando {visibleRows.length} de {totalCount} corte(s) · Ventas {formatCurrency(analytics.totalSales, currencyCode)}
        </p>
      </div>

      {loading ? (
        <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          Cargando cortes reales del punto de venta...
        </div>
      ) : null}

      {viewMode === 'table' ? (
        <CortesTable
          currencyCode={currencyCode}
          loading={loading}
          rows={visibleRows}
          sortDirection={sortDirection}
          sortKey={sortKey}
          visibleColumns={visibleColumns}
          onDownload={handleRowDownload}
          onPrint={handleRowPrint}
          onSelect={openDetail}
          onSort={handleSort}
        />
      ) : (
        <CortesDayView currencyCode={currencyCode} rows={visibleRows} onSelect={openDetail} />
      )}

      <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Pagina {Math.floor(offset / pageSize) + 1} · limite {pageSize}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={previousPageDisabled}
            onClick={() => setOffset((current) => Math.max(0, current - pageSize))}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={nextPageDisabled}
            onClick={() => setOffset((current) => current + pageSize)}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Siguiente
          </button>
        </div>
      </div>

      <CortesColumnsModal
        open={isColumnsOpen}
        visibleColumns={visibleColumns}
        onClose={() => setIsColumnsOpen(false)}
        onVisibleColumnsChange={setVisibleColumns}
      />

      <CorteDetailModal
        detail={selectedDetail}
        error={detailError}
        loading={detailLoading}
        open={isDetailOpen}
        onClose={closeDetail}
        onDownload={() => setNotice('La descarga PDF del corte queda preparada para la siguiente fase documental.')}
        onPrint={() => window.print()}
      />
    </div>
  );
}

function ViewButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
        active
          ? 'bg-[#FF6B5E] text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
