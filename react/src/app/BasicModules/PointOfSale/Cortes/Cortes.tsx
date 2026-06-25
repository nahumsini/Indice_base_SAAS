import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutList, Table2 } from 'lucide-react';
import { CorteDetailModal } from './components/CorteDetailModal';
import { CortesColumnsModal } from './components/CortesColumnsModal';
import { CortesDayView } from './components/CortesDayView';
import { CortesFiltersBar, type CortesFilterOption } from './components/CortesFiltersBar';
import { CortesHeader } from './components/CortesHeader';
import { CortesKpiArea } from './components/CortesKpiArea';
import { defaultBusinessCurrency, normalizeBusinessCurrencyCode } from '../../shared/businessCurrency';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { CortesTable } from './components/CortesTable';
import { useCashClosingHistory } from './hooks/useCashClosingHistory';
import { cashClosingsApi } from './services/cashClosingsApi';
import { posBackendApi, type PosCashRegisterResponse, type PosShiftResponse, type PosWarehouseSummary } from '../Sale/services/posBackendApi';
import type { PosCashClosingSummaryRow } from './types/cashClosingHistory.types';
import { defaultCortesColumns, type CortesColumnId } from './utils/cortesColumns';
import {
  type CortesFilters,
  type CortesSortDirection,
  type CortesSortKey,
  type CortesViewMode,
  buildCortesAnalytics,
  filterCortesRows,
  getCortesPeriodRange,
  sortCortesRows,
} from './utils/cortesUtils';
import { buildCortesPrintReportHtml } from './utils/cortesPrintReport';

const pageSize = 50;
const todayRange = getCortesPeriodRange('today');

function arrayFromResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (response && typeof response === 'object') {
    const record = response as { content?: unknown; data?: unknown; items?: unknown; rows?: unknown };
    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
    if (Array.isArray(record.data)) {
      return record.data as T[];
    }
    if (Array.isArray(record.rows)) {
      return record.rows as T[];
    }
    if (Array.isArray(record.content)) {
      return record.content as T[];
    }
  }

  return [];
}

