import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  ChefHat,
  CircleCheck,
  CircleHelp,
  Copy,
  CreditCard,
  ExternalLink,
  FileDown,
  Link2,
  LayoutGrid,
  LockKeyhole,
  Monitor,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Power,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
  UsersRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from '../../../components/frontend-os';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../shared/components/PointOfSaleTitleBar';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';
import {
  posKioskAdminApi,
  type PosKioskAdminItem,
  type PosKioskConnectionStatus,
  type PosKioskStatus,
} from './posKioskAdminApi';
import { KioskEditModal } from './KioskEditModal';
import { downloadKioskQrPosterPdf } from './kioskQrPosterPdf';
import { KioskModalFrame } from '../../../components/kiosk-engine/KioskModalFrame';

type KioskExperience = 'customer-display' | 'self-service' | 'self-checkout' | 'advisor-queue' | 'restaurant-waiter' | 'restaurant-tables' | 'restaurant-kitchen';
export type CreatableKioskExperience = Extract<KioskExperience, 'customer-display' | 'self-service' | 'self-checkout' | 'restaurant-waiter' | 'restaurant-tables' | 'restaurant-kitchen'>;
type ConnectionFilter = 'all' | PosKioskConnectionStatus;
type ColumnId = 'type' | 'scope' | 'shift' | 'connection' | 'activity' | 'expiration' | 'link';
type KioskSortKey = 'name' | ColumnId;
type KioskSortDirection = 'asc' | 'desc';
type KioskResizableColumn = KioskSortKey | 'actions';
type KioskColumnWidths = Record<KioskResizableColumn, number>;

const KIOSK_COLUMN_WIDTHS_STORAGE_KEY = 'indice:pos:kiosks:column-widths:v1';
const KIOSK_MAX_COLUMN_WIDTH = 720;
const KIOSK_DEFAULT_COLUMN_WIDTHS: KioskColumnWidths = {
  name: 270,
  type: 190,
  scope: 250,
  shift: 250,
  connection: 180,
  activity: 190,
  expiration: 160,
  link: 200,
  actions: 374,
};
const KIOSK_CONTENT_MINIMUM_WIDTHS: KioskColumnWidths = {
  name: 220,
  type: 150,
  scope: 190,
  shift: 210,
  connection: 150,
  activity: 160,
  expiration: 130,
  link: 160,
  actions: 374,
};

const defaultColumns: Array<{ id: ColumnId; visible: boolean }> = [
  { id: 'type', visible: true },
  { id: 'scope', visible: true },
  { id: 'shift', visible: true },
  { id: 'connection', visible: true },
  { id: 'activity', visible: true },
  { id: 'expiration', visible: true },
  { id: 'link', visible: true },
];

function estimateHeaderWidth(label: string, sortable: boolean) {
  const textWidth = Array.from(label).reduce((width, character) => width + (character === ' ' ? 4 : 7.4), 0);
  return Math.ceil(textWidth + (sortable ? 76 : 54));
}

function getKioskMinimumColumnWidths(center: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']['center']): KioskColumnWidths {
  const minimums = { ...KIOSK_CONTENT_MINIMUM_WIDTHS };
  const labels: Record<KioskSortKey, string> = {
    name: center.name,
    type: center.type,
    scope: center.scope,
    shift: center.shiftStatus,
    connection: center.connection,
    activity: center.lastActivity,
    expiration: center.expires,
    link: center.link,
  };
  (Object.keys(labels) as KioskSortKey[]).forEach((column) => {
    minimums[column] = Math.max(KIOSK_CONTENT_MINIMUM_WIDTHS[column], estimateHeaderWidth(labels[column], true));
  });
  minimums.actions = Math.max(KIOSK_CONTENT_MINIMUM_WIDTHS.actions, estimateHeaderWidth(center.actions, false));
  return minimums;
}

function getDefaultKioskColumnWidths(minimumWidths: KioskColumnWidths): KioskColumnWidths {
  return Object.fromEntries(
    (Object.keys(KIOSK_DEFAULT_COLUMN_WIDTHS) as KioskResizableColumn[]).map((column) => [
      column,
      Math.max(KIOSK_DEFAULT_COLUMN_WIDTHS[column], minimumWidths[column]),
    ]),
  ) as KioskColumnWidths;
}

function loadKioskColumnWidths(minimumWidths: KioskColumnWidths): KioskColumnWidths {
  const defaults = getDefaultKioskColumnWidths(minimumWidths);
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = JSON.parse(window.localStorage.getItem(KIOSK_COLUMN_WIDTHS_STORAGE_KEY) ?? 'null') as Partial<KioskColumnWidths> | null;
    const columns = Object.keys(defaults) as KioskResizableColumn[];
    if (!stored || !columns.every((column) => (
      Number.isFinite(stored[column])
      && Number(stored[column]) >= minimumWidths[column]
      && Number(stored[column]) <= KIOSK_MAX_COLUMN_WIDTH
    ))) return defaults;
    return { ...defaults, ...stored } as KioskColumnWidths;
  } catch {
    return defaults;
  }
}

function resizeKioskColumn(widths: KioskColumnWidths, column: KioskResizableColumn, delta: number, minimumWidth: number) {
  return {
    ...widths,
    [column]: Math.round(Math.min(Math.max(widths[column] + delta, minimumWidth), KIOSK_MAX_COLUMN_WIDTH)),
  };
}

