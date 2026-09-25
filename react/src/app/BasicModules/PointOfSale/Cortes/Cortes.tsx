import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutList, Table2 } from 'lucide-react';
import { CorteDetailModal } from './components/CorteDetailModal';
import { CortesBulkActionsBar } from './components/CortesBulkActionsBar';
import { CortesColumnsModal } from './components/CortesColumnsModal';
import { CortesDayView } from './components/CortesDayView';
import { CortesFiltersBar, type CortesFilterOption } from './components/CortesFiltersBar';
import { CortesHeader } from './components/CortesHeader';
import { CortesKpiArea } from './components/CortesKpiArea';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { getKpiMonetaryAggregates, useKpiMonetaryAggregates } from '../../shared/kpiMonetaryApi';
import { CortesTable } from './components/CortesTable';
import { useCashClosingHistory } from './hooks/useCashClosingHistory';
import { cashClosingsApi } from './services/cashClosingsApi';
import { posBackendApi, type PosCashRegisterResponse, type PosShiftResponse, type PosWarehouseSummary } from '../Sale/services/posBackendApi';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';
import type { PosCashClosingSummaryRow } from './types/cashClosingHistory.types';
import { defaultCortesColumns, type CortesColumnId } from './utils/cortesColumns';
import {
  type CortesFilters,
  type CortesSortDirection,
  type CortesSortKey,
  type CortesViewMode,
  buildCortesAnalytics,
  getCortesPeriodRange,
  sortCortesRows,
} from './utils/cortesUtils';
import { buildCortesPrintReportHtml } from './utils/cortesPrintReport';
import { useLearningModeHeaderActions } from '../../../learningMode';
import { configCenterApi } from '../../../api/configCenter';
import { usePointOfSaleResolvedLocale } from '../hooks/usePointOfSaleTranslations';
import { getCortesCopy } from './cortesTranslations';

const initialMonthRange = getCortesPeriodRange('month');

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