function getSelectedOptionLabel(options: CortesFilterOption[], value: string, emptyLabel = 'Todos') {
  if (!value) {
    return emptyLabel;
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

const initialFilters: CortesFilters = {
  cashRegisterId: '',
  dateFrom: todayRange.dateFrom,
  dateTo: todayRange.dateTo,
  difference: 'all',
  period: 'today',
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
  const [warehouses, setWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [cashRegisters, setCashRegisters] = useState<PosCashRegisterResponse[]>([]);
  const [shifts, setShifts] = useState<PosShiftResponse[]>([]);
  const [filterOptionsError, setFilterOptionsError] = useState('');
  const [storedPreferredCurrency, setStoredPreferredCurrency] = useLocalStorageState<string>(
    'indice.pos.cortesPreferredCurrency',
    defaultBusinessCurrency,
  );
  const preferredCurrency = normalizeBusinessCurrencyCode(storedPreferredCurrency, defaultBusinessCurrency);

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

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      setFilterOptionsError('');
      try {
        const [context, shiftRows] = await Promise.all([
          posBackendApi.context(),
          posBackendApi.shifts(),
        ]);

        if (cancelled) {
          return;
        }

        setWarehouses(arrayFromResponse<PosWarehouseSummary>(context.warehouses));
        setCashRegisters(arrayFromResponse<PosCashRegisterResponse>(context.cashRegisters));
        setShifts(arrayFromResponse<PosShiftResponse>(shiftRows));
      } catch (loadError) {
        if (!cancelled) {
          setFilterOptionsError(
            loadError instanceof Error && loadError.message
              ? loadError.message
              : 'No se pudieron cargar los selectores reales de POS.',
          );
        }
      }
    }

    void loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = useMemo(() => {
    const filteredRows = filterCortesRows(rows, filters);
    return sortCortesRows(filteredRows, sortKey, sortDirection);
  }, [filters, rows, sortDirection, sortKey]);

  const analytics = useMemo(
    () => buildCortesAnalytics(visibleRows, preferredCurrency),
    [preferredCurrency, visibleRows],
  );

  const warehouseOptions = useMemo<CortesFilterOption[]>(() => (
    warehouses.map((warehouse) => ({
      label: [
        warehouse.name,
        warehouse.businessName,
      ].filter(Boolean).join(' · '),
      value: String(warehouse.id),
    }))
  ), [warehouses]);

  const cashRegisterOptions = useMemo<CortesFilterOption[]>(() => (
    cashRegisters
      .filter((register) => !filters.warehouseId || String(register.warehouseId) === filters.warehouseId)
      .map((register) => ({
        label: `${register.name} · ${register.code}`,
        value: String(register.id),
      }))
  ), [cashRegisters, filters.warehouseId]);

  const cashierOptions = useMemo<CortesFilterOption[]>(() => {
    const cashierIds = new Set<number>();

    shifts.forEach((shift) => {
      if (shift.openedByUserId) {
        cashierIds.add(Number(shift.openedByUserId));
      }
      if (shift.closedByUserId) {
        cashierIds.add(Number(shift.closedByUserId));
      }
    });

    rows.forEach((row) => {
      if (row.closedByUserId) {
        cashierIds.add(Number(row.closedByUserId));
      }
    });

    return Array.from(cashierIds)
      .filter((id) => Number.isFinite(id))
      .sort((first, second) => first - second)
      .map((id) => ({
        label: `Usuario ${id}`,
        value: String(id),
      }));
  }, [rows, shifts]);

  const updateFilter = <Key extends keyof CortesFilters>(key: Key, value: CortesFilters[Key]) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };

      if (key === 'warehouseId' && next.cashRegisterId) {
        const selectedRegister = cashRegisters.find((register) => String(register.id) === next.cashRegisterId);
        if (selectedRegister && value && String(selectedRegister.warehouseId) !== String(value)) {
          next.cashRegisterId = '';
        }
      }

      return next;
    });
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

  const printFilteredReport = async () => {
    const reportWindow = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes,resizable=yes');

    if (!reportWindow) {
      setNotice('No se pudo abrir la vista de impresion. Revisa permisos de ventanas emergentes del navegador.');
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write('<!doctype html><title>Preparando reporte</title><body style="font-family:Arial,Helvetica,sans-serif;padding:32px;"><strong>Preparando reporte de cortes...</strong></body>');
    reportWindow.document.close();

    let reportRows = visibleRows;
    let reportScopeNote = `Incluye ${visibleRows.length} corte(s) visibles con los filtros actuales.`;

    try {
      const response = await cashClosingsApi.list({
        cashRegisterId: filters.cashRegisterId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        limit: 200,
        offset: 0,
        userId: filters.userId,
        warehouseId: filters.warehouseId,
      });
      reportRows = sortCortesRows(filterCortesRows(response.items, filters), sortKey, sortDirection);
      reportScopeNote = response.count > response.items.length
        ? `Incluye los primeros ${response.items.length} corte(s) del filtro real. El endpoint reporta ${response.count} corte(s) antes de filtros locales de busqueda o diferencia.`
        : `Incluye ${reportRows.length} corte(s) filtrado(s) desde el historial real de POS.`;
    } catch (printError) {
      reportScopeNote = 'No fue posible consultar el historial completo para impresion; este reporte usa los cortes visibles actualmente en pantalla.';
      setNotice(printError instanceof Error && printError.message
        ? `Reporte preparado con filas visibles: ${printError.message}`
        : 'Reporte preparado con filas visibles porque no fue posible consultar el historial completo.');
    }

    const reportAnalytics = buildCortesAnalytics(reportRows, preferredCurrency);
    const reportHtml = buildCortesPrintReportHtml({
      analytics: reportAnalytics,
      cashRegisterLabel: getSelectedOptionLabel(cashRegisterOptions, filters.cashRegisterId),
      cashierLabel: getSelectedOptionLabel(cashierOptions, filters.userId),
      filters,
      preferredCurrency,
      rows: reportRows,
      scopeNote: reportScopeNote,
      warehouseLabel: getSelectedOptionLabel(warehouseOptions, filters.warehouseId),
    });

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.setTimeout(() => reportWindow.print(), 350);
    setNotice(`Reporte imprimible preparado con ${reportRows.length} corte(s) filtrado(s).`);
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
        preferredCurrency={preferredCurrency}
        onColumns={() => setIsColumnsOpen(true)}
        onPrintReport={printFilteredReport}
        onPreferredCurrencyChange={setStoredPreferredCurrency}
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

      {filterOptionsError ? (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {filterOptionsError}
        </div>
      ) : null}

      <CortesFiltersBar
        cashiers={cashierOptions}
        cashRegisters={cashRegisterOptions}
        filters={filters}
        warehouses={warehouseOptions}
        onChange={updateFilter}
        onReset={resetFilters}
      />
      <CortesKpiArea analytics={analytics} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <ViewButton active={viewMode === 'table'} icon={<Table2 className="h-4 w-4" />} label="Tabla" onClick={() => setViewMode('table')} />
          <ViewButton active={viewMode === 'day'} icon={<LayoutList className="h-4 w-4" />} label="Por día" onClick={() => setViewMode('day')} />
        </div>

        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Mostrando {visibleRows.length} de {totalCount} corte(s) · Preferida {analytics.convertedSalesLabel} · Cobrado {analytics.totalSalesLabel}
        </p>
      </div>

      {loading ? (
        <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          Cargando cortes reales del punto de venta...
        </div>
      ) : null}

      {viewMode === 'table' ? (
        <CortesTable
          preferredCurrency={preferredCurrency}
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
        <CortesDayView preferredCurrency={preferredCurrency} rows={visibleRows} onSelect={openDetail} />
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
