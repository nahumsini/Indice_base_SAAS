import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, Loader2, Monitor, Pencil, Plus, ReceiptText, Trash2, Warehouse } from 'lucide-react';
import { configCenterApi } from '../../../api/configCenter';
import { SuccessToast } from '../../../components/SuccessToast';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from '../../../components/frontend-os';
import { IndiceConfirmationDialog } from '../../../components/indice-modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { PointOfSaleTitleBar, pointOfSaleTitleBarPrimaryActionClassName } from '../shared/components/PointOfSaleTitleBar';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { CreateCashRegisterModal } from '../Sale/components/CreateCashRegisterModal';
import { PosModalFrame, posModalModuleFooterClassName, posModalPrimaryActionClassName, posModalSecondaryActionClassName } from '../Sale/components/PosModalFrame';
import { posBackendApi, type PosCashRegisterCreatePayload, type PosCashRegisterResponse, type PosContextResponse, type PosDailySalesSummaryResponse, type PosShiftClosingSummaryResponse, type PosShiftResponse, type PosWarehouseSummary } from '../Sale/services/posBackendApi';
import { useCashRegistersCopy, type CashRegistersCopy } from './cashRegistersTranslations';

type Row = {
  warehouse: PosWarehouseSummary;
  register: PosCashRegisterResponse | null;
  shift: PosShiftResponse | null;
  closedShifts: PosShiftResponse[];
};

type CashRegisterSortKey = 'warehouse' | 'register' | 'status' | 'owner';
type CashRegisterSortDirection = 'asc' | 'desc';
type CashRegisterResizableColumn = CashRegisterSortKey | 'actions';
type CashRegisterActivityFilter = 'all' | 'available' | 'open' | 'closing' | 'missing' | 'closed';

type CashRegisterColumnWidths = Record<CashRegisterResizableColumn, number>;

const CASH_REGISTER_COLUMN_WIDTHS_STORAGE_KEY = 'indice:pos:cash-registers:column-widths:v3';
const DEFAULT_CASH_REGISTER_COLUMN_WIDTHS: CashRegisterColumnWidths = {
  warehouse: 30,
  register: 21,
  status: 15,
  owner: 17.5,
  actions: 12,
};
const MIN_CASH_REGISTER_COLUMN_WIDTHS: CashRegisterColumnWidths = {
  warehouse: 18,
  register: 14,
  status: 10,
  owner: 15,
  actions: 11.5,
};

const unwrap = <T,>(value: T[] | { items?: T[] } | null | undefined): T[] => Array.isArray(value) ? value : value?.items ?? [];

function loadCashRegisterColumnWidths(): CashRegisterColumnWidths {
  if (typeof window === 'undefined') return { ...DEFAULT_CASH_REGISTER_COLUMN_WIDTHS };
  try {
    const stored = JSON.parse(window.localStorage.getItem(CASH_REGISTER_COLUMN_WIDTHS_STORAGE_KEY) ?? 'null') as Partial<CashRegisterColumnWidths> | null;
    const columnIds: CashRegisterResizableColumn[] = ['warehouse', 'register', 'status', 'owner', 'actions'];
    if (!stored || !columnIds.every((columnId) => Number.isFinite(stored[columnId]) && Number(stored[columnId]) >= MIN_CASH_REGISTER_COLUMN_WIDTHS[columnId])) {
      return { ...DEFAULT_CASH_REGISTER_COLUMN_WIDTHS };
    }
    const total = columnIds.reduce((sum, columnId) => sum + Number(stored[columnId]), 0);
    if (Math.abs(total - 95.5) > 0.1) return { ...DEFAULT_CASH_REGISTER_COLUMN_WIDTHS };
    return Object.fromEntries(columnIds.map((columnId) => [columnId, Number(stored[columnId])])) as CashRegisterColumnWidths;
  } catch {
    return { ...DEFAULT_CASH_REGISTER_COLUMN_WIDTHS };
  }
}

function resizeCashRegisterColumnBoundary(
  widths: CashRegisterColumnWidths,
  leftColumn: CashRegisterResizableColumn,
  rightColumn: CashRegisterResizableColumn,
  delta: number,
) {
  const pairWidth = widths[leftColumn] + widths[rightColumn];
  const nextLeftWidth = Math.min(
    Math.max(widths[leftColumn] + delta, MIN_CASH_REGISTER_COLUMN_WIDTHS[leftColumn]),
    pairWidth - MIN_CASH_REGISTER_COLUMN_WIDTHS[rightColumn],
  );
  return {
    ...widths,
    [leftColumn]: Number(nextLeftWidth.toFixed(2)),
    [rightColumn]: Number((pairWidth - nextLeftWidth).toFixed(2)),
  };
}

