import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock3,
  History,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import {
  kioskCenterApi,
  type KioskCenterAuditEvent,
  type KioskCenterItem,
} from '../api/kioskCenter';
import {
  IndiceFilterBar,
  IndiceFilterSelect,
  IndiceTitleBar,
} from '../components/frontend-os';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { getKioskCenterCopy } from './kioskCenterTranslations';
import type { KioskCenterWorkspaceCopy } from './kioskCenterWorkspaceTranslations';

type OutcomeFilter = 'all' | 'success' | 'attention';

const humanize = (value?: string) => (value ?? '')
  .trim()
  .toLocaleLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, character => character.toLocaleUpperCase());

const isSuccessful = (event: KioskCenterAuditEvent) => (
  event.outcome === 'SUCCEEDED' || event.outcome === 'SUCCESS'
);

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export function KioskActivityView({ copy }: { copy: KioskCenterWorkspaceCopy }) {
  const inventoryCopy = useMemo(() => getKioskCenterCopy(copy.locale), [copy.locale]);
  const [kiosks, setKiosks] = useState<KioskCenterItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [events, setEvents] = useState<KioskCenterAuditEvent[]>([]);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [auditError, setAuditError] = useState('');

  const loadInventory = useCallback(async (signal?: AbortSignal) => {
    setLoadingInventory(true);
    setInventoryError('');
    try {
      const next = await kioskCenterApi.list(signal);
      setKiosks(next);
      setSelectedId(current => current && next.some(kiosk => String(kiosk.id) === current)
        ? current
        : next[0] ? String(next[0].id) : '');
    } catch {
      if (!signal?.aborted) setInventoryError(copy.activity.loadError);
    } finally {
      if (!signal?.aborted) setLoadingInventory(false);
    }
  }, [copy.activity.loadError]);

  const loadAudit = useCallback(async (kioskId: number, signal?: AbortSignal) => {
    setLoadingAudit(true);
    setAuditError('');
    try {
      setEvents(await kioskCenterApi.audit(kioskId, signal));
    } catch {
      if (!signal?.aborted) {
        setEvents([]);
        setAuditError(copy.activity.auditError);
      }
    } finally {
      if (!signal?.aborted) setLoadingAudit(false);
    }
  }, [copy.activity.auditError]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInventory(controller.signal);
    return () => controller.abort();
  }, [loadInventory]);

  useEffect(() => {
    if (!selectedId) {
      setEvents([]);
      return;
    }
    const controller = new AbortController();
    void loadAudit(Number(selectedId), controller.signal);
    return () => controller.abort();
  }, [loadAudit, selectedId]);

  const selectedKiosk = kiosks.find(kiosk => String(kiosk.id) === selectedId);
  const filteredEvents = useMemo(() => events.filter(event => {
    if (outcomeFilter === 'success') return isSuccessful(event);
    if (outcomeFilter === 'attention') return !isSuccessful(event);
    return true;
  }), [events, outcomeFilter]);
  const refresh = () => {
    void loadInventory();
    if (selectedId) void loadAudit(Number(selectedId));
  };

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon={<History className="h-5 w-5" />}
        title={copy.activity.title}
        subtitle={copy.activity.subtitle}
        actions={(
          <Button type="button" variant="outline" onClick={refresh} disabled={loadingInventory || loadingAudit} className="h-11">
            <RefreshCw aria-hidden="true" className={cn('mr-2 h-4 w-4', (loadingInventory || loadingAudit) && 'animate-spin')} />
            {copy.activity.refresh}
          </Button>
        )}
      />

      <aside className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700 dark:border-blue-800 dark:bg-blue-950/25 dark:text-slate-200">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" /><div><h3 className="font-medium text-slate-900 dark:text-white">{copy.activity.guidanceTitle}</h3><p className="mt-1 leading-6">{copy.activity.guidance}</p></div></div>
      </aside>

      <IndiceFilterBar
        title={copy.activity.filtersTitle}
        subtitle={copy.activity.filtersSubtitle}
        summary={selectedKiosk ? `${filteredEvents.length} · ${selectedKiosk.name}` : undefined}
        gridClassName="lg:grid-cols-2"
      >
        <IndiceFilterSelect
          label={copy.activity.kioskLabel}
          tone="blue"
          value={selectedId}
          onValueChange={setSelectedId}
          options={kiosks.map(kiosk => ({
            value: String(kiosk.id),
            label: `${kiosk.name} · ${inventoryCopy.modules[kiosk.owner_module] ?? humanize(kiosk.owner_module)}`,
          }))}
        />
        <IndiceFilterSelect
          label={copy.activity.searchLabel}
          tone="blue"
          value={outcomeFilter}
          onValueChange={value => setOutcomeFilter(value as OutcomeFilter)}
          options={[
            { value: 'all', label: copy.activity.allEvents },
            { value: 'success', label: copy.activity.successful },
            { value: 'attention', label: copy.activity.attention },
          ]}
        />
      </IndiceFilterBar>

      {inventoryError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p>{inventoryError}</p><Button type="button" variant="outline" onClick={() => void loadInventory()} className="mt-4">{copy.activity.retry}</Button>
        </div>
      ) : loadingInventory && kiosks.length === 0 ? (
        <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-busy="true"><RefreshCw className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : auditError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p>{auditError}</p>{selectedId ? <Button type="button" variant="outline" onClick={() => void loadAudit(Number(selectedId))} className="mt-4">{copy.activity.retry}</Button> : null}
        </div>
      ) : loadingAudit ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2].map(index => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />)}</div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <Activity className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-medium text-slate-900 dark:text-white">{copy.activity.empty}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.activity.emptyHelp}</p>
        </div>
      ) : (
        <ol className="space-y-3" aria-label={copy.activity.title}>
          {filteredEvents.map(event => {
            const successful = isSuccessful(event);
            return (
              <li key={event.event_id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', successful ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300')}>
                      {successful ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium text-slate-950 dark:text-white">{humanize(event.event_type)}</h3><span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', successful ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200')}>{humanize(event.outcome)}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">{event.actor_type ? <span>{copy.activity.actor}: {humanize(event.actor_type)}</span> : null}{event.capability ? <span>{copy.activity.capability}: {event.capability}</span> : null}</div></div>
                  </div>
                  <time className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" dateTime={event.created_at}><Clock3 className="h-3.5 w-3.5" />{formatDate(event.created_at, copy.locale)}</time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
