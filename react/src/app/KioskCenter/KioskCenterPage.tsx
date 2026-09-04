import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Clock3,
  Eye,
  History,
  KeyRound,
  Layers3,
  MapPin,
  MonitorSmartphone,
  Power,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  kioskCenterApi,
  type KioskCenterAuditEvent,
  type KioskCenterItem,
  type KioskCenterLifecycleAction,
} from '../api/kioskCenter';
import { ApiClientError } from '../lib/apiClient';
import { FailureToast } from '../components/FailureToast';
import { LoadingBarOverlay } from '../components/LoadingBarOverlay';
import { SuccessToast } from '../components/SuccessToast';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
  useIndiceFilterDisclosureCopy,
} from '../components/frontend-os';
import { KioskAdminActionButton } from '../components/kiosk-engine/KioskAdminPrimitives';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import {
  getIndiceTableMinimumWidth,
  IndiceOperationalTable,
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from '../components/table/IndiceTableEngine';
import { DataTablePagination } from '../components/table/DataTablePagination';
import { Button } from '../components/ui/button';
import { TableBody, TableCell, TableRow } from '../components/ui/table';
import { cn } from '../components/ui/utils';
import { useLanguage } from '../shared/context';
import { getKioskCenterCopy, type KioskCenterCopy } from './kioskCenterTranslations';
import { KioskStatusNavigator } from './components/KioskStatusNavigator';

type DetailTab = 'overview' | 'audit';
type InventoryOverviewFilter = 'ALL' | 'ACTIVE' | 'ATTENTION';
type InventoryColumnId = 'kiosk' | 'module' | 'scope' | 'activity' | 'status';
type PendingLifecycle = {
  action: KioskCenterLifecycleAction;
  kiosk: KioskCenterItem;
};

const inventoryColumnDefaults: Record<InventoryColumnId, number> = {
  kiosk: 280,
  module: 210,
  scope: 220,
  activity: 210,
  status: 220,
};
const inventoryActionsWidth = 132;

const safeSnapshotKeys = new Set([
  'name',
  'code',
  'status',
  'owner_module',
  'kiosk_type',
  'unit_id',
  'business_id',
  'location_id',
  'legacy_reference_id',
  'reason',
  'access_level',
  'configuration_version',
  'adapter_version',
]);

const statusStyles: Record<string, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  DISABLED: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  EXPIRED: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  REVOKED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
  DELETED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300',
};

const riskStyles: Record<string, string> = {
  EXPIRED: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  EXPIRING_SOON: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200',
  REVOKED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
  REPEATED_FAILURES: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
};

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const humanize = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, character => character.toUpperCase());

const dictionaryLabel = (dictionary: Record<string, string>, value: string) => (
  dictionary[value] ?? humanize(value)
);

const validDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string | undefined, locale: string) => {
  const date = validDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatRelativeDate = (value: string | undefined, locale: string) => {
  const date = validDate(value);
  if (!date) return '';
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (absoluteSeconds < 60) return formatter.format(deltaSeconds, 'second');
  if (absoluteSeconds < 3600) return formatter.format(Math.round(deltaSeconds / 60), 'minute');
  if (absoluteSeconds < 86400) return formatter.format(Math.round(deltaSeconds / 3600), 'hour');
  return formatter.format(Math.round(deltaSeconds / 86400), 'day');
};

const adminPathFor = (kiosk: KioskCenterItem) => {
  const query = new URLSearchParams({
    kioskId: String(kiosk.id),
    kioskType: kiosk.kiosk_type,
  });
  const route = (() => {
    switch (kiosk.owner_module) {
      case 'PROCESS_TASKS': return '/processes-tasks/calendar';
      case 'EXPENSES': return '/expenses/expenses';
      case 'PETTY_CASH': return '/petty-cash/cash';
      case 'HUMAN_RESOURCES': return '/human-resources/control';
      case 'POINT_OF_SALE': return '/point-of-sale/kiosks';
      case 'SALES': return '/inventory/products';
      case 'PROCUREMENT': return '/inventory/purchase-orders';
      default: return null;
    }
  })();
  return route ? `${route}?${query.toString()}` : null;
};

const safeModuleReference = (value?: string) => {
  if (!value || value.length > 80 || /https?:|token|secret|pin|password/i.test(value)) return '';
  if (/[a-f0-9]{32,}/i.test(value) || /[A-Za-z0-9_-]{40,}/.test(value)) return '';
  return value;
};

const safeSnapshotEntries = (snapshot?: Record<string, unknown>) => {
  if (!snapshot) return [];
  return Object.entries(snapshot).flatMap(([key, value]) => {
    if (!safeSnapshotKeys.has(key) || !['string', 'number', 'boolean'].includes(typeof value)) return [];
    const rendered = String(value).slice(0, 160);
    return [[humanize(key), rendered] as const];
  });
};

const errorMessage = (error: unknown, copy: KioskCenterCopy, fallback: string) => {
  if (error instanceof ApiClientError) {
    if (error.status === 403) return copy.error.forbidden;
    if (error.status === 404) return copy.error.unavailable;
  }
  return fallback;
};

function StatusBadge({ copy, status }: { copy: KioskCenterCopy; status: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', statusStyles[status] ?? statusStyles.DISABLED)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'ACTIVE' ? 'bg-emerald-500' : status === 'REVOKED' || status === 'DELETED' ? 'bg-red-500' : 'bg-current')} />
      {dictionaryLabel(copy.status, status)}
    </span>
  );
}

function RiskBadges({ copy, risks }: { copy: KioskCenterCopy; risks: string[] }) {
  if (risks.length === 0) {
    return <span className="text-xs font-medium text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {risks.map(risk => (
        <span key={risk} className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', riskStyles[risk] ?? riskStyles.EXPIRING_SOON)}>
          {dictionaryLabel(copy.risks, risk)}
        </span>
      ))}
    </div>
  );
}