export default function CashRegistersWorkspace() {
  const { copy, locale } = useCashRegistersCopy();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [context, setContext] = useState<PosContextResponse | null>(null);
  const [registers, setRegisters] = useState<PosCashRegisterResponse[]>([]);
  const [shifts, setShifts] = useState<PosShiftResponse[]>([]);
  const [summaries, setSummaries] = useState<Record<number, PosShiftClosingSummaryResponse>>({});
  const [todaySalesAggregate, setTodaySalesAggregate] = useState<PosDailySalesSummaryResponse | null>(null);
  const [todaySalesError, setTodaySalesError] = useState(false);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [expandedRegisters, setExpandedRegisters] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [sessionView, setSessionView] = useState<CashRegisterActivityFilter>('all');
  const [sortKey, setSortKey] = useState<CashRegisterSortKey>('warehouse');
  const [sortDirection, setSortDirection] = useState<CashRegisterSortDirection>('asc');
  const [columnWidths, setColumnWidths] = useState<CashRegisterColumnWidths>(loadCashRegisterColumnWidths);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PosCashRegisterResponse | null>(null);
  const [registerPendingDeletion, setRegisterPendingDeletion] = useState<PosCashRegisterResponse | null>(null);
  const canManageCashRegisters = context?.canManageCashRegisters === true;

  const initialLoadStarted = useRef(false);

  const loadBaseData = useCallback(async () => {
    const [contextResult, registerResult, usersResult] = await Promise.allSettled([
      posBackendApi.context(),
      posBackendApi.cashRegisters(),
      configCenterApi.getUsers(),
    ]);

    if (contextResult.status === 'rejected') throw contextResult.reason;
    if (registerResult.status === 'rejected') throw registerResult.reason;

    setContext(contextResult.value);
    setRegisters(unwrap(registerResult.value as unknown as { items?: PosCashRegisterResponse[] }));
    if (usersResult.status === 'fulfilled') {
      setUserNames(Object.fromEntries(usersResult.value.users.map((user) => [user.id, [user.nombres, user.apellidos].filter(Boolean).join(' ') || user.email])));
    } else {
      setUserNames({});
    }
  }, []);

  const refreshOperationalState = useCallback(async () => {
    const shiftResponse = await posBackendApi.shifts();
    const nextShifts = unwrap(shiftResponse as unknown as { items?: PosShiftResponse[] });
    setShifts(nextShifts);
    const monitoredShifts = nextShifts.filter((shift) => shift.status === 'OPEN' || shift.status === 'CLOSING' || (shift.status === 'CLOSED' && isToday(shift.closedAt || shift.openedAt)));
    const nextSummaries = await Promise.all(monitoredShifts.map(async (shift) => [shift.id, await posBackendApi.getShiftClosingSummary(shift.id)] as const));
    setSummaries(Object.fromEntries(nextSummaries));
  }, []);

  const refreshTodaySales = useCallback(async (currency: string) => {
    try {
      const aggregate = await posBackendApi.getDailySalesSummary(currency);
      setTodaySalesAggregate(aggregate);
      setTodaySalesError(false);
    } catch (requestError) {
      setTodaySalesError(true);
      throw requestError;
    }
  }, []);

  const reload = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        loadBaseData(),
        refreshOperationalState(),
        refreshTodaySales(preferredCurrency),
      ]);
      const failedRequiredRequest = results.slice(0, 2).find((result) => result.status === 'rejected');
      if (failedRequiredRequest?.status === 'rejected') {
        throw failedRequiredRequest.reason;
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.notices.loadError);
    } finally {
      if (initial) setLoading(false);
    }
  }, [copy.notices.loadError, loadBaseData, preferredCurrency, refreshOperationalState, refreshTodaySales]);

  useEffect(() => {
    if (!initialLoadStarted.current) {
      initialLoadStarted.current = true;
      void reload(true);
    }

    const intervalId = window.setInterval(() => {
      void refreshOperationalState().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [refreshOperationalState, reload]);

  useEffect(() => {
    void refreshTodaySales(preferredCurrency).catch(() => undefined);
    const intervalId = window.setInterval(() => {
      void refreshTodaySales(preferredCurrency).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [preferredCurrency, refreshTodaySales]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CASH_REGISTER_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {
      // Column resizing remains available when browser storage is unavailable.
    }
  }, [columnWidths]);

  const scopedRows = useMemo<Row[]>(() => {
    const warehouses = context?.warehouses ?? [];
    const openByRegister = new Map(shifts.filter((shift) => shift.status === 'OPEN' || shift.status === 'CLOSING').map((shift) => [shift.cashRegisterId, shift]));
    const closedByRegister = new Map<number, PosShiftResponse[]>();
    shifts.filter((shift) => shift.status === 'CLOSED' && isToday(shift.closedAt || shift.openedAt)).forEach((shift) => {
      closedByRegister.set(shift.cashRegisterId, [...(closedByRegister.get(shift.cashRegisterId) ?? []), shift]);
    });
    const result: Row[] = [];
    warehouses.forEach((warehouse) => {
      const warehouseRegisters = registers.filter((register) => register.warehouseId === warehouse.id);
      if (warehouseRegisters.length === 0) result.push({ warehouse, register: null, shift: null, closedShifts: [] });
      warehouseRegisters.forEach((register) => result.push({ warehouse, register, shift: openByRegister.get(register.id) ?? null, closedShifts: closedByRegister.get(register.id) ?? [] }));
    });
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return result.filter((row) => {
      if (warehouseFilter !== 'all' && String(row.warehouse.id) !== warehouseFilter) return false;
      return !normalizedQuery || [
        row.warehouse.name,
        row.warehouse.warehouseCode,
        row.warehouse.unitName,
        row.warehouse.businessName,
        row.register?.name,
        row.register?.code,
      ].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [context?.warehouses, query, registers, shifts, warehouseFilter]);

  const rows = useMemo(
    () => scopedRows.filter((row) => matchesCashRegisterActivity(row, sessionView)),
    [scopedRows, sessionView],
  );

  const warehouseFilterOptions = useMemo(() => [
    { value: 'all', label: copy.operation.allWarehouses },
    ...(context?.warehouses ?? [])
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, locale, { sensitivity: 'base' }))
      .map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name })),
  ], [context?.warehouses, copy.operation.allWarehouses, locale]);

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const comparison = getCashRegisterSortValue(left, sortKey, copy, userNames)
        .localeCompare(getCashRegisterSortValue(right, sortKey, copy, userNames), locale, {
          numeric: true,
          sensitivity: 'base',
        });
      if (comparison !== 0) return comparison * direction;
      return `${left.warehouse.id}-${left.register?.id ?? 0}`.localeCompare(
        `${right.warehouse.id}-${right.register?.id ?? 0}`,
        locale,
        { numeric: true },
      );
    });
  }, [copy, locale, rows, sortDirection, sortKey, userNames]);

  const rowsPagination = useTablePagination({
    rows: sortedRows,
    resetKey: `${query}|${warehouseFilter}|${sessionView}|${sortKey}|${sortDirection}`,
  });

  const provision = async (warehouseId: number) => {
    setSaving(true); setError(''); setSuccessMessage('');
    try {
      const register = await posBackendApi.ensureCashRegisterForWarehouse(warehouseId);
      setSuccessMessage(copy.notices.provisioned(register.code, register.name));
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.notices.provisionError);
    } finally { setSaving(false); }
  };

  const create = async (payload: PosCashRegisterCreatePayload) => {
    setSaving(true); setError(''); setSuccessMessage('');
    try {
      const register = await posBackendApi.createCashRegister(payload);
      setCreating(false);
      setSuccessMessage(copy.notices.created(register.code, register.name));
      await reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : copy.notices.createError); }
    finally { setSaving(false); }
  };

  const update = async (payload: PosCashRegisterCreatePayload) => {
    if (!editing) return;
    setSaving(true); setError(''); setSuccessMessage('');
    try {
      const register = await posBackendApi.updateCashRegister(editing.id, payload);
      setEditing(null);
      setSuccessMessage(copy.notices.updated(register.code, register.name));
      await reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : copy.notices.updateError); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!registerPendingDeletion) return;
    const register = registerPendingDeletion;
    setSaving(true); setError(''); setSuccessMessage('');
    try {
      await posBackendApi.deleteCashRegister(register.id);
      setRegisterPendingDeletion(null);
      setExpandedRegisters((current) => {
        const next = new Set(current);
        next.delete(register.id);
        return next;
      });
      setSuccessMessage(copy.notices.deleted(register.code, register.name));
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.notices.deleteError);
    } finally {
      setSaving(false);
    }
  };

  const availableCount = scopedRows.filter((row) => matchesCashRegisterActivity(row, 'available')).length;
  const openCount = scopedRows.filter((row) => matchesCashRegisterActivity(row, 'open')).length;
  const closingCount = scopedRows.filter((row) => matchesCashRegisterActivity(row, 'closing')).length;
  const missingCount = scopedRows.filter((row) => matchesCashRegisterActivity(row, 'missing')).length;
  const closedRegisterCount = scopedRows.filter((row) => matchesCashRegisterActivity(row, 'closed')).length;
  const scopedClosedTodayCount = scopedRows.reduce((total, row) => total + row.closedShifts.length, 0);
  const currentTodaySalesAggregate = todaySalesAggregate?.preferredCurrency === preferredCurrency
    ? todaySalesAggregate
    : null;
  const todayAccumulated = Number(currentTodaySalesAggregate?.preferredTotal ?? 0);
  const selectActivity = (activity: Exclude<CashRegisterActivityFilter, 'all' | 'closed'>) => {
    setSessionView((current) => current === activity ? 'all' : activity);
  };
  const toggleRegister = (registerId: number) => setExpandedRegisters((current) => {
    const next = new Set(current);
    if (next.has(registerId)) next.delete(registerId); else next.add(registerId);
    return next;
  });
  const toggleSort = (nextSortKey: CashRegisterSortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection('asc');
  };
  const resizeColumnBy = (leftColumn: CashRegisterResizableColumn, rightColumn: CashRegisterResizableColumn, delta: number) => {
    setColumnWidths((current) => resizeCashRegisterColumnBoundary(current, leftColumn, rightColumn, delta));
  };
  const startColumnResize = (
    event: React.PointerEvent<HTMLSpanElement>,
    leftColumn: CashRegisterResizableColumn,
    rightColumn: CashRegisterResizableColumn,
  ) => {
    event.preventDefault();
    const tableWidth = event.currentTarget.closest('table')?.getBoundingClientRect().width ?? 1;
    const startX = event.clientX;
    const startWidths = { ...columnWidths };
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const deltaPercent = ((pointerEvent.clientX - startX) / tableWidth) * 100;
      setColumnWidths(resizeCashRegisterColumnBoundary(startWidths, leftColumn, rightColumn, deltaPercent));
    };
    const stopColumnResize = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopColumnResize);
      window.removeEventListener('pointercancel', stopColumnResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopColumnResize);
    window.addEventListener('pointercancel', stopColumnResize);
  };
  const resetColumnWidths = () => setColumnWidths({ ...DEFAULT_CASH_REGISTER_COLUMN_WIDTHS });

  return <div className="space-y-5">
    <PointOfSaleTitleBar
      icon={<span className="text-xl leading-none">🏪</span>}
      title={copy.header.title}
      subtitle={copy.header.subtitle}
      actions={canManageCashRegisters ? <button type="button" onClick={() => setCreating(true)} className={pointOfSaleTitleBarPrimaryActionClassName}><Plus className="h-4 w-4" />{copy.header.newRegister}</button> : undefined}
    />

    {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

    <IndiceFilterBar
      title={copy.operation.filtersTitle}
      gridClassName="lg:grid-cols-[minmax(18rem,2fr)_minmax(14rem,1fr)_minmax(14rem,1fr)]"
    >
      <IndiceFilterSearch
        label={copy.operation.searchLabel}
        value={query}
        onValueChange={setQuery}
        onClear={() => setQuery('')}
        clearLabel={copy.operation.clearSearch}
        placeholder={copy.operation.searchPlaceholder}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.operation.warehouseLabel}
        value={warehouseFilter}
        onValueChange={setWarehouseFilter}
        options={warehouseFilterOptions}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.operation.activityLabel}
        value={sessionView}
        onValueChange={(value) => setSessionView(value as CashRegisterActivityFilter)}
        options={[
          { value: 'all', label: copy.operation.allRegisters },
          { value: 'available', label: copy.operation.availableRegisters(availableCount) },
          { value: 'open', label: copy.operation.openSessions(openCount) },
          { value: 'closing', label: copy.operation.closingRegisters(closingCount) },
          { value: 'missing', label: copy.operation.missingRegisters(missingCount) },
          { value: 'closed', label: copy.operation.todayClosings(closedRegisterCount) },
        ]}
        tone="coral"
      />
    </IndiceFilterBar>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={copy.metrics.title}>
      <OperationalMetric active={sessionView === 'available'} helper={copy.metrics.availableHelp} icon={<Monitor className="h-5 w-5" />} label={copy.metrics.availableRegisters} onClick={() => selectActivity('available')} tone="emerald" value={loading ? '—' : availableCount} />
      <OperationalMetric active={sessionView === 'open'} helper={copy.metrics.openHelp} icon={<Activity className="h-5 w-5" />} label={copy.metrics.openShifts} onClick={() => selectActivity('open')} tone="sky" value={loading ? '—' : openCount} />
      <OperationalMetric active={sessionView === 'closing'} helper={copy.metrics.closingHelp} icon={<ReceiptText className="h-5 w-5" />} label={copy.metrics.closingRegisters} onClick={() => selectActivity('closing')} tone="amber" value={loading ? '—' : closingCount} />
      <OperationalMetric
        active={false}
        helper={todaySalesError ? copy.metrics.todayAccumulatedUnavailable : copy.metrics.todayAccumulatedHelp(preferredCurrency)}
        icon={<CircleDollarSign className="h-5 w-5" />}
        label={copy.metrics.todayAccumulated}
        tone="coral"
        value={!currentTodaySalesAggregate ? '—' : formatMoney(todayAccumulated, preferredCurrency, locale)}
      />
    </div>

    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] table-fixed divide-y divide-slate-200 text-sm leading-5 dark:divide-slate-700">
          <colgroup>
            <col style={{ width: '4.5%' }} />
            <col style={{ width: `${columnWidths.warehouse}%` }} />
            <col style={{ width: `${columnWidths.register}%` }} />
            <col style={{ width: `${columnWidths.status}%` }} />
            <col style={{ width: `${columnWidths.owner}%` }} />
            <col style={{ width: `${columnWidths.actions}%` }} />
          </colgroup>
          <thead className="bg-slate-50 text-[13px] font-normal text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
            <tr className="h-[52px]">
              <th scope="col" className="px-3 text-center"><span className="sr-only">{copy.operation.expand}</span></th>
              <SortableTableHead
                label={copy.operation.columns[0]}
                column="warehouse"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                copy={copy}
                resizeHandle={<ColumnResizeHandle
                  currentWidth={columnWidths.warehouse}
                  minimumWidth={MIN_CASH_REGISTER_COLUMN_WIDTHS.warehouse}
                  maximumWidth={columnWidths.warehouse + columnWidths.register - MIN_CASH_REGISTER_COLUMN_WIDTHS.register}
                  label={copy.operation.resizeColumn(copy.operation.columns[0])}
                  help={copy.operation.resizeHelp}
                  onPointerDown={(event) => startColumnResize(event, 'warehouse', 'register')}
                  onResizeBy={(delta) => resizeColumnBy('warehouse', 'register', delta)}
                  onReset={resetColumnWidths}
                />}
              />
              <SortableTableHead
                label={copy.operation.columns[1]}
                column="register"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                copy={copy}
                resizeHandle={<ColumnResizeHandle
                  currentWidth={columnWidths.register}
                  minimumWidth={MIN_CASH_REGISTER_COLUMN_WIDTHS.register}
                  maximumWidth={columnWidths.register + columnWidths.status - MIN_CASH_REGISTER_COLUMN_WIDTHS.status}
                  label={copy.operation.resizeColumn(copy.operation.columns[1])}
                  help={copy.operation.resizeHelp}
                  onPointerDown={(event) => startColumnResize(event, 'register', 'status')}
                  onResizeBy={(delta) => resizeColumnBy('register', 'status', delta)}
                  onReset={resetColumnWidths}
                />}
              />
              <SortableTableHead
                label={copy.operation.columns[2]}
                column="status"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                align="center"
                copy={copy}
                resizeHandle={<ColumnResizeHandle
                  currentWidth={columnWidths.status}
                  minimumWidth={MIN_CASH_REGISTER_COLUMN_WIDTHS.status}
                  maximumWidth={columnWidths.status + columnWidths.owner - MIN_CASH_REGISTER_COLUMN_WIDTHS.owner}
                  label={copy.operation.resizeColumn(copy.operation.columns[2])}
                  help={copy.operation.resizeHelp}
                  onPointerDown={(event) => startColumnResize(event, 'status', 'owner')}
                  onResizeBy={(delta) => resizeColumnBy('status', 'owner', delta)}
                  onReset={resetColumnWidths}
                />}
              />
              <SortableTableHead
                label={copy.operation.columns[3]}
                column="owner"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                copy={copy}
                resizeHandle={<ColumnResizeHandle
                  currentWidth={columnWidths.owner}
                  minimumWidth={MIN_CASH_REGISTER_COLUMN_WIDTHS.owner}
                  maximumWidth={columnWidths.owner + columnWidths.actions - MIN_CASH_REGISTER_COLUMN_WIDTHS.actions}
                  label={copy.operation.resizeColumn(copy.operation.columns[3])}
                  help={copy.operation.resizeHelp}
                  onPointerDown={(event) => startColumnResize(event, 'owner', 'actions')}
                  onResizeBy={(delta) => resizeColumnBy('owner', 'actions', delta)}
                  onReset={resetColumnWidths}
                />}
              />
              <th scope="col" className="px-3 text-right text-[13px] font-normal leading-4">{copy.operation.columns[4]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#B63B32]" /><span className="font-medium">{copy.operation.loading}</span></td></tr> : rowsPagination.paginatedRows.map(({ warehouse, register, shift, closedShifts }) => {
              const expanded = register ? expandedRegisters.has(register.id) : false;
              const summary = shift ? summaries[shift.id] : undefined;
              return [<tr key={`${warehouse.id}-${register?.id ?? 'missing'}`} className={`h-16 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${expanded ? 'bg-[#FFF8F7] dark:bg-[#FF6B5E]/5' : ''}`}>
                <td className="px-3 py-3 text-center">{register ? <TableActionButton label={expanded ? copy.operation.collapse : copy.operation.expand} onClick={() => toggleRegister(register.id)}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableActionButton> : null}</td>
                <td className="overflow-hidden px-4 py-3 text-left align-middle"><strong className="block truncate text-sm font-medium text-slate-950 dark:text-white">{warehouse.name}</strong><span className="mt-0.5 block truncate text-xs font-normal leading-4 text-slate-500 dark:text-slate-400">{[warehouse.warehouseCode || copy.common.warehouse(warehouse.id), warehouse.unitName || (warehouse.unitId ? copy.common.unit(warehouse.unitId) : copy.common.notLinked), warehouse.businessName || (warehouse.businessId ? copy.common.business(warehouse.businessId) : copy.common.notLinked)].join(' · ')}</span></td>
                <td className="overflow-hidden px-4 py-3 text-left align-middle">{register ? <><strong className="block truncate text-sm font-medium text-slate-950 dark:text-white">{register.name}</strong><span className="mt-0.5 block truncate text-xs font-normal leading-4 text-slate-500 dark:text-slate-400">{register.code}</span></> : <span className="block truncate text-sm font-normal text-slate-500">{copy.row.noRegister}</span>}</td>
                <td className="px-4 py-3 text-center align-middle"><StatusBadge copy={copy} register={register} shift={shift} /></td>
                <td className="truncate px-4 py-3 text-left align-middle text-sm font-normal text-slate-600 dark:text-slate-300">{shift ? `${userNames[shift.openedByUserId] || copy.common.user(shift.openedByUserId)} · ${new Date(shift.openedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : closedShifts.length > 0 ? copy.row.closedTodayCount(closedShifts.length) : copy.common.available}</td>
                <td className="px-3 py-3 text-right align-middle">{canManageCashRegisters ? (register ? <div className="inline-flex items-center justify-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                  <TableActionButton label={copy.row.edit} tone="module" disabled={saving} onClick={() => setEditing(register)}><Pencil className="h-4 w-4" /></TableActionButton>
                  <TableActionButton label={shift ? copy.row.deleteBlocked : copy.row.delete} tone="danger" disabled={saving || Boolean(shift)} onClick={() => setRegisterPendingDeletion(register)}><Trash2 className="h-4 w-4" /></TableActionButton>
                </div> : <div className="inline-flex items-center justify-end rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70"><TableActionButton label={copy.row.prepare} tone="module" disabled={saving} onClick={() => void provision(warehouse.id)}><Plus className="h-4 w-4" /></TableActionButton></div>) : <span className="text-xs font-normal text-slate-400" title={copy.row.adminOnly}>—</span>}</td>
              </tr>, expanded && register ? <tr key={`session-${register.id}`}><td colSpan={6} className="bg-slate-50 px-6 py-5 dark:bg-slate-950/50"><SessionFolder copy={copy} locale={locale} register={register} shift={shift} summary={summary} userName={shift ? userNames[shift.openedByUserId] : undefined} closedShifts={closedShifts} summaries={summaries} userNames={userNames} /></td></tr> : null];
            })}
            {!loading && sortedRows.length === 0 ? <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-500"><span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Warehouse className="h-5 w-5" /></span><span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{copy.operation.noResults}</span></td></tr> : null}
          </tbody>
        </table>
      </div>
      <PointOfSaleTablePagination
        currentPage={rowsPagination.currentPage}
        itemLabel={copy.operation.records}
        onPageChange={rowsPagination.onPageChange}
        onPageSizeChange={rowsPagination.onPageSizeChange}
        pageEnd={rowsPagination.pageEnd}
        pageSize={rowsPagination.pageSize}
        pageSizeOptions={rowsPagination.pageSizeOptions}
        pageStart={rowsPagination.pageStart}
        totalCount={rowsPagination.totalCount}
        totalPages={rowsPagination.totalPages}
      />
    </section>

    {canManageCashRegisters ? <CreateCashRegisterModal isOpen={creating} warehouses={context?.warehouses ?? []} isSubmitting={saving} onClose={() => setCreating(false)} onConfirm={create} /> : null}
    {canManageCashRegisters && editing ? <EditRegisterModal copy={copy} register={editing} warehouses={context?.warehouses ?? []} saving={saving} onClose={() => setEditing(null)} onSave={update} /> : null}
    <IndiceConfirmationDialog
      open={Boolean(registerPendingDeletion)}
      title={copy.deleteModal.title}
      description={copy.deleteModal.description}
      itemName={registerPendingDeletion ? `${registerPendingDeletion.name} · ${registerPendingDeletion.code}` : undefined}
      confirmLabel={saving ? copy.deleteModal.deleting : copy.deleteModal.confirm}
      cancelLabel={copy.deleteModal.cancel}
      busy={saving}
      destructive
      tone="coral"
      icon={<Trash2 className="h-5 w-5" />}
      onCancel={() => setRegisterPendingDeletion(null)}
      onConfirm={() => void remove()}
    />
    <SuccessToast
      isVisible={Boolean(successMessage)}
      message={successMessage}
      onClose={() => setSuccessMessage('')}
    />
  </div>;
}

function SortableTableHead({
  align = 'left',
  className = '',
  column,
  copy,
  label,
  onSort,
  resizeHandle,
  sortDirection,
  sortKey,
}: {
  align?: 'left' | 'center';
  className?: string;
  column: CashRegisterSortKey;
  copy: CashRegistersCopy;
  label: string;
  onSort: (column: CashRegisterSortKey) => void;
  resizeHandle?: React.ReactNode;
  sortDirection: CashRegisterSortDirection;
  sortKey: CashRegisterSortKey;
}) {
  const isActive = sortKey === column;
  const nextDirection = isActive && sortDirection === 'asc' ? 'desc' : 'asc';
  const sortLabel = nextDirection === 'asc' ? copy.operation.sortAscending(label) : copy.operation.sortDescending(label);
  const SortIcon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`relative px-4 ${align === 'center' ? 'text-center' : 'text-left'} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group inline-flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md text-[13px] font-normal leading-4 outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 ${resizeHandle ? 'pr-2' : ''} ${align === 'center' ? 'justify-center' : 'justify-start'} ${isActive ? 'text-[#B63B32] dark:text-[#FFB0AA]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'}`}
        aria-label={sortLabel}
        title={sortLabel}
      >
        <span className="truncate">{label}</span>
        <SortIcon className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`} aria-hidden="true" />
      </button>
      {resizeHandle}
    </th>
  );
}

