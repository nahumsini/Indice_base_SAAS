import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Building2,
  Clock3,
  Eye,
  History,
  KeyRound,
  Layers3,
  MapPin,
  MonitorSmartphone,
  Power,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
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
import { IndiceModalFrame } from '../components/indice-modal';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { useLanguage } from '../shared/context';
import { getKioskCenterCopy, type KioskCenterCopy } from './kioskCenterTranslations';

type DetailTab = 'overview' | 'audit';
type PendingLifecycle = {
  action: KioskCenterLifecycleAction;
  kiosk: KioskCenterItem;
};

const inputClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
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
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', statusStyles[status] ?? statusStyles.DISABLED)}>
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
        <span key={risk} className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold', riskStyles[risk] ?? riskStyles.EXPIRING_SOON)}>
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
      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{primary}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
        {secondary ?? (kiosk.location_id ? `${copy.labels.location} #${kiosk.location_id}` : copy.labels.corporate)}
      </p>
    </div>
  );
}

function AccessSummary({ copy, kiosk }: { copy: KioskCenterCopy; kiosk: KioskCenterItem }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
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
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
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
  onLifecycle,
  onOpenAdmin,
}: {
  copy: KioskCenterCopy;
  kiosk: KioskCenterItem;
  onDetail: (kiosk: KioskCenterItem) => void;
  onLifecycle: (kiosk: KioskCenterItem, action: KioskCenterLifecycleAction) => void;
  onOpenAdmin: (kiosk: KioskCenterItem) => void;
}) {
  const adminPath = adminPathFor(kiosk);
  const canRevoke = !['REVOKED', 'DELETED'].includes(kiosk.status);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button type="button" onClick={() => onDetail(kiosk)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40" aria-label={copy.actions.inspect} title={copy.actions.inspect}>
        <Eye className="h-4 w-4" />
      </button>
      {adminPath ? (
        <button type="button" onClick={() => onOpenAdmin(kiosk)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-700 dark:hover:bg-teal-950/40" aria-label={copy.actions.openAdmin} title={copy.actions.openAdmin}>
          <ArrowUpRight className="h-4 w-4" />
        </button>
      ) : null}
      {kiosk.status === 'ACTIVE' ? (
        <button type="button" onClick={() => onLifecycle(kiosk, 'disable')} className="grid h-9 w-9 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300" aria-label={copy.actions.disable} title={copy.actions.disable}>
          <Power className="h-4 w-4" />
        </button>
      ) : null}
      {canRevoke ? (
        <button type="button" onClick={() => onLifecycle(kiosk, 'revoke')} className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300" aria-label={copy.actions.revoke} title={copy.actions.revoke}>
          <Ban className="h-4 w-4" />
        </button>
      ) : null}
    </div>
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
        <p className="text-sm font-semibold">{error}</p>
        <Button type="button" variant="outline" onClick={onRetry} className="mt-4">{copy.error.retry}</Button>
      </div>
    );
  }
  if (audit.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <History className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{copy.detail.auditEmpty}</p>
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
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{humanize(event.event_type)}</h4>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', succeeded ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300')}>{humanize(event.outcome)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {event.actor_type ? <span>{copy.labels.actor}: {humanize(event.actor_type)}{event.actor_id ? ` #${event.actor_id}` : ''}</span> : null}
                  {event.capability ? <span>{copy.labels.capability}: {event.capability}</span> : null}
                  {reference ? <span>{copy.labels.moduleReference}: {reference}</span> : null}
                </div>
              </div>
              <time className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400" dateTime={event.created_at} title={formatDate(event.created_at, copy.locale)}>
                {formatRelativeDate(event.created_at, copy.locale)}
              </time>
            </div>
            {snapshot.length > 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{copy.labels.safeSnapshot}</p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  {snapshot.map(([label, value]) => (
                    <div key={label} className="min-w-0 text-xs">
                      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                      <dd className="truncate font-semibold text-slate-800 dark:text-slate-100">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function KioskCenterPage() {
  const navigate = useNavigate();
  const routeParams = useParams();
  const { currentLanguage } = useLanguage();
  const copy = useMemo(() => getKioskCenterCopy(currentLanguage.code), [currentLanguage.code]);
  const [items, setItems] = useState<KioskCenterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
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
  }, [copy, items, moduleFilter, riskFilter, search, statusFilter, typeFilter]);

  const hasFilters = Boolean(search.trim()) || [statusFilter, moduleFilter, typeFilter, riskFilter].some(value => value !== 'ALL');
  const activeCount = items.filter(item => item.status === 'ACTIVE').length;
  const attentionCount = items.filter(item => item.status !== 'ACTIVE' || item.risk_signals.length > 0).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setModuleFilter('ALL');
    setTypeFilter('ALL');
    setRiskFilter('ALL');
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
    <main className="mx-auto max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8">
      <LoadingBarOverlay isVisible={isLoading && items.length === 0 && !loadError} title={copy.loadingTitle} description={copy.loadingDescription} />
      <SuccessToast isVisible={Boolean(successMessage)} message={successMessage} onClose={() => setSuccessMessage('')} />
      <FailureToast isVisible={Boolean(failureMessage)} message={failureMessage} onClose={() => setFailureMessage('')} />

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-br from-[#EAF2FF] via-white to-[#E7F7F2] px-5 py-6 dark:border-slate-800 dark:from-blue-950/35 dark:via-slate-950 dark:to-emerald-950/25 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#2563EB] text-white shadow-lg shadow-blue-500/20">
                  <MonitorSmartphone className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB] dark:text-blue-300">{copy.eyebrow}</p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{copy.title}</h1>
                </div>
              </div>
              <p className="mt-4 max-w-4xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{copy.subtitle}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadInventory()} disabled={isLoading} className="h-11 shrink-0 gap-2 rounded-xl bg-white/80 dark:bg-slate-900/80">
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              {copy.refresh}
            </Button>
          </div>
        </div>

        {loadError ? (
          <div className="p-5 sm:p-8">
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold">{copy.error.title}</h2>
                  <p className="mt-2 text-sm leading-6">{loadError}</p>
                  <Button type="button" variant="outline" onClick={() => void loadInventory()} className="mt-4 bg-white dark:bg-slate-900">{copy.error.retry}</Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:grid-cols-2 sm:p-7 xl:grid-cols-4">
              {[
                { label: copy.stats.total, value: items.length, icon: Layers3, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
                { label: copy.stats.active, value: activeCount, icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
                { label: copy.stats.attention, value: attentionCount, icon: AlertTriangle, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
                { label: copy.stats.modules, value: modules.length, icon: Building2, color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
              ].map(metric => (
                <article key={metric.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', metric.color)}><metric.icon className="h-5 w-5" /></span>
                  <div><p className="text-2xl font-black text-slate-950 dark:text-white">{metric.value}</p><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{metric.label}</p></div>
                </article>
              ))}
            </div>

            <div className="border-b border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/30 sm:p-7">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_repeat(4,minmax(140px,0.7fr))]">
                <label className="relative block">
                  <span className="sr-only">{copy.search.label}</span>
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input value={search} onChange={event => setSearch(event.target.value)} className={cn(inputClassName, 'pl-10')} placeholder={copy.search.placeholder} type="search" />
                </label>
                <label><span className="sr-only">{copy.search.status}</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={inputClassName}><option value="ALL">{copy.search.status}: {copy.search.all}</option>{Object.keys(copy.status).map(status => <option key={status} value={status}>{dictionaryLabel(copy.status, status)}</option>)}</select></label>
                <label><span className="sr-only">{copy.search.module}</span><select value={moduleFilter} onChange={event => setModuleFilter(event.target.value)} className={inputClassName}><option value="ALL">{copy.search.module}: {copy.search.all}</option>{modules.map(module => <option key={module} value={module}>{dictionaryLabel(copy.modules, module)}</option>)}</select></label>
                <label><span className="sr-only">{copy.search.type}</span><select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className={inputClassName}><option value="ALL">{copy.search.type}: {copy.search.all}</option>{types.map(type => <option key={type} value={type}>{dictionaryLabel(copy.types, type)}</option>)}</select></label>
                <label><span className="sr-only">{copy.search.risk}</span><select value={riskFilter} onChange={event => setRiskFilter(event.target.value)} className={inputClassName}><option value="ALL">{copy.search.risk}: {copy.search.all}</option><option value="RISK">{copy.search.withRisk}</option></select></label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.search.results(filteredItems.length, items.length)}</p>
                {hasFilters ? <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline dark:text-blue-300"><SlidersHorizontal className="h-3.5 w-3.5" />{copy.search.clear}</button> : null}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="px-5 py-16 text-center sm:px-8">
                <MonitorSmartphone className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{hasFilters ? copy.empty.filteredTitle : copy.empty.title}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">{hasFilters ? copy.empty.filteredDescription : copy.empty.description}</p>
                {hasFilters ? <Button type="button" variant="outline" onClick={clearFilters} className="mt-5">{copy.search.clear}</Button> : null}
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 lg:block">
                  <table className="w-full min-w-[1180px] border-collapse text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr><th className="px-4 py-3">{copy.table.kiosk}</th><th className="px-4 py-3">{copy.table.scope}</th><th className="px-4 py-3">{copy.table.access}</th><th className="px-4 py-3">{copy.table.versions}</th><th className="px-4 py-3">{copy.table.activity}</th><th className="px-4 py-3">{copy.table.risks}</th><th className="px-4 py-3 text-right">{copy.table.actions}</th></tr></thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                      {filteredItems.map(kiosk => (
                        <tr key={kiosk.id} className="transition hover:bg-blue-50/35 dark:hover:bg-blue-950/15">
                          <td className="px-4 py-4"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><MonitorSmartphone className="h-5 w-5" /></span><div className="min-w-0"><button type="button" onClick={() => void openDetail(kiosk)} className="max-w-[260px] truncate text-left text-sm font-bold text-slate-950 hover:text-blue-700 dark:text-white dark:hover:text-blue-300">{kiosk.name}</button><div className="mt-1 flex flex-wrap items-center gap-2"><StatusBadge copy={copy} status={kiosk.status} /><span className="text-xs font-semibold text-slate-500">{kiosk.code}</span></div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dictionaryLabel(copy.modules, kiosk.owner_module)} · {dictionaryLabel(copy.types, kiosk.kiosk_type)}</p></div></div></td>
                          <td className="px-4 py-4"><ScopeSummary copy={copy} kiosk={kiosk} /></td>
                          <td className="px-4 py-4"><AccessSummary copy={copy} kiosk={kiosk} /></td>
                          <td className="px-4 py-4"><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{copy.labels.configVersion} v{kiosk.configuration_version}</p><p className="mt-1 text-xs text-slate-500">{copy.labels.adapterVersion} v{kiosk.adapter_version}</p></td>
                          <td className="px-4 py-4"><ActivitySummary copy={copy} kiosk={kiosk} /></td>
                          <td className="max-w-[210px] px-4 py-4"><RiskBadges copy={copy} risks={kiosk.risk_signals} /></td>
                          <td className="px-4 py-4"><KioskActions copy={copy} kiosk={kiosk} onDetail={item => void openDetail(item)} onLifecycle={beginLifecycle} onOpenAdmin={openAdmin} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 lg:hidden sm:grid-cols-2">
                  {filteredItems.map(kiosk => (
                    <article key={kiosk.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><MonitorSmartphone className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-base font-bold text-slate-950 dark:text-white">{kiosk.name}</h3><p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{kiosk.code}</p></div><StatusBadge copy={copy} status={kiosk.status} /></div>
                      <p className="mt-3 text-xs font-semibold text-blue-700 dark:text-blue-300">{dictionaryLabel(copy.modules, kiosk.owner_module)} · {dictionaryLabel(copy.types, kiosk.kiosk_type)}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{copy.table.scope}</p><div className="mt-1"><ScopeSummary copy={copy} kiosk={kiosk} /></div></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{copy.table.activity}</p><div className="mt-1"><ActivitySummary copy={copy} kiosk={kiosk} /></div></div></div>
                      <div className="mt-3"><RiskBadges copy={copy} risks={kiosk.risk_signals} /></div>
                      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800"><KioskActions copy={copy} kiosk={kiosk} onDetail={item => void openDetail(item)} onLifecycle={beginLifecycle} onOpenAdmin={openAdmin} /></div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <IndiceModalFrame
        open={Boolean(selected || historicalKioskId) && !pendingLifecycle}
        onOpenChange={open => { if (!open) { detailRequestRef.current += 1; setSelected(null); setHistoricalKioskId(null); setDetail(null); setAudit([]); } }}
        modalType="operational-workspace"
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
              {(['overview', 'audit'] as const).map(tab => <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={cn('flex-1 rounded-lg px-4 py-2 text-sm font-bold transition', detailTab === tab ? 'bg-white text-[#177D66] shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white')}>{tab === 'overview' ? copy.detail.overview : copy.detail.audit}{tab === 'audit' && audit.length > 0 ? ` (${audit.length})` : ''}</button>)}
            </nav>
            {detailLoading ? <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">{[0, 1, 2, 3].map(index => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />)}</div> : null}
            {detailError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{detailError}</div> : null}
            {!detailLoading && detailTab === 'overview' ? (
              <>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge copy={copy} status={detailItem.status} /><RiskBadges copy={copy} risks={detailItem.risk_signals} /></div>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{detailItem.description ?? copy.labels.noDescription}</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Tag className="h-5 w-5 text-blue-600 dark:text-blue-300" /><p className="mt-3 text-xs font-semibold text-slate-500">{copy.labels.identifier}</p><p className="mt-1 text-lg font-black text-slate-950 dark:text-white">#{detailItem.id}</p>{detailItem.legacy_reference_id ? <p className="mt-1 text-xs text-slate-500">{copy.labels.legacyIdentifier} #{detailItem.legacy_reference_id}</p> : null}</div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><MapPin className="h-5 w-5 text-teal-600 dark:text-teal-300" /><p className="mt-3 text-xs font-semibold text-slate-500">{copy.table.scope}</p><div className="mt-1"><ScopeSummary copy={copy} kiosk={detailItem} /></div></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><KeyRound className="h-5 w-5 text-violet-600 dark:text-violet-300" /><p className="mt-3 text-xs font-semibold text-slate-500">{copy.table.access}</p><div className="mt-1"><AccessSummary copy={copy} kiosk={detailItem} /></div></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-300" /><p className="mt-3 text-xs font-semibold text-slate-500">{copy.table.activity}</p><div className="mt-1"><ActivitySummary copy={copy} kiosk={detailItem} /></div></div>
                </div>
                <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-4">
                  <div><dt className="text-xs font-semibold text-slate-500">{copy.search.module}</dt><dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{dictionaryLabel(copy.modules, detailItem.owner_module)}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">{copy.search.type}</dt><dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{dictionaryLabel(copy.types, detailItem.kiosk_type)}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">{copy.labels.configVersion}</dt><dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">v{detailItem.configuration_version}</dd></div>
                  <div><dt className="text-xs font-semibold text-slate-500">{copy.labels.adapterVersion}</dt><dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">v{detailItem.adapter_version}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">{copy.labels.expires}</dt><dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{detailItem.expires_at ? formatDate(detailItem.expires_at, copy.locale) : copy.labels.noExpiration}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">{copy.table.kiosk}</dt><dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{detailItem.code}</dd></div>
                </dl>
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
      </IndiceModalFrame>

      <IndiceModalFrame
        open={Boolean(pendingLifecycle)}
        onOpenChange={open => { if (!open && !lifecycleBusy) { setPendingLifecycle(null); setLifecycleReason(''); } }}
        modalType="confirmation"
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
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{copy.lifecycle.reason}</span>
          <textarea value={lifecycleReason} onChange={event => setLifecycleReason(event.target.value)} maxLength={500} rows={4} autoFocus className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder={copy.lifecycle.reasonPlaceholder} />
          <span className={cn('mt-2 block text-xs font-medium', lifecycleReason.length > 0 && lifecycleReason.trim().length < 8 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400')}>{copy.lifecycle.reasonHelp} · {lifecycleReason.length}/500</span>
        </label>
      </IndiceModalFrame>
    </main>
  );
}
