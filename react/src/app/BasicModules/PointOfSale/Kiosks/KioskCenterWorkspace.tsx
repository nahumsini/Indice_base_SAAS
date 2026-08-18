import { useEffect, useMemo, useState } from 'react';
import {
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
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Power,
  ShoppingBasket,
  Trash2,
  UtensilsCrossed,
  UsersRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
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
  type PosKioskType,
} from './posKioskAdminApi';
import { KioskEditModal } from './KioskEditModal';
import { downloadKioskQrPosterPdf } from './kioskQrPosterPdf';

type KioskExperience = 'customer-display' | 'self-service' | 'self-checkout' | 'advisor-queue' | 'restaurant-waiter' | 'restaurant-tables' | 'restaurant-kitchen';
export type CreatableKioskExperience = Extract<KioskExperience, 'customer-display' | 'self-service' | 'self-checkout'>;
type ConnectionFilter = 'all' | PosKioskConnectionStatus;
type ColumnId = 'type' | 'scope' | 'shift' | 'connection' | 'activity' | 'expiration' | 'link';

const defaultColumns: Array<{ id: ColumnId; visible: boolean }> = [
  { id: 'type', visible: true },
  { id: 'scope', visible: true },
  { id: 'shift', visible: true },
  { id: 'connection', visible: true },
  { id: 'activity', visible: true },
  { id: 'expiration', visible: true },
  { id: 'link', visible: true },
];