function kioskCashRegisterFilterValue(row: PosKioskAdminItem) {
  if (row.assignment.cashRegisterId != null) return `id:${row.assignment.cashRegisterId}`;
  const code = row.assignment.cashRegisterCode?.trim() ?? '';
  const name = row.assignment.cashRegisterName?.trim() ?? '';
  return code || name ? `legacy:${code}:${name}` : 'unassigned';
}

function kioskCashRegisterFilterLabel(row: PosKioskAdminItem, unassignedLabel: string) {
  const name = row.assignment.cashRegisterName?.trim();
  const code = row.assignment.cashRegisterCode?.trim();
  if (name && code) return `${name} · ${code}`;
  return name || code || row.assignment.secondaryLabel?.trim() || unassignedLabel;
}

export function KioskCenterWorkspace({ onCreateView, refreshKey = 0, createdKioskName = '' }: { onCreateView: (view: CreatableKioskExperience) => void; refreshKey?: number; createdKioskName?: string }) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const minimumColumnWidths = useMemo(() => getKioskMinimumColumnWidths(copy.center), [copy.center]);
  const [rows, setRows] = useState<PosKioskAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [cashRegisterFilter, setCashRegisterFilter] = useState('all');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState(defaultColumns);
  const [showColumns, setShowColumns] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCreateType, setSelectedCreateType] = useState<KioskExperience>('self-checkout');
  const [editingKiosk, setEditingKiosk] = useState<PosKioskAdminItem | null>(null);
  const [traceKiosk, setTraceKiosk] = useState<PosKioskAdminItem | null>(null);
  const [pendingAction, setPendingAction] = useState<{ row: PosKioskAdminItem; action: 'rotate' | 'delete' } | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [sortKey, setSortKey] = useState<KioskSortKey>('name');
  const [sortDirection, setSortDirection] = useState<KioskSortDirection>('asc');
  const [columnWidths, setColumnWidths] = useState<KioskColumnWidths>(() => loadKioskColumnWidths(minimumColumnWidths));

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await posKioskAdminApi.list());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.center.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refreshKey > 0) {
      setQuery('');
      setCashRegisterFilter('all');
      setConnectionFilter('all');
      setPage(1);
      setNotice(copy.center.createdFeedback(createdKioskName));
    }
    void reload();
  }, [refreshKey]);

  useEffect(() => {
    const refreshOperationalState = () => {
      if (document.visibilityState !== 'visible') return;
      void posKioskAdminApi.list()
        .then((items) => {
          setRows(items);
          setError('');
        })
        .catch(() => undefined);
    };
    const intervalId = window.setInterval(refreshOperationalState, 20_000);
    window.addEventListener('focus', refreshOperationalState);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshOperationalState);
    };
  }, []);

  useEffect(() => {
    setColumnWidths((current) => {
      const next = { ...current };
      let changed = false;
      (Object.keys(current) as KioskResizableColumn[]).forEach((column) => {
        const safeWidth = Math.min(Math.max(current[column], minimumColumnWidths[column]), KIOSK_MAX_COLUMN_WIDTH);
        if (safeWidth !== current[column]) {
          next[column] = safeWidth;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [minimumColumnWidths]);

  useEffect(() => {
    try {
      window.localStorage.setItem(KIOSK_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {
      // Column resizing remains available when browser storage is unavailable.
    }
  }, [columnWidths]);

  const cashRegisters = useMemo(() => {
    const options = new Map<string, string>();
    rows.forEach((row) => {
      const value = kioskCashRegisterFilterValue(row);
      if (!options.has(value)) options.set(value, kioskCashRegisterFilterLabel(row, copy.center.unassigned));
    });
    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, locale));
  }, [copy.center.unassigned, locale, rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return rows.filter((row) => (
      (!normalizedQuery || `${row.name} ${row.code} ${row.assignment.primaryLabel} ${row.assignment.secondaryLabel} ${row.assignment.cashRegisterName ?? ''} ${row.assignment.cashRegisterCode ?? ''}`.toLocaleLowerCase(locale).includes(normalizedQuery))
      && (cashRegisterFilter === 'all' || kioskCashRegisterFilterValue(row) === cashRegisterFilter)
      && (connectionFilter === 'all' || row.connectionStatus === connectionFilter)
    ));
  }, [cashRegisterFilter, connectionFilter, locale, query, rows]);

  const sortedRows = useMemo(() => [...filteredRows].sort((left, right) => {
    const primary = compareKioskRows(left, right, sortKey, locale);
    const directional = sortDirection === 'asc' ? primary : -primary;
    return directional || left.id - right.id;
  }), [filteredRows, locale, sortDirection, sortKey]);

  useEffect(() => { setPage(1); }, [query, cashRegisterFilter, connectionFilter, pageSize, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = sortedRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, sortedRows.length);
  const visibleRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleColumnIds = columns.filter((column) => column.visible).map((column) => column.id);
  const resizableColumns: KioskResizableColumn[] = ['name', ...visibleColumnIds, 'actions'];
  const tableWidth = resizableColumns.reduce((total, column) => total + columnWidths[column], 0);
  const defaultColumnWidths = useMemo(() => getDefaultKioskColumnWidths(minimumColumnWidths), [minimumColumnWidths]);
  const enabledCount = rows.filter((row) => row.status === 'ACTIVE').length;
  const readyCount = rows.filter((row) => row.status === 'ACTIVE' && resolveKioskShiftState(row) === 'open').length;

  const sortBy = (column: KioskSortKey) => {
    if (column === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(column);
    setSortDirection('asc');
  };

  const resizeColumnBy = (column: KioskResizableColumn, delta: number) => {
    setColumnWidths((current) => resizeKioskColumn(current, column, delta, minimumColumnWidths[column]));
  };

  const startColumnResize = (event: React.PointerEvent<HTMLSpanElement>, column: KioskResizableColumn) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = { ...columnWidths };
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      setColumnWidths(resizeKioskColumn(
        startWidths,
        column,
        pointerEvent.clientX - startX,
        minimumColumnWidths[column],
      ));
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

  const resetColumnWidths = () => setColumnWidths(defaultColumnWidths);

  const continueCreate = () => {
    if (!isCreatableKioskExperience(selectedCreateType)) return;
    setShowCreate(false);
    onCreateView(selectedCreateType);
  };

  const accessUrl = (path: string) => /^https?:\/\//.test(path)
    ? path
    : `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;

  const runAction = async (row: PosKioskAdminItem, action: 'access' | 'copy' | 'pdf' | 'toggle') => {
    const actionKey = `${action}-${row.id}`;
    setBusyAction(actionKey);
    setError('');
    setNotice('');
    try {
      if (action === 'toggle') {
        await posKioskAdminApi.setEnabled(row.id, row.status !== 'ACTIVE', copy.center.tableAdministrationReason);
        setNotice(row.status === 'ACTIVE' ? copy.center.disabledFeedback : copy.center.enabledFeedback);
        await reload();
        return;
      }
      const access = await posKioskAdminApi.access(row.id);
      const url = accessUrl(access.displayUrl);
      if (action === 'access') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (action === 'copy') {
        await navigator.clipboard.writeText(url);
        setNotice(copy.center.copied);
      } else {
        await downloadKioskQrPosterPdf({
          kioskName: row.name,
          kioskCode: row.code,
          publicUrl: url,
          kioskType: row.kioskType === 'self_checkout' ? 'self_checkout' : 'self_service',
          assignmentLabel: [row.assignment.primaryLabel, row.assignment.secondaryLabel].filter(Boolean).join(' - '),
          locale,
        });
        setNotice(copy.center.qrPdfDownloaded);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.center.actionError);
    } finally {
      setBusyAction('');
    }
  };

  const confirmSensitiveAction = async () => {
    if (!pendingAction) return;
    const actionKey = `${pendingAction.action}-${pendingAction.row.id}`;
    setBusyAction(actionKey);
    setError('');
    setNotice('');
    try {
      if (pendingAction.action === 'rotate') {
        const access = await posKioskAdminApi.rotateAccess(pendingAction.row.id);
        try {
          await navigator.clipboard.writeText(accessUrl(access.displayUrl));
          setNotice(copy.center.regeneratedAndCopied);
        } catch {
          setNotice(copy.center.regeneratedFeedback);
        }
      } else {
        await posKioskAdminApi.delete(pendingAction.row.id, copy.center.tableAdministrationReason);
        setNotice(copy.center.deletedFeedback);
      }
      setPendingAction(null);
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.center.actionError);
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="space-y-5">
      <PointOfSaleTitleBar
        icon="🖥️"
        title={copy.center.title}
        subtitle={copy.center.description}
        actions={(
          <>
            <button type="button" onClick={() => setShowColumns(true)} className={pointOfSaleTitleBarSecondaryActionClassName}>
              <Columns3 className="h-4 w-4" />
              {copy.center.columns}
            </button>
            <button type="button" onClick={() => void reload()} disabled={loading} className={pointOfSaleTitleBarSecondaryActionClassName}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {copy.center.refresh}
            </button>
            <button type="button" onClick={() => setShowCreate(true)} className={pointOfSaleTitleBarPrimaryActionClassName}>
              <Plus className="h-4 w-4" />
              {copy.center.create}
            </button>
          </>
        )}
      />

      <IndiceFilterBar
        title={copy.center.filters}
        gridClassName="lg:grid-cols-[minmax(18rem,2fr)_repeat(2,minmax(14rem,1fr))]"
      >
        <IndiceFilterSearch
          label={copy.center.search}
          value={query}
          onValueChange={setQuery}
          onClear={() => setQuery('')}
          clearLabel={copy.center.search}
          placeholder={copy.center.searchPlaceholder}
          tone="coral"
        />
        <IndiceFilterSelect
          label={copy.center.cashRegister}
          value={cashRegisterFilter}
          onValueChange={setCashRegisterFilter}
          options={[
            { value: 'all', label: copy.center.allCashRegisters },
            ...cashRegisters.map(({ value, label }) => ({ value, label })),
          ]}
          tone="coral"
        />
        <IndiceFilterSelect
          label={copy.center.connection}
          value={connectionFilter}
          onValueChange={(value) => setConnectionFilter(value as ConnectionFilter)}
          options={[
            { value: 'all', label: copy.center.allConnections },
            { value: 'ONLINE', label: copy.center.online },
            { value: 'OFFLINE', label: copy.center.offline },
            { value: 'NEVER_CONNECTED', label: copy.center.neverConnected },
          ]}
          tone="coral"
        />
      </IndiceFilterBar>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div> : null}
      <p className="text-sm text-slate-600 dark:text-slate-300">{copy.center.insight(filteredRows.length, rows.length, enabledCount, readyCount)}</p>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto overscroll-x-contain">
          <table style={{ width: `${tableWidth}px`, minWidth: '100%' }} className="table-fixed divide-y divide-slate-200 text-sm leading-5 dark:divide-slate-700">
            <colgroup>
              <col style={{ width: `${columnWidths.name}px` }} />
              {visibleColumnIds.map((column) => <col key={column} style={{ width: `${columnWidths[column]}px` }} />)}
              <col style={{ width: `${columnWidths.actions}px` }} />
            </colgroup>
            <thead className="bg-slate-50 text-[13px] font-normal leading-4 text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr className="h-[52px]">
                <KioskTableHead
                  column="name"
                  label={copy.center.name}
                  sortDirection={sortDirection}
                  sortKey={sortKey}
                  ascendingLabel={copy.center.ascending}
                  descendingLabel={copy.center.descending}
                  onSort={sortBy}
                  resizeHandle={<KioskColumnResizeHandle
                    currentWidth={columnWidths.name}
                    minimumWidth={minimumColumnWidths.name}
                    label={copy.center.resizeColumn(copy.center.name)}
                    onPointerDown={(event) => startColumnResize(event, 'name')}
                    onResizeBy={(delta) => resizeColumnBy('name', delta)}
                    onReset={resetColumnWidths}
                  />}
                />
                {visibleColumnIds.map((column) => (
                  <KioskTableHead
                    key={column}
                    column={column}
                    label={columnLabel(column, copy.center)}
                    sortDirection={sortDirection}
                    sortKey={sortKey}
                    ascendingLabel={copy.center.ascending}
                    descendingLabel={copy.center.descending}
                    onSort={sortBy}
                    resizeHandle={<KioskColumnResizeHandle
                      currentWidth={columnWidths[column]}
                      minimumWidth={minimumColumnWidths[column]}
                      label={copy.center.resizeColumn(columnLabel(column, copy.center))}
                      onPointerDown={(event) => startColumnResize(event, column)}
                      onResizeBy={(delta) => resizeColumnBy(column, delta)}
                      onReset={resetColumnWidths}
                    />}
                  />
                ))}
                <th scope="col" className="relative px-4 text-right text-[13px] font-normal leading-4">
                  <span className="whitespace-nowrap">{copy.center.actions}</span>
                  <KioskColumnResizeHandle
                    currentWidth={columnWidths.actions}
                    minimumWidth={minimumColumnWidths.actions}
                    label={copy.center.resizeColumn(copy.center.actions)}
                    onPointerDown={(event) => startColumnResize(event, 'actions')}
                    onResizeBy={(delta) => resizeColumnBy('actions', delta)}
                    onReset={resetColumnWidths}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={visibleColumnIds.length + 2} className="px-5 py-14 text-center text-slate-500">{copy.center.loading}</td></tr> : null}
              {!loading && visibleRows.length === 0 ? <tr><td colSpan={visibleColumnIds.length + 2} className="px-5 py-14 text-center text-slate-500">{copy.center.empty}</td></tr> : null}
              {!loading && visibleRows.map((row) => <KioskRow
                key={row.id}
                row={row}
                columns={visibleColumnIds}
                locale={locale}
                busyAction={busyAction}
                onEdit={() => setEditingKiosk(row)}
                onTrace={() => setTraceKiosk(row)}
                onAccess={() => void runAction(row, 'access')}
                onCopy={() => void runAction(row, 'copy')}
                onDownloadQrPdf={() => void runAction(row, 'pdf')}
                onRotate={() => setPendingAction({ row, action: 'rotate' })}
                onToggle={() => void runAction(row, 'toggle')}
                onDelete={() => setPendingAction({ row, action: 'delete' })}
              />)}
            </tbody>
          </table>
        </div>
        <PointOfSaleTablePagination currentPage={safePage} itemLabel={copy.center.itemsLabel} onPageChange={setPage} onPageSizeChange={setPageSize} pageEnd={pageEnd} pageSize={pageSize} pageStart={pageStart} totalCount={sortedRows.length} totalPages={totalPages} />
      </section>

      {showCreate ? <CreateKioskModal selected={selectedCreateType} onSelected={setSelectedCreateType} onClose={() => setShowCreate(false)} onContinue={continueCreate} /> : null}
      {showColumns ? <KioskColumnsModal columns={columns} onClose={() => setShowColumns(false)} onApply={setColumns} /> : null}
      {editingKiosk ? <KioskEditModal kiosk={editingKiosk} onClose={() => setEditingKiosk(null)} onSaved={(name) => { setEditingKiosk(null); setNotice(`${name} se actualizó correctamente.`); void reload(); }} /> : null}
      {traceKiosk?.assignment.ecosystemId ? <RestaurantTraceModal kiosk={traceKiosk} onClose={() => setTraceKiosk(null)} /> : null}
      {pendingAction ? <KioskSensitiveActionModal pending={pendingAction} busy={Boolean(busyAction)} onClose={() => setPendingAction(null)} onConfirm={() => void confirmSensitiveAction()} /> : null}
    </div>
  );
}

function KioskTableHead({ column, label, sortDirection, sortKey, ascendingLabel, descendingLabel, onSort, resizeHandle }: {
  column: KioskSortKey;
  label: string;
  sortDirection: KioskSortDirection;
  sortKey: KioskSortKey;
  ascendingLabel: string;
  descendingLabel: string;
  onSort: (column: KioskSortKey) => void;
  resizeHandle: React.ReactNode;
}) {
  const isActive = column === sortKey;
  const nextDirection = isActive && sortDirection === 'asc' ? 'desc' : 'asc';
  const sortLabel = `${label}: ${nextDirection === 'asc' ? ascendingLabel : descendingLabel}`;
  const SortIcon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="relative px-4 text-left"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={sortLabel}
        title={sortLabel}
        className={`group inline-flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md pr-2 text-left text-[13px] font-normal leading-4 outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 ${isActive ? 'text-[#B63B32] dark:text-[#FFB0AA]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'}`}
      >
        <span className="whitespace-nowrap">{label}</span>
        <SortIcon className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`} aria-hidden="true" />
      </button>
      {resizeHandle}
    </th>
  );
}

function KioskColumnResizeHandle({ currentWidth, label, minimumWidth, onPointerDown, onReset, onResizeBy }: {
  currentWidth: number;
  label: string;
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
      aria-valuemax={KIOSK_MAX_COLUMN_WIDTH}
      aria-valuemin={Math.round(minimumWidth)}
      aria-valuenow={Math.round(currentWidth)}
      aria-valuetext={`${Math.round(currentWidth)} px`}
      tabIndex={0}
      title={label}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReset();
      }}
      onKeyDown={(event) => {
        const delta = event.shiftKey ? 24 : 8;
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

function KioskRow({ row, columns, locale, busyAction, onEdit, onTrace, onAccess, onCopy, onDownloadQrPdf, onRotate, onToggle, onDelete }: {
  row: PosKioskAdminItem;
  columns: ColumnId[];
  locale: string;
  busyAction: string;
  onEdit: () => void;
  onTrace: () => void;
  onAccess: () => void;
  onCopy: () => void;
  onDownloadQrPdf: () => void;
  onRotate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { copy } = usePointOfSaleKioskTranslations();
  const busy = busyAction.endsWith(`-${row.id}`);
  const shiftState = resolveKioskShiftState(row);
  return <tr className="h-16 align-middle transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/60">
    <td className="overflow-hidden px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]">{row.kioskType === 'customer_display' ? <Monitor className="h-5 w-5" /> : row.kioskType === 'self_checkout' ? <CreditCard className="h-5 w-5" /> : row.kioskType === 'waiter_station' ? <UtensilsCrossed className="h-5 w-5" /> : row.kioskType === 'table_order_center' ? <LayoutGrid className="h-5 w-5" /> : row.kioskType === 'kitchen_display' ? <ChefHat className="h-5 w-5" /> : <ShoppingBasket className="h-5 w-5" />}</span><div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><p className="truncate text-sm font-medium text-slate-950 dark:text-white" title={row.name}>{row.name}</p><KioskStatusBadge status={row.status} configurationStatus={row.configurationStatus} /></div><p className="truncate text-xs font-normal text-slate-500" title={row.code}>{row.code}</p></div></div></td>
    {columns.map((column) => <td key={column} className="overflow-hidden px-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-200">{renderColumn(column, row, locale, copy)}</td>)}
    <td className="px-3 py-3 text-right"><div className="inline-flex items-center justify-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
      <RowAction icon={<Pencil className="h-4 w-4" />} label={copy.center.edit} disabled={!row.actions.edit || busy} onClick={onEdit} tone="module" />
      {row.assignment.ecosystemId ? <RowAction icon={<Network className="h-4 w-4" />} label="Ver ecosistema" disabled={busy} onClick={onTrace} tone="green" /> : null}
      <RowAction icon={<ExternalLink className="h-4 w-4" />} label={shiftState === 'open' ? copy.center.access : shiftState === 'unknown' ? copy.center.accessCheckingRegister : copy.center.accessWithClosedRegister} disabled={!row.actions.access || busy} onClick={onAccess} tone={shiftState === 'closed' || shiftState === 'unassigned' ? 'amber' : 'module'} />
      <RowAction icon={<Copy className="h-4 w-4" />} label={copy.center.copyLink} disabled={!row.actions.copy || busy} onClick={onCopy} tone="blue" />
      {row.kioskType === 'self_service' || row.kioskType === 'self_checkout' ? <RowAction icon={<FileDown className="h-4 w-4" />} label={copy.center.downloadQrPdf} disabled={!row.actions.access || busy} onClick={onDownloadQrPdf} /> : null}
      <RowAction icon={<RefreshCw className="h-4 w-4" />} label={copy.center.rotateAccess} disabled={!row.actions.rotate || busy} onClick={onRotate} tone="violet" />
      <RowAction icon={<Power className="h-4 w-4" />} label={row.status === 'ACTIVE' ? copy.center.disable : copy.center.enable} disabled={!row.actions.toggle || busy} onClick={onToggle} tone={row.status === 'ACTIVE' ? 'amber' : 'green'} />
      <RowAction icon={<Trash2 className="h-4 w-4" />} label={copy.center.deleteKiosk} disabled={!row.actions.delete || busy} onClick={onDelete} tone="red" />
    </div></td>
  </tr>;
}

function RowAction({ icon, label, disabled, onClick, tone = 'neutral' }: { icon: React.ReactNode; label: string; disabled: boolean; onClick: () => void; tone?: 'neutral' | 'module' | 'amber' | 'blue' | 'violet' | 'green' | 'red' }) {
  const toneClasses = {
    neutral: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
    module: 'border-[#FFB0AA] bg-[#FFF4F2] text-[#B63B32] hover:bg-[#FFE7E3] dark:bg-[#FF6B5E]/10',
    amber: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10',
    violet: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10',
    red: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10',
  }[tone];
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses}`}>{icon}<span className="sr-only">{label}</span></button>;
}

function KioskStatusBadge({ status, configurationStatus }: { status: PosKioskStatus; configurationStatus: PosKioskAdminItem['configurationStatus'] }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const effectiveStatus = configurationStatus === 'INCOMPLETE' ? 'INCOMPLETE' : status;
  const labels = { ACTIVE: copy.center.enabledStatus, DISABLED: copy.center.disabledStatus, REVOKED: copy.common.revoked, EXPIRED: copy.center.accessExpired, INCOMPLETE: copy.center.incomplete };
  const classes = effectiveStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : effectiveStatus === 'DISABLED' || effectiveStatus === 'INCOMPLETE' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${classes}`}>{labels[effectiveStatus]}</span>;
}

function renderColumn(column: ColumnId, row: PosKioskAdminItem, locale: string, copy: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']) {
  if (column === 'type') return row.kioskType === 'customer_display'
    ? copy.center.customerDisplay
    : row.kioskType === 'self_checkout'
      ? copy.workspace.selfCheckoutTab
      : row.kioskType === 'waiter_station'
        ? copy.center.waiter
        : row.kioskType === 'table_order_center'
          ? copy.center.tables
          : row.kioskType === 'kitchen_display'
            ? copy.center.kitchen
      : copy.center.selfService;
  if (column === 'scope') return <div><p className="font-medium text-slate-800 dark:text-white">{row.assignment.primaryLabel || copy.center.unassigned}</p><p className="text-xs text-slate-500">{row.assignment.secondaryLabel}</p></div>;
  if (column === 'shift') {
    const shiftState = resolveKioskShiftState(row);
    if (shiftState === 'open') {
      return <div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><CircleCheck className="h-4 w-4" />{copy.center.shiftOpen}</span><p className="mt-1 text-xs text-slate-500">{copy.center.shiftOpenHelp}</p></div>;
    }
    if (shiftState === 'unassigned') {
      return <div><span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"><CircleHelp className="h-4 w-4" />{copy.center.noSourceRegister}</span><p className="mt-1 text-xs text-slate-500">{copy.center.noSourceRegisterHelp}</p></div>;
    }
    if (shiftState === 'unknown') {
      return <div><span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"><CircleHelp className="h-4 w-4" />{copy.center.shiftChecking}</span><p className="mt-1 max-w-44 text-xs text-slate-500">{copy.center.shiftCheckingHelp}</p></div>;
    }
    return <div><span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"><LockKeyhole className="h-4 w-4" />{copy.center.shiftClosed}</span><p className="mt-1 max-w-44 text-xs text-amber-700">{copy.center.shiftClosedHelp}</p></div>;
  }
  if (column === 'connection') return <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${row.connectionStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : row.connectionStatus === 'OFFLINE' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{row.connectionStatus === 'ONLINE' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{row.connectionStatus === 'ONLINE' ? copy.center.online : row.connectionStatus === 'OFFLINE' ? copy.center.offline : copy.center.neverConnected}</span>;
  if (column === 'activity') return row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString(locale) : copy.center.noActivity;
  if (column === 'expiration') {
    if (!row.expiresAt) return copy.center.noExpiration;
    return new Date(row.expiresAt).getTime() <= Date.now() ? copy.center.expiredValidity : new Date(row.expiresAt).toLocaleDateString(locale);
  }
  return <div><span className="inline-flex items-center gap-2 text-xs font-medium"><Link2 className="h-4 w-4" />{copy.center.protectedLink}</span><p className="mt-1 font-mono text-xs text-slate-400">••••{row.publicTokenHint}</p>{!row.accessRecoverable ? <p className="mt-1 text-[11px] text-amber-700">{copy.center.regenerateToAccess}</p> : null}</div>;
}

type KioskShiftState = 'open' | 'closed' | 'unassigned' | 'unknown';

function resolveKioskShiftState(row: PosKioskAdminItem): KioskShiftState {
  if (row.operationalStatus === 'READY' || row.sourceRegisterOpen === true) return 'open';
  if (row.operationalStatus === 'SOURCE_REGISTER_UNASSIGNED') return 'unassigned';
  if (row.operationalStatus === 'SOURCE_REGISTER_CLOSED' || row.sourceRegisterOpen === false) return 'closed';
  return 'unknown';
}

function kioskSortValue(row: PosKioskAdminItem, column: KioskSortKey): string | number {
  if (column === 'name') return row.name;
  if (column === 'type') return row.kioskType;
  if (column === 'scope') return `${row.assignment.primaryLabel} ${row.assignment.secondaryLabel}`;
  if (column === 'shift') return { open: 0, closed: 1, unknown: 2, unassigned: 3 }[resolveKioskShiftState(row)];
  if (column === 'connection') return row.connectionStatus;
  if (column === 'activity') return row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : Number.NEGATIVE_INFINITY;
  if (column === 'expiration') return row.expiresAt ? new Date(row.expiresAt).getTime() : Number.POSITIVE_INFINITY;
  return row.publicTokenHint;
}

function compareKioskRows(left: PosKioskAdminItem, right: PosKioskAdminItem, column: KioskSortKey, locale: string) {
  const leftValue = kioskSortValue(left, column);
  const rightValue = kioskSortValue(right, column);
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue;
  return String(leftValue).localeCompare(String(rightValue), locale, { numeric: true, sensitivity: 'base' });
}

function columnLabel(column: ColumnId, center: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']['center']) {
  return { type: center.type, scope: center.scope, shift: center.shiftStatus, connection: center.connection, activity: center.lastActivity, expiration: center.expires, link: center.link }[column];
}

function RestaurantTraceModal({ kiosk, onClose }: { kiosk: PosKioskAdminItem; onClose: () => void }) {
  const ecosystemId = kiosk.assignment.ecosystemId as number;
  const [data, setData] = useState<Awaited<ReturnType<typeof posKioskAdminApi.restaurantTrace>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void posKioskAdminApi.restaurantTrace(ecosystemId)
      .then(value => { if (active) setData(value); })
      .catch(requestError => active && setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar la trazabilidad.'));
    return () => { active = false; };
  }, [ecosystemId]);
  return (
    <KioskModalFrame
      open
      onOpenChange={open => { if (!open) onClose(); }}
      surface="administration"
      size="workspace"
      tone="coral"
      eyebrow="Ecosistema de restaurante"
      icon={<Network className="h-5 w-5" />}
      title={kiosk.assignment.ecosystemName || kiosk.name}
      description="Conexiones, comandas y recorrido auditado hasta la caja y el ticket."
      footer={<button type="button" onClick={onClose} className={posModalPrimaryActionClassName}>Cerrar</button>}
    >
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : !data ? <p className="py-16 text-center text-sm text-slate-500">Cargando ecosistema…</p> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <section className="space-y-3"><h3 className="text-base font-medium">Conexiones</h3>{data.kiosks.map(item => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-slate-500">{restaurantKioskTypeLabel(item.kioskType)} · {item.assignment.secondaryLabel}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${item.connectionStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.connectionStatus === 'ONLINE' ? 'En línea' : item.connectionStatus === 'OFFLINE' ? 'Fuera de línea' : 'Sin conexión'}</span></div></article>)}</section>
          <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-base font-medium">Trazabilidad reciente</h3><span className="text-xs text-slate-500">{data.orders.length} comandas · {data.events.length} eventos</span></div><div className="max-h-[480px] space-y-2 overflow-y-auto">{data.events.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Todavía no hay actividad operativa.</p> : data.events.map((event, index) => <article key={String(event.id ?? index)} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{String(event.eventType ?? 'Evento')}</p><p className="mt-1 text-xs text-slate-500">{[event.tableName, event.orderNumber, event.ticketNumber].filter(Boolean).join(' · ') || 'Ecosistema'}</p></div><time className="shrink-0 text-[10px] text-slate-400">{event.createdAt ? new Date(String(event.createdAt)).toLocaleString() : ''}</time></div>{event.toStatus ? <p className="mt-2 text-xs text-[#B63B32]">{String(event.fromStatus ?? '—')} → {String(event.toStatus)}</p> : null}</article>)}</div></section>
        </div>
      )}
    </KioskModalFrame>
  );
}

function restaurantKioskTypeLabel(type: PosKioskAdminItem['kioskType']) {
  if (type === 'waiter_station') return 'Estación de mesero';
  if (type === 'table_order_center') return 'Centro de órdenes';
  if (type === 'kitchen_display') return 'Pantalla de cocina';
  return type;
}

function CreateKioskModal({ selected, onSelected, onClose, onContinue }: { selected: KioskExperience; onSelected: (value: KioskExperience) => void; onClose: () => void; onContinue: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const options = [
    { id: 'self-checkout' as const, audience: 'customer' as const, icon: CreditCard, title: copy.workspace.selfCheckoutTab, description: copy.center.checkoutDescription, maturity: 'prototype' as const },
    { id: 'self-service' as const, audience: 'customer' as const, icon: ShoppingBasket, title: copy.workspace.selfServiceTab, description: copy.center.serviceDescription, maturity: 'operational' as const },
    { id: 'customer-display' as const, audience: 'customer' as const, icon: Monitor, title: copy.center.customerDisplay, description: copy.center.displayDescription, maturity: 'operational' as const },
    { id: 'advisor-queue' as const, audience: 'customer' as const, icon: UsersRound, title: copy.center.advisorQueue, description: copy.center.advisorQueueDescription, maturity: 'planned' as const },
    { id: 'restaurant-waiter' as const, audience: 'operation' as const, icon: UtensilsCrossed, title: copy.center.waiter, description: copy.center.waiterDescription, maturity: 'operational' as const },
    { id: 'restaurant-tables' as const, audience: 'operation' as const, icon: LayoutGrid, title: copy.center.tables, description: copy.center.tablesDescription, maturity: 'operational' as const },
    { id: 'restaurant-kitchen' as const, audience: 'operation' as const, icon: ChefHat, title: copy.center.kitchen, description: copy.center.kitchenDescription, maturity: 'operational' as const },
  ];
  const actionLabel = copy.center.continue;
  const renderGroup = (audience: 'customer' | 'operation', label: string) => <section><p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-300">{label}</p><div className="grid gap-3 md:grid-cols-2">{options.filter((option) => option.audience === audience).map(({ id, icon: Icon, title, description, maturity }) => {
    const selectable = maturity !== 'planned';
    const badge = maturity === 'operational' ? copy.center.operational : maturity === 'prototype' ? copy.center.uxDemo : copy.center.comingSoon;
    return <button key={id} type="button" disabled={!selectable} onClick={() => onSelected(id)} className={`flex gap-4 rounded-xl border p-4 text-left disabled:cursor-not-allowed ${selected === id ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : selectable ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' : 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900/50'}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#B63B32] dark:bg-slate-950"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="block text-sm font-medium text-slate-950 dark:text-white">{title}</strong><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${maturity === 'operational' ? 'bg-emerald-50 text-emerald-700' : maturity === 'prototype' ? 'bg-[#FF6B5E]/15 text-[#B63B32]' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{badge}</span></span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-300">{description}</span></span></button>;
  })}</div></section>;
  return <PosModalFrame modalType="standard-form" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={<Plus className="h-6 w-6" />} onClose={onClose} title={copy.center.createTitle} subtitle={copy.center.createDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<div className="flex gap-3"><button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button><button type="button" onClick={onContinue} disabled={!isCreatableKioskExperience(selected)} className={posModalPrimaryActionClassName}>{actionLabel}</button></div>}>
    <div className="space-y-5">{renderGroup('customer', copy.center.customerExperiences)}{renderGroup('operation', copy.center.operationExperiences)}</div>
    <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-300">{copy.center.sharedFoundationHelp}</p>
  </PosModalFrame>;
}

function isCreatableKioskExperience(view: KioskExperience): view is CreatableKioskExperience {
  return view === 'customer-display' || view === 'self-service' || view === 'self-checkout'
    || view === 'restaurant-waiter' || view === 'restaurant-tables' || view === 'restaurant-kitchen';
}

function KioskSensitiveActionModal({ pending, busy, onClose, onConfirm }: { pending: { row: PosKioskAdminItem; action: 'rotate' | 'delete' }; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const deleting = pending.action === 'delete';
  return <PosModalFrame modalType="confirmation" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={deleting ? <Trash2 className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />} isCloseDisabled={busy} onClose={onClose} title={deleting ? copy.center.deleteTitle : copy.center.rotateTitle} subtitle={deleting ? copy.center.deleteDescription : copy.center.rotateDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<div className="flex gap-3"><button type="button" onClick={onClose} disabled={busy} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button><button type="button" onClick={onConfirm} disabled={busy} className={posModalPrimaryActionClassName}>{busy ? copy.common.processing : deleting ? copy.center.deleteKiosk : copy.center.rotateAccess}</button></div>}>
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="font-medium">{pending.row.name}</p><p className="mt-1 text-xs text-slate-500">{pending.row.code} · ••••{pending.row.publicTokenHint}</p></div>
  </PosModalFrame>;
}

function KioskColumnsModal({ columns, onClose, onApply }: { columns: Array<{ id: ColumnId; visible: boolean }>; onClose: () => void; onApply: (columns: Array<{ id: ColumnId; visible: boolean }>) => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [draft, setDraft] = useState(columns);
  return <PosModalFrame modalType="standard-form" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={<Columns3 className="h-6 w-6" />} onClose={onClose} title={copy.center.columnsTitle} subtitle={copy.center.columnsDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<div className="flex gap-3"><button type="button" onClick={() => setDraft(defaultColumns)} className={posModalSecondaryActionClassName}><RotateCcw className="h-4 w-4" />{copy.center.restore}</button><button type="button" onClick={() => { onApply(draft); onClose(); }} className={posModalPrimaryActionClassName}>{copy.center.apply}</button></div>}>
    <div className="space-y-2">{draft.map((column) => <label key={column.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><input type="checkbox" checked={column.visible} onChange={() => setDraft((current) => current.map((item) => item.id === column.id ? { ...item, visible: !item.visible } : item))} className="h-4 w-4 accent-[#FF6B5E]" /><span className="text-sm font-medium">{columnLabel(column.id, copy.center)}</span></label>)}</div>
  </PosModalFrame>;
}