function ScopeSummary({ copy, kiosk }: { copy: KioskCenterCopy; kiosk: KioskCenterItem }) {
  const primary = kiosk.business_name ?? kiosk.unit_name ?? copy.labels.corporate;
  const secondary = kiosk.business_name && kiosk.unit_name ? kiosk.unit_name : null;
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{primary}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
        {secondary ?? (kiosk.location_id ? `${copy.labels.location} #${kiosk.location_id}` : copy.labels.corporate)}
      </p>
    </div>
  );
}

function AccessSummary({ copy, kiosk }: { copy: KioskCenterCopy; kiosk: KioskCenterItem }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {dictionaryLabel(copy.accessLevels, kiosk.access_level)}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {kiosk.access_methods.length > 0
          ? kiosk.access_methods.map(method => dictionaryLabel(copy.accessMethods, method)).join(' · ')
          : '—'}
      </p>
    </div>
  );
}

function ActivitySummary({ copy, kiosk }: { copy: KioskCenterCopy; kiosk: KioskCenterItem }) {
  if (!kiosk.last_activity_at) {
    return <span className="text-xs font-medium text-slate-400">{copy.labels.never}</span>;
  }
  return (
    <div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {formatRelativeDate(kiosk.last_activity_at, copy.locale)}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {formatDate(kiosk.last_activity_at, copy.locale)}
      </p>
    </div>
  );
}

function KioskActions({
  copy,
  kiosk,
  onDetail,
  onOpenAdmin,
}: {
  copy: KioskCenterCopy;
  kiosk: KioskCenterItem;
  onDetail: (kiosk: KioskCenterItem) => void;
  onOpenAdmin: (kiosk: KioskCenterItem) => void;
}) {
  const adminPath = adminPathFor(kiosk);
  return (
    <IndiceTableActionGroup>
      <KioskAdminActionButton accent="aqua" onClick={() => onDetail(kiosk)} label={copy.actions.inspect}>
        <Eye className="h-4 w-4" />
      </KioskAdminActionButton>
      {adminPath ? (
        <KioskAdminActionButton accent="aqua" onClick={() => onOpenAdmin(kiosk)} label={copy.actions.openAdmin}>
          <ArrowUpRight className="h-4 w-4" />
        </KioskAdminActionButton>
      ) : null}
    </IndiceTableActionGroup>
  );
}