function ColumnResizeHandle({
  currentWidth,
  help,
  label,
  maximumWidth,
  minimumWidth,
  onPointerDown,
  onReset,
  onResizeBy,
}: {
  currentWidth: number;
  help: string;
  label: string;
  maximumWidth: number;
  minimumWidth: number;
  onPointerDown: (event: React.PointerEvent<HTMLSpanElement>) => void;
  onReset: () => void;
  onResizeBy: (delta: number) => void;
}) {
  return (
    <span
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={Math.round(maximumWidth)}
      aria-valuemin={Math.round(minimumWidth)}
      aria-valuenow={Math.round(currentWidth)}
      aria-valuetext={`${Math.round(currentWidth)}%`}
      tabIndex={0}
      title={`${label}. ${help}`}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReset();
      }}
      onKeyDown={(event) => {
        const delta = event.shiftKey ? 2 : 1;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onResizeBy(-delta);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          onResizeBy(delta);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onReset();
        }
      }}
      className="group/resize absolute right-0 top-0 z-10 flex h-full w-4 translate-x-1/2 touch-none cursor-col-resize items-center justify-center outline-none"
    >
      <span className="h-7 w-px bg-slate-300 opacity-60 transition group-hover/resize:w-0.5 group-hover/resize:bg-[#FF6B5E] group-hover/resize:opacity-100 group-focus-visible/resize:w-0.5 group-focus-visible/resize:bg-[#FF6B5E] group-focus-visible/resize:opacity-100 dark:bg-slate-600" aria-hidden="true" />
    </span>
  );
}