export function KioskCenterWorkspace({ onCreateView, refreshKey = 0, createdKioskName = '' }: { onCreateView: (view: CreatableKioskExperience) => void; refreshKey?: number; createdKioskName?: string }) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const [rows, setRows] = useState<PosKioskAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PosKioskType>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState(defaultColumns);
  const [showColumns, setShowColumns] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCreateType, setSelectedCreateType] = useState<KioskExperience>('self-checkout');
  const [editingKiosk, setEditingKiosk] = useState<PosKioskAdminItem | null>(null);
  const [pendingAction, setPendingAction] = useState<{ row: PosKioskAdminItem; action: 'rotate' | 'delete' } | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');

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
      setTypeFilter('all');
      setBranchFilter('all');
      setStatusFilter('all');
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

  const branches = useMemo(
    () => Array.from(new Set(rows.map((row) => row.assignment.primaryLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, locale)),
    [locale, rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return rows.filter((row) => (
      (!normalizedQuery || `${row.name} ${row.code} ${row.assignment.primaryLabel} ${row.assignment.secondaryLabel}`.toLocaleLowerCase(locale).includes(normalizedQuery))
      && (typeFilter === 'all' || row.kioskType === typeFilter)
      && (branchFilter === 'all' || row.assignment.primaryLabel === branchFilter)
      && (statusFilter === 'all' || row.status === statusFilter || (statusFilter === 'INCOMPLETE' && row.configurationStatus === 'INCOMPLETE'))
      && (connectionFilter === 'all' || row.connectionStatus === connectionFilter)
    ));
  }, [branchFilter, connectionFilter, locale, query, rows, statusFilter, typeFilter]);

  useEffect(() => { setPage(1); }, [query, typeFilter, branchFilter, statusFilter, connectionFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filteredRows.length);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleColumnIds = columns.filter((column) => column.visible).map((column) => column.id);
  const enabledCount = rows.filter((row) => row.status === 'ACTIVE').length;
  const readyCount = rows.filter((row) => row.status === 'ACTIVE' && resolveKioskShiftState(row) === 'open').length;

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
      <section className="rounded-xl border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#FF6B5E]/25 bg-white text-[#B63B32] dark:bg-slate-950"><Monitor className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-medium text-[#B63B32]">{copy.center.eyebrow}</p>
              <h2 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{copy.center.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{copy.center.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowColumns(true)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#B63B32] dark:border-slate-700 dark:bg-slate-900 dark:text-white"><Columns3 className="h-4 w-4" />{copy.center.columns}</button>
            <button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{copy.center.refresh}</button>
            <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831]"><Plus className="h-4 w-4" />{copy.center.create}</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white">{copy.center.filters}</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterField label={copy.center.search} className="xl:col-span-2">
            <span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.center.searchPlaceholder} className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900" /></span>
          </FilterField>
          <FilterSelect label={copy.center.type} value={typeFilter} onChange={(value) => setTypeFilter(value as 'all' | PosKioskType)} options={[['all', copy.center.allTypes], ['customer_display', copy.center.customerDisplay], ['self_service', copy.center.selfService], ['self_checkout', copy.workspace.selfCheckoutTab]]} />
          <FilterSelect label={copy.center.branch} value={branchFilter} onChange={setBranchFilter} options={[['all', copy.center.allBranches], ...branches.map((branch) => [branch, branch] as [string, string])]} />
          <FilterSelect label={copy.center.status} value={statusFilter} onChange={setStatusFilter} options={[['all', copy.center.allStatuses], ['ACTIVE', copy.center.enabledStatus], ['DISABLED', copy.center.disabledStatus], ['INCOMPLETE', copy.center.incomplete], ['EXPIRED', copy.center.accessExpired]]} />
          <FilterSelect label={copy.center.connection} value={connectionFilter} onChange={(value) => setConnectionFilter(value as ConnectionFilter)} options={[['all', copy.center.allConnections], ['ONLINE', copy.center.online], ['OFFLINE', copy.center.offline], ['NEVER_CONNECTED', copy.center.neverConnected]]} />
        </div>
      </section>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div> : null}
      <p className="text-sm text-slate-600 dark:text-slate-300">{copy.center.insight(filteredRows.length, rows.length, enabledCount, readyCount)}</p>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-[1680px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <tr><th className="px-5 py-4">{copy.center.name}</th>{visibleColumnIds.map((column) => <th key={column} className="px-5 py-4">{columnLabel(column, copy.center)}</th>)}<th className="px-5 py-4 text-right">{copy.center.actions}</th></tr>
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
        <PointOfSaleTablePagination currentPage={safePage} itemLabel={copy.center.itemsLabel} onPageChange={setPage} onPageSizeChange={setPageSize} pageEnd={pageEnd} pageSize={pageSize} pageStart={pageStart} totalCount={filteredRows.length} totalPages={totalPages} />
      </section>

      {showCreate ? <CreateKioskModal selected={selectedCreateType} onSelected={setSelectedCreateType} onClose={() => setShowCreate(false)} onContinue={continueCreate} /> : null}
      {showColumns ? <KioskColumnsModal columns={columns} onClose={() => setShowColumns(false)} onApply={setColumns} /> : null}
      {editingKiosk ? <KioskEditModal kiosk={editingKiosk} onClose={() => setEditingKiosk(null)} onSaved={(name) => { setEditingKiosk(null); setNotice(`${name} se actualizó correctamente.`); void reload(); }} /> : null}
      {pendingAction ? <KioskSensitiveActionModal pending={pendingAction} busy={Boolean(busyAction)} onClose={() => setPendingAction(null)} onConfirm={() => void confirmSensitiveAction()} /> : null}
    </div>
  );
}

function KioskRow({ row, columns, locale, busyAction, onEdit, onAccess, onCopy, onDownloadQrPdf, onRotate, onToggle, onDelete }: {
  row: PosKioskAdminItem;
  columns: ColumnId[];
  locale: string;
  busyAction: string;
  onEdit: () => void;
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
  return <tr className="align-middle hover:bg-slate-50/70 dark:hover:bg-slate-900/60">
    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]">{row.kioskType === 'customer_display' ? <Monitor className="h-5 w-5" /> : row.kioskType === 'self_checkout' ? <CreditCard className="h-5 w-5" /> : <ShoppingBasket className="h-5 w-5" />}</span><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-950 dark:text-white">{row.name}</p><KioskStatusBadge status={row.status} configurationStatus={row.configurationStatus} /></div><p className="text-xs text-slate-500">{row.code}</p></div></div></td>
    {columns.map((column) => <td key={column} className="px-5 py-4 text-slate-600 dark:text-slate-300">{renderColumn(column, row, locale, copy)}</td>)}
    <td className="px-5 py-4"><div className="flex justify-end gap-1.5">
      <RowAction icon={<Pencil className="h-4 w-4" />} label={copy.center.edit} disabled={!row.actions.edit || busy} onClick={onEdit} />
      <RowAction icon={<ExternalLink className="h-4 w-4" />} label={shiftState === 'open' ? copy.center.access : shiftState === 'unknown' ? copy.center.accessCheckingRegister : copy.center.accessWithClosedRegister} disabled={!row.actions.access || busy} onClick={onAccess} primary warning={shiftState === 'closed' || shiftState === 'unassigned'} />
      <RowAction icon={<Copy className="h-4 w-4" />} label={copy.center.copyLink} disabled={!row.actions.copy || busy} onClick={onCopy} compact />
      {row.kioskType === 'self_service' || row.kioskType === 'self_checkout' ? <RowAction icon={<FileDown className="h-4 w-4" />} label={copy.center.downloadQrPdf} disabled={!row.actions.access || busy} onClick={onDownloadQrPdf} compact /> : null}
      <RowAction icon={<RefreshCw className="h-4 w-4" />} label={copy.center.rotateAccess} disabled={!row.actions.rotate || busy} onClick={onRotate} compact />
      <RowAction icon={<Power className="h-4 w-4" />} label={row.status === 'ACTIVE' ? copy.center.disable : copy.center.enable} disabled={!row.actions.toggle || busy} onClick={onToggle} compact />
      <RowAction icon={<Trash2 className="h-4 w-4" />} label={copy.center.deleteKiosk} disabled={!row.actions.delete || busy} onClick={onDelete} compact destructive />
    </div></td>
  </tr>;
}

function RowAction({ icon, label, disabled, onClick, primary = false, warning = false, destructive = false, compact = false }: { icon: React.ReactNode; label: string; disabled: boolean; onClick: () => void; primary?: boolean; warning?: boolean; destructive?: boolean; compact?: boolean }) {
  const classes = primary
    ? warning
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-[#FF6B5E] bg-[#FF6B5E] text-[#222831]'
    : destructive
      ? 'border-red-200 text-red-700'
      : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-white';
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${classes}`}>{icon}{compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}</button>;
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

function columnLabel(column: ColumnId, center: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']['center']) {
  return { type: center.type, scope: center.scope, shift: center.shiftStatus, connection: center.connection, activity: center.lastActivity, expiration: center.expires, link: center.link }[column];
}

function FilterField({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={className}><span className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <FilterField label={label}><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></FilterField>; }

function CreateKioskModal({ selected, onSelected, onClose, onContinue }: { selected: KioskExperience; onSelected: (value: KioskExperience) => void; onClose: () => void; onContinue: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const options = [
    { id: 'self-checkout' as const, audience: 'customer' as const, icon: CreditCard, title: copy.workspace.selfCheckoutTab, description: copy.center.checkoutDescription, maturity: 'prototype' as const },
    { id: 'self-service' as const, audience: 'customer' as const, icon: ShoppingBasket, title: copy.workspace.selfServiceTab, description: copy.center.serviceDescription, maturity: 'operational' as const },
    { id: 'customer-display' as const, audience: 'customer' as const, icon: Monitor, title: copy.center.customerDisplay, description: copy.center.displayDescription, maturity: 'operational' as const },
    { id: 'advisor-queue' as const, audience: 'customer' as const, icon: UsersRound, title: copy.center.advisorQueue, description: copy.center.advisorQueueDescription, maturity: 'planned' as const },
    { id: 'restaurant-waiter' as const, audience: 'operation' as const, icon: UtensilsCrossed, title: copy.center.waiter, description: copy.center.waiterDescription, maturity: 'planned' as const },
    { id: 'restaurant-tables' as const, audience: 'operation' as const, icon: LayoutGrid, title: copy.center.tables, description: copy.center.tablesDescription, maturity: 'planned' as const },
    { id: 'restaurant-kitchen' as const, audience: 'operation' as const, icon: ChefHat, title: copy.center.kitchen, description: copy.center.kitchenDescription, maturity: 'planned' as const },
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
  return view === 'customer-display' || view === 'self-service' || view === 'self-checkout';
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