function AuditTimeline({
  audit,
  copy,
  error,
  loading,
  onRetry,
}: {
  audit: KioskCenterAuditEvent[];
  copy: KioskCenterCopy;
  error: string;
  loading: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map(index => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
        <p className="text-sm font-medium">{error}</p>
        <Button type="button" variant="outline" onClick={onRetry} className="mt-4">{copy.error.retry}</Button>
      </div>
    );
  }
  if (audit.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <History className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{copy.detail.auditEmpty}</p>
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {audit.map(event => {
        const snapshot = safeSnapshotEntries(event.snapshot);
        const reference = safeModuleReference(event.module_reference);
        const succeeded = event.outcome === 'SUCCEEDED' || event.outcome === 'SUCCESS';
        return (
          <li key={event.event_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', succeeded ? 'bg-emerald-500' : 'bg-amber-500')} />
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white">{dictionaryLabel(copy.auditLabels.events, event.event_type)}</h4>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', succeeded ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300')}>{dictionaryLabel(copy.auditLabels.outcomes, event.outcome)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {event.actor_type ? <span>{copy.labels.actor}: {dictionaryLabel(copy.auditLabels.actors, event.actor_type)}</span> : null}
                </div>
              </div>
              <time className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400" dateTime={event.created_at} title={formatDate(event.created_at, copy.locale)}>
                {formatRelativeDate(event.created_at, copy.locale)}
              </time>
            </div>
            {snapshot.length > 0 || event.capability || reference ? (
              <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950/70">
                <summary className="cursor-pointer font-medium text-[#177D66] dark:text-emerald-300">{copy.labels.technicalDetails}</summary>
                <div className="mt-3 space-y-2">
                  {event.capability ? <p className="break-all"><span className="text-slate-500">{copy.labels.capability}:</span> <span className="font-mono text-slate-800 dark:text-slate-100">{event.capability}</span></p> : null}
                  {reference ? <p><span className="text-slate-500">{copy.labels.moduleReference}:</span> <span className="text-slate-800 dark:text-slate-100">{reference}</span></p> : null}
                  {snapshot.length > 0 ? <dl className="grid gap-2 border-t border-slate-200 pt-2 dark:border-slate-800 sm:grid-cols-2">{snapshot.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="truncate text-slate-800 dark:text-slate-100">{value}</dd></div>)}</dl> : null}
                </div>
              </details>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function KioskCenterPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const routeParams = useParams();
  const { currentLanguage } = useLanguage();
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const copy = useMemo(() => getKioskCenterCopy(currentLanguage.code), [currentLanguage.code]);
  const [items, setItems] = useState<KioskCenterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [overviewFilter, setOverviewFilter] = useState<InventoryOverviewFilter>('ALL');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnWidths, setColumnWidths] = useState(inventoryColumnDefaults);
  const [selected, setSelected] = useState<KioskCenterItem | null>(null);
  const [historicalKioskId, setHistoricalKioskId] = useState<number | null>(null);
  const [detail, setDetail] = useState<KioskCenterItem | null>(null);
  const [audit, setAudit] = useState<KioskCenterAuditEvent[]>([]);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [detailLoading, setDetailLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [auditError, setAuditError] = useState('');
  const [pendingLifecycle, setPendingLifecycle] = useState<PendingLifecycle | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [failureMessage, setFailureMessage] = useState('');
  const inventoryRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const handledRouteKioskRef = useRef<number | null>(null);

  const loadInventory = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++inventoryRequestRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const nextItems = await kioskCenterApi.list(signal);
      if (requestId !== inventoryRequestRef.current) return;
      setItems(nextItems);
      setSelected(current => current ? nextItems.find(item => item.id === current.id) ?? current : null);
      setDetail(current => current ? nextItems.find(item => item.id === current.id) ?? current : null);
    } catch (error) {
      if (signal?.aborted || requestId !== inventoryRequestRef.current) return;
      setLoadError(errorMessage(error, copy, copy.error.load));
    } finally {
      if (requestId === inventoryRequestRef.current) setIsLoading(false);
    }
  }, [copy]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInventory(controller.signal);
    return () => controller.abort();
  }, [loadInventory]);

  const loadAudit = useCallback(async (kioskId: number) => {
    setAuditLoading(true);
    setAuditError('');
    try {
      setAudit(await kioskCenterApi.audit(kioskId));
    } catch (error) {
      setAuditError(errorMessage(error, copy, copy.error.audit));
    } finally {
      setAuditLoading(false);
    }
  }, [copy]);

  const openDetail = useCallback(async (kiosk: KioskCenterItem) => {
    const requestId = ++detailRequestRef.current;
    setSelected(kiosk);
    setHistoricalKioskId(null);
    setDetail(kiosk);
    setAudit([]);
    setDetailTab('overview');
    setDetailError('');
    setAuditError('');
    setDetailLoading(true);
    setAuditLoading(true);
    const [detailResult, auditResult] = await Promise.allSettled([
      kioskCenterApi.detail(kiosk.id),
      kioskCenterApi.audit(kiosk.id),
    ]);
    if (requestId !== detailRequestRef.current) return;
    if (detailResult.status === 'fulfilled') {
      setDetail(detailResult.value);
    } else {
      setDetailError(errorMessage(detailResult.reason, copy, copy.error.detail));
    }
    if (auditResult.status === 'fulfilled') {
      setAudit(auditResult.value);
    } else {
      setAuditError(errorMessage(auditResult.reason, copy, copy.error.audit));
    }
    setDetailLoading(false);
    setAuditLoading(false);
  }, [copy]);

  const requestedKioskId = useMemo(() => {
    const firstSegment = routeParams['*']?.split('/').filter(Boolean)[0];
    if (!firstSegment || !/^\d+$/.test(firstSegment)) return null;
    const parsed = Number(firstSegment);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }, [routeParams]);

  useEffect(() => {
    if (!requestedKioskId || isLoading || handledRouteKioskRef.current === requestedKioskId) return;
    handledRouteKioskRef.current = requestedKioskId;
    const liveKiosk = items.find(item => item.id === requestedKioskId);
    if (liveKiosk) {
      void openDetail(liveKiosk);
      return;
    }
    const requestId = ++detailRequestRef.current;
    setSelected(null);
    setDetail(null);
    setHistoricalKioskId(requestedKioskId);
    setDetailTab('audit');
    setAudit([]);
    setAuditError('');
    setAuditLoading(true);
    kioskCenterApi.audit(requestedKioskId)
      .then(events => {
        if (requestId === detailRequestRef.current) setAudit(events);
      })
      .catch(error => {
        if (requestId === detailRequestRef.current) setAuditError(errorMessage(error, copy, copy.error.audit));
      })
      .finally(() => {
        if (requestId === detailRequestRef.current) setAuditLoading(false);
      });
  }, [copy, isLoading, items, openDetail, requestedKioskId]);

  const modules = useMemo(() => Array.from(new Set(items.map(item => item.owner_module)))
    .sort((left, right) => dictionaryLabel(copy.modules, left).localeCompare(dictionaryLabel(copy.modules, right), copy.locale)), [copy, items]);
  const types = useMemo(() => Array.from(new Set(items.map(item => item.kiosk_type)))
    .sort((left, right) => dictionaryLabel(copy.types, left).localeCompare(dictionaryLabel(copy.types, right), copy.locale)), [copy, items]);

  const filteredItems = useMemo(() => {
    const normalized = normalizeSearch(search);
    return items.filter(item => {
      if (overviewFilter === 'ACTIVE' && (item.status !== 'ACTIVE' || item.risk_signals.length > 0)) return false;
      if (overviewFilter === 'ATTENTION' && item.status === 'ACTIVE' && item.risk_signals.length === 0) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (moduleFilter !== 'ALL' && item.owner_module !== moduleFilter) return false;
      if (typeFilter !== 'ALL' && item.kiosk_type !== typeFilter) return false;
      if (riskFilter === 'RISK' && item.risk_signals.length === 0) return false;
      if (!normalized) return true;
      const searchable = [
        item.name,
        item.code,
        item.description,
        item.owner_module,
        dictionaryLabel(copy.modules, item.owner_module),
        item.kiosk_type,
        dictionaryLabel(copy.types, item.kiosk_type),
        item.unit_name,
        item.business_name,
      ].filter(Boolean).join(' ');
      return normalizeSearch(searchable).includes(normalized);
    });
  }, [copy, items, moduleFilter, overviewFilter, riskFilter, search, statusFilter, typeFilter]);

  const hasFilters = Boolean(search.trim()) || overviewFilter !== 'ALL' || [statusFilter, moduleFilter, typeFilter, riskFilter].some(value => value !== 'ALL');
  const activeAdvancedCount = [statusFilter, typeFilter, riskFilter].filter(value => value !== 'ALL').length;
  const activeCount = items.filter(item => item.status === 'ACTIVE').length;
  const attentionCount = items.filter(item => item.status !== 'ACTIVE' || item.risk_signals.length > 0).length;
  const columns = useMemo<Array<IndiceTableColumnDefinition<InventoryColumnId>>>(() => [
    { id: 'kiosk', label: copy.table.kiosk, width: columnWidths.kiosk, defaultWidth: inventoryColumnDefaults.kiosk, contentMinimumWidth: 220, resizeLabel: copy.table.kiosk },
    { id: 'module', label: copy.table.module, width: columnWidths.module, defaultWidth: inventoryColumnDefaults.module, contentMinimumWidth: 170, resizeLabel: copy.table.module },
    { id: 'scope', label: copy.table.scope, width: columnWidths.scope, defaultWidth: inventoryColumnDefaults.scope, contentMinimumWidth: 170, resizeLabel: copy.table.scope },
    { id: 'activity', label: copy.table.activity, width: columnWidths.activity, defaultWidth: inventoryColumnDefaults.activity, contentMinimumWidth: 170, resizeLabel: copy.table.activity },
    { id: 'status', label: copy.table.status, width: columnWidths.status, defaultWidth: inventoryColumnDefaults.status, contentMinimumWidth: 170, resizeLabel: copy.table.status },
  ], [columnWidths, copy]);
  const tableMinimumWidth = getIndiceTableMinimumWidth({ columns, actionsWidth: inventoryActionsWidth });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filteredItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(filteredItems.length, safePage * pageSize);
  const visibleItems = filteredItems.slice(pageStart > 0 ? pageStart - 1 : 0, pageEnd);

  useEffect(() => {
    setPage(1);
  }, [moduleFilter, overviewFilter, riskFilter, search, statusFilter, typeFilter]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setModuleFilter('ALL');
    setTypeFilter('ALL');
    setRiskFilter('ALL');
    setOverviewFilter('ALL');
  };

  const openAdmin = (kiosk: KioskCenterItem) => {
    const path = adminPathFor(kiosk);
    if (path) navigate(path);
  };

  const beginLifecycle = (kiosk: KioskCenterItem, action: KioskCenterLifecycleAction) => {
    setPendingLifecycle({ kiosk, action });
    setLifecycleReason('');
    setFailureMessage('');
  };

  const submitLifecycle = async () => {
    if (!pendingLifecycle || lifecycleReason.trim().length < 8) return;
    setLifecycleBusy(true);
    try {
      const updated = await kioskCenterApi.transition(
        pendingLifecycle.kiosk.id,
        pendingLifecycle.action,
        lifecycleReason,
      );
      setItems(current => current.map(item => item.id === updated.id ? updated : item));
      setSelected(current => current?.id === updated.id ? updated : current);
      setDetail(current => current?.id === updated.id ? updated : current);
      setSuccessMessage(pendingLifecycle.action === 'disable'
        ? copy.lifecycle.successDisable(updated.name)
        : copy.lifecycle.successRevoke(updated.name));
      setPendingLifecycle(null);
      setLifecycleReason('');
      if (selected?.id === updated.id) void loadAudit(updated.id);
    } catch (error) {
      setFailureMessage(errorMessage(error, copy, copy.error.lifecycle));
    } finally {
      setLifecycleBusy(false);
    }
  };

  const detailItem = detail ?? selected;
  const lifecycleIsRevoke = pendingLifecycle?.action === 'revoke';

  return (
    <main className={cn(embedded ? 'pb-12' : 'mx-auto max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8')}>
      <LoadingBarOverlay isVisible={isLoading && items.length === 0 && !loadError} title={copy.loadingTitle} description={copy.loadingDescription} />
      <SuccessToast isVisible={Boolean(successMessage)} message={successMessage} onClose={() => setSuccessMessage('')} />
      <FailureToast isVisible={Boolean(failureMessage)} message={failureMessage} onClose={() => setFailureMessage('')} />

      <div className="space-y-5">
        <IndiceTitleBar
          tone="aqua"
          icon={<MonitorSmartphone className="h-5 w-5" />}
          title={copy.title}
          subtitle={copy.subtitle}
          actions={<Button type="button" variant="outline" onClick={() => void loadInventory()} disabled={isLoading} className="h-11"><RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />{copy.refresh}</Button>}
        />

        {loadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
            <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-6 w-6 shrink-0" /><div><h2 className="text-lg font-medium">{copy.error.title}</h2><p className="mt-2 text-sm leading-6">{loadError}</p><Button type="button" variant="outline" onClick={() => void loadInventory()} className="mt-4 bg-white dark:bg-slate-900">{copy.error.retry}</Button></div></div>
          </div>
        ) : (
          <>
            <KioskStatusNavigator
              ariaLabel={copy.title}
              value={overviewFilter}
              onValueChange={value => { setOverviewFilter(value); setStatusFilter('ALL'); setRiskFilter('ALL'); }}
              items={[
                { value: 'ALL', label: copy.stats.total, count: items.length, icon: Layers3, tone: 'aqua' },
                { value: 'ACTIVE', label: copy.stats.active, count: activeCount, icon: ShieldCheck, tone: 'green' },
                { value: 'ATTENTION', label: copy.stats.attention, count: attentionCount, icon: AlertTriangle, tone: 'amber' },
              ]}
            />

            <IndiceFilterBar
              title={copy.filters.title}
              subtitle={copy.filters.subtitle}
              summary={(
                <IndiceFilterDisclosureActions
                  activeAdvancedCount={activeAdvancedCount}
                  advancedLabel={advancedFiltersOpen ? disclosureCopy.hideFilters : disclosureCopy.moreFilters}
                  clearLabel={disclosureCopy.clearFilters}
                  hasActiveFilters={hasFilters}
                  isAdvancedOpen={advancedFiltersOpen}
                  onClear={clearFilters}
                  onToggleAdvanced={() => setAdvancedFiltersOpen(current => !current)}
                  resultSummary={copy.search.results(filteredItems.length, items.length)}
                  tone="aqua"
                />
              )}
              gridClassName="lg:grid-cols-[minmax(260px,1.5fr)_minmax(220px,0.7fr)]"
            >
              <IndiceFilterSearch label={copy.search.label} placeholder={copy.search.placeholder} tone="aqua" value={search} onValueChange={setSearch} onClear={() => setSearch('')} />
              <IndiceFilterSelect label={copy.search.module} tone="aqua" value={moduleFilter} onValueChange={setModuleFilter} options={[{ value: 'ALL', label: copy.search.all }, ...modules.map(module => ({ value: module, label: dictionaryLabel(copy.modules, module) }))]} />
              {advancedFiltersOpen ? (
                <IndiceFilterAdvancedSection className="md:col-span-2" gridClassName="lg:grid-cols-3">
                  <IndiceFilterSelect label={copy.search.status} tone="aqua" value={statusFilter} onValueChange={value => { setStatusFilter(value); setOverviewFilter('ALL'); }} options={[{ value: 'ALL', label: copy.search.all }, ...Object.keys(copy.status).map(status => ({ value: status, label: dictionaryLabel(copy.status, status) }))]} />
                  <IndiceFilterSelect label={copy.search.type} tone="aqua" value={typeFilter} onValueChange={setTypeFilter} options={[{ value: 'ALL', label: copy.search.all }, ...types.map(type => ({ value: type, label: dictionaryLabel(copy.types, type) }))]} />
                  <IndiceFilterSelect label={copy.search.risk} tone="aqua" value={riskFilter} onValueChange={setRiskFilter} options={[{ value: 'ALL', label: copy.search.all }, { value: 'RISK', label: copy.search.withRisk }]} />
                </IndiceFilterAdvancedSection>
              ) : null}
            </IndiceFilterBar>

            {filteredItems.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-900 sm:px-8">
                <MonitorSmartphone className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                <h2 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">{hasFilters ? copy.empty.filteredTitle : copy.empty.title}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">{hasFilters ? copy.empty.filteredDescription : copy.empty.description}</p>
                {hasFilters ? <Button type="button" variant="outline" onClick={clearFilters} className="mt-5">{copy.search.clear}</Button> : null}
              </div>
            ) : (
              <IndiceTableShell
                pagination={<DataTablePagination attached currentPage={safePage} itemLabel={copy.stats.total.toLocaleLowerCase()} onPageChange={setPage} onPageSizeChange={value => { setPageSize(value); setPage(1); }} pageEnd={pageEnd} pageSize={pageSize} pageSizeOptions={[10, 25, 50]} pageStart={pageStart} totalCount={filteredItems.length} totalPages={totalPages} />}
              >
                <div className="hidden lg:block">
                  <IndiceOperationalTable minimumWidth={tableMinimumWidth}>
                    <IndiceTableColGroup columns={columns} actionsWidth={inventoryActionsWidth} />
                    <IndiceTableHeaderRow columns={columns} actions={{ label: copy.table.actions, width: inventoryActionsWidth }} onResize={(id, width) => setColumnWidths(current => ({ ...current, [id]: width }))} tone="aqua" />
                    <TableBody>
                      {visibleItems.map(kiosk => (
                        <TableRow key={kiosk.id} className="border-slate-200 hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:hover:bg-emerald-950/20">
                          <TableCell className="whitespace-normal px-4 py-4"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:bg-emerald-950/50 dark:text-emerald-300"><MonitorSmartphone className="h-5 w-5" /></span><div className="min-w-0"><button type="button" onClick={() => void openDetail(kiosk)} className="max-w-[220px] truncate text-left text-sm font-medium text-slate-950 hover:text-[#177D66] dark:text-white dark:hover:text-emerald-300">{kiosk.name}</button>{kiosk.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{kiosk.description}</p> : null}</div></div></TableCell>
                          <TableCell className="whitespace-normal px-4 py-4"><p className="text-sm font-medium text-slate-800 dark:text-slate-100">{dictionaryLabel(copy.modules, kiosk.owner_module)}</p><p className="mt-1 text-xs text-slate-500">{dictionaryLabel(copy.types, kiosk.kiosk_type)}</p></TableCell>
                          <TableCell className="px-4 py-4"><ScopeSummary copy={copy} kiosk={kiosk} /></TableCell>
                          <TableCell className="px-4 py-4"><ActivitySummary copy={copy} kiosk={kiosk} /></TableCell>
                          <TableCell className="whitespace-normal px-4 py-4"><div className="flex flex-wrap items-center gap-2"><StatusBadge copy={copy} status={kiosk.status} /><RiskBadges copy={copy} risks={kiosk.risk_signals} /></div></TableCell>
                          <TableCell className="px-4 py-4"><KioskActions copy={copy} kiosk={kiosk} onDetail={item => void openDetail(item)} onOpenAdmin={openAdmin} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </IndiceOperationalTable>
                </div>

                <div className="grid gap-3 p-3 lg:hidden sm:grid-cols-2">
                  {visibleItems.map(kiosk => (
                    <article key={kiosk.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:bg-emerald-950/50 dark:text-emerald-300"><MonitorSmartphone className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-base font-medium text-slate-950 dark:text-white">{kiosk.name}</h3><p className="mt-1 text-xs text-[#177D66] dark:text-emerald-300">{dictionaryLabel(copy.modules, kiosk.owner_module)} · {dictionaryLabel(copy.types, kiosk.kiosk_type)}</p></div><StatusBadge copy={copy} status={kiosk.status} /></div>
                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div><p className="text-xs text-slate-500">{copy.table.scope}</p><div className="mt-1"><ScopeSummary copy={copy} kiosk={kiosk} /></div></div><div><p className="text-xs text-slate-500">{copy.table.activity}</p><div className="mt-1"><ActivitySummary copy={copy} kiosk={kiosk} /></div></div></div>
                      {kiosk.risk_signals.length > 0 ? <div className="mt-3"><RiskBadges copy={copy} risks={kiosk.risk_signals} /></div> : null}
                      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700"><KioskActions copy={copy} kiosk={kiosk} onDetail={item => void openDetail(item)} onOpenAdmin={openAdmin} /></div>
                    </article>
                  ))}
                </div>
              </IndiceTableShell>
            )}
          </>
        )}
      </div>

      <KioskModalFrame
        open={Boolean(selected || historicalKioskId) && !pendingLifecycle}
        onOpenChange={open => { if (!open) { detailRequestRef.current += 1; setSelected(null); setHistoricalKioskId(null); setDetail(null); setAudit([]); } }}
        size="workspace"
        surface="administration"
        tone="aqua"
        icon={<MonitorSmartphone className="h-6 w-6" />}
        eyebrow={copy.detail.eyebrow}
        title={detailItem?.name ?? (historicalKioskId ? copy.detail.historicalTitle(historicalKioskId) : copy.title)}
        description={historicalKioskId ? copy.detail.historicalDescription : copy.detail.description}
        footer={(
          <>
            <Button type="button" variant="outline" onClick={() => { detailRequestRef.current += 1; setSelected(null); setHistoricalKioskId(null); setDetail(null); }}>{copy.actions.close}</Button>
            {detailItem && adminPathFor(detailItem) ? <Button type="button" onClick={() => openAdmin(detailItem)}><ArrowUpRight className="mr-2 h-4 w-4" />{copy.actions.openAdmin}</Button> : null}
          </>
        )}
        footerSummary={detailItem ? `${dictionaryLabel(copy.modules, detailItem.owner_module)} · ${dictionaryLabel(copy.types, detailItem.kiosk_type)}` : undefined}
      >
        {detailItem ? (
          <div className="space-y-5">
            <nav className="flex gap-2 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-900" aria-label={copy.title}>
              {(['overview', 'audit'] as const).map(tab => <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={cn('flex-1 rounded-lg px-4 py-2 text-sm font-medium transition', detailTab === tab ? 'bg-white text-[#177D66] shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white')}>{tab === 'overview' ? copy.detail.overview : copy.detail.audit}{tab === 'audit' && audit.length > 0 ? ` (${audit.length})` : ''}</button>)}
            </nav>
            {detailLoading ? <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">{[0, 1, 2, 3].map(index => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />)}</div> : null}
            {detailError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{detailError}</div> : null}
            {!detailLoading && detailTab === 'overview' ? (
              <>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge copy={copy} status={detailItem.status} /><RiskBadges copy={copy} risks={detailItem.risk_signals} /></div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{detailItem.description ?? copy.labels.noDescription}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><MapPin className="h-5 w-5 text-[#177D66] dark:text-emerald-300" /><p className="mt-3 text-xs font-medium text-slate-500">{copy.table.scope}</p><div className="mt-1"><ScopeSummary copy={copy} kiosk={detailItem} /></div></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><KeyRound className="h-5 w-5 text-[#177D66] dark:text-emerald-300" /><p className="mt-3 text-xs font-medium text-slate-500">{copy.table.access}</p><div className="mt-1"><AccessSummary copy={copy} kiosk={detailItem} /></div></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-300" /><p className="mt-3 text-xs font-medium text-slate-500">{copy.table.activity}</p><div className="mt-1"><ActivitySummary copy={copy} kiosk={detailItem} /></div></div>
                </div>
                <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <summary className="cursor-pointer text-sm font-medium text-[#177D66] dark:text-emerald-300">{copy.labels.technicalDetails}</summary>
                  <dl className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-xs text-slate-500">{copy.search.module}</dt><dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{dictionaryLabel(copy.modules, detailItem.owner_module)}</dd></div>
                    <div><dt className="text-xs text-slate-500">{copy.search.type}</dt><dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{dictionaryLabel(copy.types, detailItem.kiosk_type)}</dd></div>
                    <div><dt className="text-xs text-slate-500">{copy.labels.configVersion}</dt><dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">v{detailItem.configuration_version}</dd></div>
                    <div><dt className="text-xs text-slate-500">{copy.labels.adapterVersion}</dt><dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">v{detailItem.adapter_version}</dd></div>
                    <div><dt className="text-xs text-slate-500">{copy.labels.identifier}</dt><dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">#{detailItem.id}</dd></div>
                    {detailItem.legacy_reference_id ? <div><dt className="text-xs text-slate-500">{copy.labels.legacyIdentifier}</dt><dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">#{detailItem.legacy_reference_id}</dd></div> : null}
                    <div><dt className="text-xs text-slate-500">{copy.labels.expires}</dt><dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{detailItem.expires_at ? formatDate(detailItem.expires_at, copy.locale) : copy.labels.noExpiration}</dd></div>
                    <div><dt className="text-xs text-slate-500">{copy.table.kiosk}</dt><dd className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-white">{detailItem.code}</dd></div>
                  </dl>
                </details>
                <div className="flex flex-wrap justify-end gap-2">
                  {detailItem.status === 'ACTIVE' ? <Button type="button" variant="outline" onClick={() => beginLifecycle(detailItem, 'disable')} className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"><Power className="mr-2 h-4 w-4" />{copy.actions.disable}</Button> : null}
                  {!['REVOKED', 'DELETED'].includes(detailItem.status) ? <Button type="button" variant="outline" onClick={() => beginLifecycle(detailItem, 'revoke')} className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"><Ban className="mr-2 h-4 w-4" />{copy.actions.revoke}</Button> : null}
                </div>
              </>
            ) : null}
            {!detailLoading && detailTab === 'audit' ? <AuditTimeline audit={audit} copy={copy} error={auditError} loading={auditLoading} onRetry={() => void loadAudit(detailItem.id)} /> : null}
          </div>
        ) : historicalKioskId ? (
          <AuditTimeline audit={audit} copy={copy} error={auditError} loading={auditLoading} onRetry={() => void loadAudit(historicalKioskId)} />
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        open={Boolean(pendingLifecycle)}
        onOpenChange={open => { if (!open && !lifecycleBusy) { setPendingLifecycle(null); setLifecycleReason(''); } }}
        size="compact"
        surface="administration"
        tone={lifecycleIsRevoke ? 'coral' : 'yellow'}
        busy={lifecycleBusy}
        icon={lifecycleIsRevoke ? <ShieldAlert className="h-6 w-6" /> : <Power className="h-6 w-6" />}
        eyebrow={lifecycleIsRevoke ? copy.lifecycle.revokeEyebrow : copy.lifecycle.disableEyebrow}
        title={lifecycleIsRevoke ? copy.lifecycle.revokeTitle : copy.lifecycle.disableTitle}
        description={lifecycleIsRevoke ? copy.lifecycle.revokeDescription : copy.lifecycle.disableDescription}
        footer={(
          <>
            <Button type="button" variant="outline" disabled={lifecycleBusy} onClick={() => { setPendingLifecycle(null); setLifecycleReason(''); }}>{copy.lifecycle.cancel}</Button>
            <Button type="button" disabled={lifecycleBusy || lifecycleReason.trim().length < 8} onClick={() => void submitLifecycle()}>{lifecycleBusy ? (lifecycleIsRevoke ? copy.lifecycle.revoking : copy.lifecycle.disabling) : (lifecycleIsRevoke ? copy.lifecycle.confirmRevoke : copy.lifecycle.confirmDisable)}</Button>
          </>
        )}
        footerSummary={pendingLifecycle?.kiosk.name}
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{copy.lifecycle.reason}</span>
          <textarea value={lifecycleReason} onChange={event => setLifecycleReason(event.target.value)} maxLength={500} rows={4} autoFocus className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={copy.lifecycle.reasonPlaceholder} />
          <span className={cn('mt-2 block text-xs font-medium', lifecycleReason.length > 0 && lifecycleReason.trim().length < 8 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400')}>{copy.lifecycle.reasonHelp} · {lifecycleReason.length}/500</span>
        </label>
      </KioskModalFrame>
    </main>
  );
}