function TableActionButton({
  children,
  disabled = false,
  label,
  onClick,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'module' | 'danger';
}) {
  const toneClassName = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20'
    : tone === 'module'
    ? 'border-[#FF6B5E]/35 bg-[#FF6B5E]/10 text-[#B63B32] hover:border-[#FF6B5E]/60 hover:bg-[#FF6B5E]/20 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/10 dark:text-[#FFB0AA]'
    : 'border-slate-200 bg-white text-slate-500 hover:border-[#FF6B5E]/50 hover:bg-[#FF6B5E]/5 hover:text-[#B63B32] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#FF6B5E]/40 dark:hover:text-[#FFB0AA]';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 ${toneClassName}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-[220px] rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium leading-4 text-white shadow-xl">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function getCashRegisterSortValue(
  row: Row,
  sortKey: CashRegisterSortKey,
  copy: CashRegistersCopy,
  userNames: Record<number, string>,
) {
  if (sortKey === 'warehouse') return `${row.warehouse.name} ${row.warehouse.warehouseCode ?? ''}`;
  if (sortKey === 'register') return row.register ? `${row.register.name} ${row.register.code}` : copy.row.noRegister;
  if (sortKey === 'status') return getCashRegisterStatusLabel(row, copy);
  if (row.shift) return userNames[row.shift.openedByUserId] || copy.common.user(row.shift.openedByUserId);
  if (row.closedShifts.length > 0) return copy.row.closedTodayCount(row.closedShifts.length);
  return copy.common.available;
}