function getSelectedOptionLabel(options: CortesFilterOption[], value: string, emptyLabel = 'All') {
  if (!value) {
    return emptyLabel;
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

const initialFilters: CortesFilters = {
  cashRegisterId: '',
  dateFrom: initialMonthRange.dateFrom,
  dateTo: initialMonthRange.dateTo,
  period: 'month',
  search: '',
  userId: '',
  warehouseId: '',
};

function getInitialFiltersFromLocation(): CortesFilters {
  if (typeof window === 'undefined') {
    return initialFilters;
  }

  const query = new URLSearchParams(window.location.search);
  const dateFrom = query.get('dateFrom') || initialFilters.dateFrom;
  const dateTo = query.get('dateTo') || initialFilters.dateTo;
  const hasExplicitRange = Boolean(query.get('dateFrom') && query.get('dateTo'));

  return {
    ...initialFilters,
    cashRegisterId: query.get('cashRegisterId') || '',
    dateFrom,
    dateTo,
    period: hasExplicitRange ? 'custom' : initialFilters.period,
    warehouseId: query.get('warehouseId') || '',
  };
}

export default function Cortes() {
  const learningModeActive = useLearningModeHeaderActions()?.active ?? false;
  const locale = usePointOfSaleResolvedLocale();
  const copy = useMemo(() => getCortesCopy(locale), [locale]);
  const [filters, setFilters] = useState<CortesFilters>(getInitialFiltersFromLocation);
  const [viewMode, setViewMode] = useState<CortesViewMode>('table');
  const [sortKey, setSortKey] = useState<CortesSortKey>('closedAt');
  const [sortDirection, setSortDirection] = useState<CortesSortDirection>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<CortesColumnId[]>(defaultCortesColumns);
  const [warehouses, setWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [cashRegisters, setCashRegisters] = useState<PosCashRegisterResponse[]>([]);
  const [shifts, setShifts] = useState<PosShiftResponse[]>([]);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [filterOptionsError, setFilterOptionsError] = useState('');
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

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
    search: debouncedSearch,
    userId: filters.userId,
    warehouseId: filters.warehouseId,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      setFilterOptionsError('');
      try {
        const [contextResult, shiftsResult, usersResult] = await Promise.allSettled([
          posBackendApi.context(),
          posBackendApi.shifts(),
          configCenterApi.getUsers(),
        ]);

        if (contextResult.status === 'rejected') throw contextResult.reason;
        if (shiftsResult.status === 'rejected') throw shiftsResult.reason;

        if (cancelled) {
          return;
        }

        setWarehouses(arrayFromResponse<PosWarehouseSummary>(contextResult.value.warehouses));
        setCashRegisters(arrayFromResponse<PosCashRegisterResponse>(contextResult.value.cashRegisters));
        setShifts(arrayFromResponse<PosShiftResponse>(shiftsResult.value));
        setUserNames(usersResult.status === 'fulfilled'
          ? Object.fromEntries(usersResult.value.users.map((user) => [
            user.id,
            [user.nombres, user.apellidos].filter(Boolean).join(' ') || user.email,
          ]))
          : {});
      } catch (loadError) {
        if (!cancelled) {
          setFilterOptionsError(
            loadError instanceof Error && loadError.message
              ? loadError.message
              : copy.main.filterOptionsError,
          );
        }
      }
    }

    void loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, [copy.main.filterOptionsError]);

  const warehouseNames = useMemo<Record<number, string>>(
    () => Object.fromEntries(warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [warehouses],
  );
  const cashRegisterNames = useMemo<Record<number, string>>(
    () => Object.fromEntries(cashRegisters.map((register) => [register.id, register.name])),
    [cashRegisters],
  );
  const resolvedRows = useMemo(() => rows.map((row) => ({
    ...row,
    cashRegisterName: row.cashRegisterName || cashRegisterNames[row.cashRegisterId],
    closedByUserName: row.closedByUserName || userNames[row.closedByUserId],
    warehouseName: row.warehouseName || warehouseNames[row.warehouseId],
  })), [cashRegisterNames, rows, userNames, warehouseNames]);

  const visibleRows = useMemo(
    () => sortCortesRows(resolvedRows, sortKey, sortDirection),
    [resolvedRows, sortDirection, sortKey],
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const currentPage = Math.min(totalPages, Math.floor(offset / pageSize) + 1);
  const pageStart = totalCount === 0 ? 0 : Math.min(offset + 1, totalCount);
  const pageEnd = totalCount === 0 ? 0 : Math.min(offset + rows.length, totalCount);

  useEffect(() => {
    setSelectedRowIds((current) => current.filter((rowId) => visibleRows.some((row) => row.id === rowId)));
  }, [visibleRows]);

  useEffect(() => {
    if (totalCount === 0) {
      if (offset !== 0) {
        setOffset(0);
      }
      return;
    }

    const maxOffset = Math.max(0, (totalPages - 1) * pageSize);
    if (offset > maxOffset) {
      setOffset(maxOffset);
    }
  }, [offset, pageSize, totalCount, totalPages]);

  const selectedRows = useMemo(
    () => visibleRows.filter((row) => selectedRowIds.includes(row.id)),
    [selectedRowIds, visibleRows],
  );

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedRowIds.includes(row.id));

  const closingIds = useMemo(() => visibleRows.map((row) => row.id), [visibleRows]);
  const monetaryQueries = useMemo(() => [
    { key: 'sales', metric: 'POS_CLOSING_TOTAL' as const, preferredCurrency, ids: closingIds },
    { key: 'cash', metric: 'POS_CLOSING_CASH_SALES' as const, preferredCurrency, ids: closingIds },
    { key: 'card', metric: 'POS_CLOSING_CARD_SALES' as const, preferredCurrency, ids: closingIds },
    { key: 'transfer', metric: 'POS_CLOSING_TRANSFER_SALES' as const, preferredCurrency, ids: closingIds },
    { key: 'credit', metric: 'POS_CLOSING_CREDIT_SALES' as const, preferredCurrency, ids: closingIds },
    { key: 'expected', metric: 'POS_CLOSING_EXPECTED_CASH' as const, preferredCurrency, ids: closingIds },
    { key: 'counted', metric: 'POS_CLOSING_COUNTED_CASH' as const, preferredCurrency, ids: closingIds },
    { key: 'difference', metric: 'POS_CLOSING_DIFFERENCE' as const, preferredCurrency, ids: closingIds },
  ], [closingIds, preferredCurrency]);
  const { data: monetaryAggregates, error: monetaryError } = useKpiMonetaryAggregates(monetaryQueries);
  const analytics = useMemo(() => buildCortesAnalytics(visibleRows, preferredCurrency, monetaryAggregates), [
    monetaryAggregates,
    preferredCurrency,
    visibleRows,
  ]);

  const loadReportAnalytics = async (reportRows: PosCashClosingSummaryRow[]) => {
    const ids = reportRows.map((row) => row.id);
    const aggregates = await getKpiMonetaryAggregates([
      { key: 'sales', metric: 'POS_CLOSING_TOTAL', preferredCurrency, ids },
      { key: 'cash', metric: 'POS_CLOSING_CASH_SALES', preferredCurrency, ids },
      { key: 'card', metric: 'POS_CLOSING_CARD_SALES', preferredCurrency, ids },
      { key: 'transfer', metric: 'POS_CLOSING_TRANSFER_SALES', preferredCurrency, ids },
      { key: 'credit', metric: 'POS_CLOSING_CREDIT_SALES', preferredCurrency, ids },
      { key: 'expected', metric: 'POS_CLOSING_EXPECTED_CASH', preferredCurrency, ids },
      { key: 'counted', metric: 'POS_CLOSING_COUNTED_CASH', preferredCurrency, ids },
      { key: 'difference', metric: 'POS_CLOSING_DIFFERENCE', preferredCurrency, ids },
    ]);
    return buildCortesAnalytics(reportRows, preferredCurrency, aggregates);
  };

  const warehouseOptions = useMemo<CortesFilterOption[]>(() => (
    warehouses
      .map((warehouse) => ({
        label: [warehouse.name, warehouse.unitName, warehouse.businessName].filter(Boolean).join(' - '),
        value: String(warehouse.id),
      }))
      .sort((first, second) => first.label.localeCompare(second.label, locale))
  ), [locale, warehouses]);

  const cashRegisterOptions = useMemo<CortesFilterOption[]>(() => (
    cashRegisters
      .filter((register) => !filters.warehouseId || String(register.warehouseId) === filters.warehouseId)
      .map((register) => ({
        label: `${register.name} - ${register.code}`,
        value: String(register.id),
      }))
      .sort((first, second) => first.label.localeCompare(second.label, locale))
  ), [cashRegisters, filters.warehouseId, locale]);

  const cashierOptions = useMemo<CortesFilterOption[]>(() => {
    const cashierIds = new Set<number>();

    shifts
      .filter((shift) => !filters.warehouseId || String(shift.warehouseId) === filters.warehouseId)
      .filter((shift) => !filters.cashRegisterId || String(shift.cashRegisterId) === filters.cashRegisterId)
      .forEach((shift) => {
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
        label: userNames[id] || copy.common.user(id),
        value: String(id),
      }));
  }, [copy, filters.cashRegisterId, filters.warehouseId, rows, shifts, userNames]);

  const updateFilter = <Key extends keyof CortesFilters>(key: Key, value: CortesFilters[Key]) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };

      if (key === 'warehouseId' && next.cashRegisterId) {
        const selectedRegister = cashRegisters.find((register) => String(register.id) === next.cashRegisterId);
        if (selectedRegister && value && String(selectedRegister.warehouseId) !== String(value)) {
          next.cashRegisterId = '';
        }
      }

      if (key === 'warehouseId' || key === 'cashRegisterId') {
        next.userId = '';
      }

      return next;
    });
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

  const toggleRowSelection = (rowId: number) => {
    setSelectedRowIds((current) => (
      current.includes(rowId)
        ? current.filter((id) => id !== rowId)
        : [...current, rowId]
    ));
  };

  const toggleVisibleSelection = () => {
    setSelectedRowIds((current) => {
      const visibleIds = visibleRows.map((row) => row.id);

      if (visibleIds.length === 0) {
        return current;
      }

      if (visibleIds.every((rowId) => current.includes(rowId))) {
        return current.filter((rowId) => !visibleIds.includes(rowId));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
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
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html><title>${copy.main.preparingReportTitle}</title><body style="font-family:Arial,Helvetica,sans-serif;padding:32px;"><strong>${copy.main.preparingReportBody}</strong></body>`);
    reportWindow.document.close();

    let reportRows = visibleRows;
    let reportScopeNote = copy.main.reportScopeVisible(visibleRows.length);

    try {
      const response = await cashClosingsApi.list({
        cashRegisterId: filters.cashRegisterId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        limit: 200,
        offset: 0,
        search: filters.search,
        userId: filters.userId,
        warehouseId: filters.warehouseId,
      });
      const resolvedReportRows = response.items.map((row) => ({
        ...row,
        cashRegisterName: row.cashRegisterName || cashRegisterNames[row.cashRegisterId],
        closedByUserName: row.closedByUserName || userNames[row.closedByUserId],
        warehouseName: row.warehouseName || warehouseNames[row.warehouseId],
      }));
      reportRows = sortCortesRows(resolvedReportRows, sortKey, sortDirection);
      reportScopeNote = response.count > response.items.length
        ? copy.main.reportScopePartial(response.items.length, response.count)
        : copy.main.reportScopeFiltered(reportRows.length);
    } catch {
      reportScopeNote = copy.main.reportScopeFallback;
    }

    const reportAnalytics = await loadReportAnalytics(reportRows);
    const reportHtml = buildCortesPrintReportHtml({
      analytics: reportAnalytics,
      cashRegisterLabel: getSelectedOptionLabel(cashRegisterOptions, filters.cashRegisterId, copy.common.all),
      cashierLabel: getSelectedOptionLabel(cashierOptions, filters.userId, copy.common.all),
      copy,
      filters,
      locale,
      preferredCurrency,
      rows: reportRows,
      scopeNote: reportScopeNote,
      warehouseLabel: getSelectedOptionLabel(warehouseOptions, filters.warehouseId, copy.common.all),
    });

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.setTimeout(() => reportWindow.print(), 350);
  };

  const printSelectedReport = async () => {
    if (selectedRows.length === 0) {
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes,resizable=yes');

    if (!reportWindow) {
      return;
    }

    const reportRows = sortCortesRows(selectedRows, sortKey, sortDirection);
    const reportHtml = buildCortesPrintReportHtml({
      analytics: await loadReportAnalytics(reportRows),
      cashRegisterLabel: getSelectedOptionLabel(cashRegisterOptions, filters.cashRegisterId, copy.common.all),
      cashierLabel: getSelectedOptionLabel(cashierOptions, filters.userId, copy.common.all),
      copy,
      filters,
      locale,
      preferredCurrency,
      rows: reportRows,
      scopeNote: copy.main.reportScopeSelected(reportRows.length),
      warehouseLabel: getSelectedOptionLabel(warehouseOptions, filters.warehouseId, copy.common.all),
    });

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.setTimeout(() => reportWindow.print(), 350);
  };

  const printSelectedReport = () => {
    if (selectedRows.length === 0) {
      setNotice('Selecciona uno o mas cortes para preparar el reporte.');
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes,resizable=yes');

    if (!reportWindow) {
      setNotice('No se pudo abrir la vista de impresion. Revisa permisos de ventanas emergentes del navegador.');
      return;
    }

    const reportRows = sortCortesRows(selectedRows, sortKey, sortDirection);
    const reportHtml = buildCortesPrintReportHtml({
      analytics: buildCortesAnalytics(reportRows, preferredCurrency),
      cashRegisterLabel: getSelectedOptionLabel(cashRegisterOptions, filters.cashRegisterId),
      cashierLabel: getSelectedOptionLabel(cashierOptions, filters.userId),
      filters,
      preferredCurrency,
      rows: reportRows,
      scopeNote: `Incluye ${reportRows.length} corte(s) seleccionados manualmente para auditoria.`,
      warehouseLabel: getSelectedOptionLabel(warehouseOptions, filters.warehouseId),
    });

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.setTimeout(() => reportWindow.print(), 350);
    setNotice(`Reporte imprimible preparado con ${reportRows.length} corte(s) seleccionados.`);
  };

  const handleRowDownload = (row: PosCashClosingSummaryRow) => {
    openDetail(row);
  };

  const handleRowPrint = (row: PosCashClosingSummaryRow) => {
    openDetail(row);
  };

  const renderPagination = (attached: boolean) => (
    <PointOfSaleTablePagination
      attached={attached}
      currentPage={currentPage}
      itemLabel={copy.main.itemLabel}
      onPageChange={(page) => setOffset((page - 1) * pageSize)}
      onPageSizeChange={(nextPageSize) => {
        setPageSize(nextPageSize);
        setOffset(0);
      }}
      pageEnd={pageEnd}
      pageSize={pageSize}
      pageStart={pageStart}
      totalCount={totalCount}
      totalPages={totalPages}
    />
  );

  return (
    <div className="space-y-6">
      <CortesHeader
        copy={copy}
        loading={loading}
        onColumns={() => setIsColumnsOpen(true)}
        onPrintReport={printFilteredReport}
        onRefresh={refresh}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {monetaryError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {copy.main.monetaryError}
        </div>
      ) : null}

      {filterOptionsError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {filterOptionsError}
        </div>
      ) : null}

      <CortesFiltersBar
        cashiers={cashierOptions}
        cashRegisters={cashRegisterOptions}
        copy={copy}
        filters={filters}
        warehouses={warehouseOptions}
        onChange={updateFilter}
      />
      {!learningModeActive ? <CortesKpiArea analytics={analytics} copy={copy} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
          <ViewButton active={viewMode === 'table'} icon={<Table2 className="h-4 w-4" />} label={copy.main.table} onClick={() => setViewMode('table')} />
          <ViewButton active={viewMode === 'day'} icon={<LayoutList className="h-4 w-4" />} label={copy.main.byDay} onClick={() => setViewMode('day')} />
        </div>

        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {copy.main.showing(visibleRows.length, totalCount, analytics.convertedSalesLabel, analytics.totalSalesLabel)}
        </p>
      </div>

      {viewMode === 'table' ? (
        <>
          <CortesBulkActionsBar
            copy={copy}
            selectedCount={selectedRows.length}
            onClearSelection={() => setSelectedRowIds([])}
            onPrintSelected={printSelectedReport}
          />
          <CortesTable
            key={visibleColumns.join(':')}
            allVisibleSelected={allVisibleSelected}
            cashRegisterNames={cashRegisterNames}
            cashierNames={userNames}
            copy={copy}
            loading={loading}
            pagination={renderPagination(true)}
            rows={visibleRows}
            selectedRowIds={selectedRowIds}
            sortDirection={sortDirection}
            sortKey={sortKey}
            visibleColumns={visibleColumns}
            onDownload={handleRowDownload}
            onPrint={handleRowPrint}
            onSelect={openDetail}
            onSort={handleSort}
            onToggleRowSelection={toggleRowSelection}
            onToggleVisibleSelection={toggleVisibleSelection}
            warehouseNames={warehouseNames}
          />
        </>
      ) : (
        <CortesDayView
          copy={copy}
          preferredCurrency={preferredCurrency}
          rows={visibleRows}
          onSelect={openDetail}
        />
      )}

      {viewMode === 'day' ? renderPagination(false) : null}

      <CortesColumnsModal
        copy={copy}
        open={isColumnsOpen}
        visibleColumns={visibleColumns}
        onClose={() => setIsColumnsOpen(false)}
        onVisibleColumnsChange={setVisibleColumns}
      />

      <CorteDetailModal
        copy={copy}
        detail={selectedDetail}
        error={detailError}
        locale={locale}
        loading={detailLoading}
        open={isDetailOpen}
        onClose={closeDetail}
        onDownload={() => undefined}
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
      className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
        active
          ? 'bg-[#FF6B5E] text-[#222831]'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