function getCashRegisterStatusLabel(row: Row, copy: CashRegistersCopy) {
  if (!row.register) return copy.row.statuses.needsRegister;
  if (row.shift) return row.shift.status === 'CLOSING' ? copy.row.statuses.closing : copy.row.statuses.open;
  return row.register.active && row.register.status === 'ACTIVE' ? copy.row.statuses.available : copy.row.statuses.inactive;
}

function matchesCashRegisterActivity(row: Row, activity: CashRegisterActivityFilter) {
  if (activity === 'all') return true;
  if (activity === 'available') {
    return Boolean(row.register && row.register.active && row.register.status === 'ACTIVE' && !row.shift);
  }
  if (activity === 'open') return row.shift?.status === 'OPEN';
  if (activity === 'closing') return row.shift?.status === 'CLOSING';
  if (activity === 'missing') return !row.register;
  return row.closedShifts.length > 0;
}

function OperationalMetric({ active, helper, icon, label, onClick, tone, value }: {
  active: boolean;
  helper: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  tone: 'emerald' | 'sky' | 'amber' | 'orange' | 'coral';
  value: number | string;
}) {
  const toneClassName = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    coral: 'bg-[#FF6B5E]/15 text-[#B63B32] dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]',
  }[tone];
  const className = `min-h-[120px] rounded-xl border bg-white p-4 text-left shadow-sm dark:bg-slate-900 ${onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35' : ''} ${active ? 'border-[#FF6B5E] ring-2 ring-[#FF6B5E]/15 dark:border-[#FF8E84]' : 'border-slate-200 dark:border-slate-700'}`;
  const content = <>
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="block text-sm font-normal text-slate-500 dark:text-slate-400">{label}</span>
        <strong className="mt-1 block text-2xl font-medium tabular-nums text-slate-950 dark:text-white">{value}</strong>
      </div>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClassName}`}>{icon}</span>
    </div>
    <span className="mt-2 block text-xs font-normal leading-4 text-slate-500 dark:text-slate-400">{helper}</span>
  </>;

  if (!onClick) return <div className={className}>{content}</div>;

  return <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={className}
  >
    {content}
  </button>;
}

function SessionFolder({ copy, locale, register, shift, summary, userName, closedShifts, summaries, userNames }: {
  copy: CashRegistersCopy;
  locale: string;
  register: PosCashRegisterResponse;
  shift: PosShiftResponse | null;
  summary?: PosShiftClosingSummaryResponse;
  userName?: string;
  closedShifts: PosShiftResponse[];
  summaries: Record<number, PosShiftClosingSummaryResponse>;
  userNames: Record<number, string>;
}) {
  if (!shift && closedShifts.length === 0) return <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Monitor className="h-5 w-5" /></div><div><strong className="font-medium text-slate-950 dark:text-white">{copy.session.availableTitle}</strong><p className="text-sm text-slate-500">{copy.session.availableDescription(register.name)}</p></div></div></div>;

  const orderedClosedShifts = [...closedShifts].sort((left, right) => new Date(right.closedAt || right.openedAt).getTime() - new Date(left.closedAt || left.openedAt).getTime());
  return <div className="space-y-4">
    {shift ? <OpenSessionCard copy={copy} locale={locale} shift={shift} summary={summary} userName={userName} /> : null}
    {orderedClosedShifts.length > 0 ? <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-violet-600" />{copy.session.closedTodayTitle(orderedClosedShifts.length)}</div>
      {orderedClosedShifts.map((closedShift) => <ClosedSessionCard key={closedShift.id} copy={copy} locale={locale} shift={closedShift} summary={summaries[closedShift.id]} userName={userNames[closedShift.openedByUserId]} closedByUserName={closedShift.closedByUserId ? userNames[closedShift.closedByUserId] : undefined} />)}
    </div> : null}
  </div>;
}

function OpenSessionCard({ copy, locale, shift, summary, userName }: { copy: CashRegistersCopy; locale: string; shift: PosShiftResponse; summary?: PosShiftClosingSummaryResponse; userName?: string }) {
  const currency = summary?.currencyCode || shift.currencyCode;
  return <div className="rounded-lg border border-[#FF6B5E]/25 bg-white p-5 dark:bg-slate-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" /><strong className="font-medium text-slate-950 dark:text-white">{copy.session.openTitle(shift.id)}</strong></div><p className="mt-1 text-sm text-slate-500">{copy.session.openedBy(userName || copy.common.user(shift.openedByUserId), new Date(shift.openedAt).toLocaleString(locale))}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">{copy.session.realTime}</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.salesAccumulated} value={summary ? formatMoney(Number(summary.totalSalesAmount), currency, locale) : copy.session.updating} highlight />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label={copy.session.tickets} value={summary ? String(summary.ticketsCount) : '—'} />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label={copy.session.averageTicket} value={summary ? formatMoney(summary.ticketsCount > 0 ? Number(summary.totalSalesAmount) / summary.ticketsCount : 0, currency, locale) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.cashSales} value={summary ? formatMoney(Number(summary.cashSalesAmount), currency, locale) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.expectedCash} value={summary ? formatMoney(Number(summary.expectedCashAmount), currency, locale) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.openingFund} value={summary ? formatMoney(Number(summary.openingCashAmount), currency, locale) : formatMoney(Number(shift.openingAmount || 0), currency, locale)} />
    </div>
  </div>;
}

function ClosedSessionCard({ copy, locale, shift, summary, userName, closedByUserName }: { copy: CashRegistersCopy; locale: string; shift: PosShiftResponse; summary?: PosShiftClosingSummaryResponse; userName?: string; closedByUserName?: string }) {
  const currency = summary?.currencyCode || shift.currencyCode;
  const tickets = summary?.ticketsCount ?? 0;
  const sales = Number(summary?.totalSalesAmount || 0);
  const difference = Number(summary?.overShortAmount ?? shift.overShortAmount ?? 0);
  return <div className="rounded-lg border border-violet-200 bg-white p-5 dark:border-violet-500/30 dark:bg-slate-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-violet-700"><CheckCircle2 className="h-4 w-4" /></span><strong className="font-medium text-slate-950 dark:text-white">{copy.session.closedTitle(shift.id)}</strong></div><p className="mt-1 text-sm text-slate-500">{userName || copy.common.user(shift.openedByUserId)} · {new Date(shift.openedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - {shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—'}{closedByUserName ? ` · ${copy.session.closedBy(closedByUserName)}` : ''}</p></div><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">{copy.session.closedStatus}</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.closingSales} value={summary ? formatMoney(sales, currency, locale) : copy.session.updating} highlight />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label={copy.session.tickets} value={summary ? String(tickets) : '—'} />
      <LiveValue icon={<ReceiptText className="h-4 w-4" />} label={copy.session.averageTicket} value={summary ? formatMoney(tickets > 0 ? sales / tickets : 0, currency, locale) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.expectedCash} value={summary ? formatMoney(Number(summary.expectedCashAmount), currency, locale) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.countedCash} value={summary ? formatMoney(Number(summary.countedCashAmount || 0), currency, locale) : '—'} />
      <LiveValue icon={<CircleDollarSign className="h-4 w-4" />} label={copy.session.difference} value={summary ? formatMoney(difference, currency, locale) : '—'} alert={Boolean(summary && Math.abs(difference) >= 0.01)} />
    </div>
  </div>;
}

function LiveValue({ icon, label, value, highlight = false, alert = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean; alert?: boolean }) {
  const tone = alert ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10' : highlight ? 'border-[#FF6B5E]/30 bg-[#FFF3F1] dark:bg-[#FF6B5E]/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60';
  return <div className={`rounded-lg border p-3 ${tone}`}><div className={`flex items-center gap-1.5 text-xs ${alert ? 'text-red-600' : 'text-slate-500'}`}>{icon}{label}</div><strong className={`mt-1 block text-base font-medium ${alert ? 'text-red-700 dark:text-red-300' : 'text-slate-950 dark:text-white'}`}>{value}</strong></div>;
}

function formatMoney(value: number, currency: string, locale = 'en-CA') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function StatusBadge({ copy, register, shift }: { copy: CashRegistersCopy; register: PosCashRegisterResponse | null; shift: PosShiftResponse | null }) {
  const label = !register ? copy.row.statuses.needsRegister : shift ? (shift.status === 'CLOSING' ? copy.row.statuses.closing : copy.row.statuses.open) : register.active && register.status === 'ACTIVE' ? copy.row.statuses.available : copy.row.statuses.inactive;
  const tone = !register ? 'bg-orange-100 text-orange-800' : shift ? (shift.status === 'CLOSING' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800') : register.active && register.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}

function EditRegisterModal({ copy, register, warehouses, saving, onClose, onSave }: { copy: CashRegistersCopy; register: PosCashRegisterResponse; warehouses: PosWarehouseSummary[]; saving: boolean; onClose: () => void; onSave: (payload: PosCashRegisterCreatePayload) => Promise<void> }) {
  const [warehouseId, setWarehouseId] = useState(String(register.warehouseId));
  const [code, setCode] = useState(register.code);
  const [name, setName] = useState(register.name);
  const [active, setActive] = useState(register.active && register.status === 'ACTIVE');
  const payload = { warehouseId: Number(warehouseId), code: code.trim().toUpperCase(), name: name.trim(), status: active ? 'ACTIVE' as const : 'INACTIVE' as const, active, notes: register.notes };
  return <PosModalFrame modalType="standard-form" closeLabel={copy.editModal.closeLabel} eyebrow={copy.editModal.eyebrow} icon={<Pencil className="h-6 w-6" />} isCloseDisabled={saving} onClose={onClose} size="md" subtitle={copy.editModal.subtitle} title={copy.editModal.title} tone="coral" footerClassName={posModalModuleFooterClassName} footerLeading={<button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>{copy.editModal.cancel}</button>} footer={<button type="button" disabled={saving || !code.trim() || !name.trim()} onClick={() => void onSave(payload)} className={posModalPrimaryActionClassName}>{saving ? copy.editModal.saving : copy.editModal.save}</button>}>
    <div className="space-y-4"><label className="block text-sm font-medium">{copy.editModal.warehouse}<select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-950">{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">{copy.editModal.code}<input value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 dark:border-slate-600 dark:bg-slate-950" /></label><label className="block text-sm font-medium">{copy.editModal.name}<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 dark:border-slate-600 dark:bg-slate-950" /></label></div><label className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700"><span><strong className="block text-sm font-medium">{copy.editModal.activeTitle}</strong><span className="text-xs text-slate-500">{copy.editModal.activeHelp}</span></span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-5 w-5" /></label></div>
  </PosModalFrame>;
}
