import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Clipboard, ExternalLink, Grid2X2, History, Layers3, Link2, LoaderCircle,
  MoreHorizontal, Pencil, Plus, QrCode, RefreshCw, ShieldCheck, Smartphone,
  UsersRound,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import { KioskAdminActionButton } from '../components/kiosk-engine/KioskAdminPrimitives';
import { useKioskQrCode } from '../components/kiosk-engine/useKioskQrCode';
import {
  IndiceAdminWorkspaceHeader,
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
  IndiceWorkspaceNavigation,
} from '../components/frontend-os';
import { IndiceTableActionGroup } from '../components/table/IndiceTableEngine';
import { useLanguage } from '../shared/context';
import { getCachedAuthSession } from '../api/authSessionStore';
import { canManageMultiKiosks } from '../access/tabScopeCatalog';
import {
  multiKioskAdminApi,
  type MultiKioskStatus,
  type MultiKioskSummary,
} from '../api/multiKiosks';
import KioskCenterPage from './KioskCenterPage';
import { KioskAccessView } from './KioskAccessView';
import { KioskActivityView } from './KioskActivityView';
import {
  getKioskCenterWorkspaceCopy,
  type KioskCenterWorkspaceView,
} from './kioskCenterWorkspaceTranslations';
import {
  MultiKioskCommandConfirmationModal,
  MultiKioskOptionsModal,
  type MultiKioskPendingCommand,
} from './MultiKioskLifecycleModals';
import { getMultiKioskAdminCopy } from './multiKioskAdminTranslations';
import { KioskStatusNavigator } from './components/KioskStatusNavigator';
import {
  createEmptyMultiKioskEditor,
  mapMultiKioskDetailToEditor,
  MultiKioskEditorModal,
  type MultiKioskCatalog,
  type MultiKioskEditorState,
} from './MultiKioskEditorModal';

const statusClasses: Record<MultiKioskStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  DISABLED: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  EXPIRED: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  REVOKED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
};

const multiKioskThemeClasses: Record<string, { accent: string; icon: string }> = {
  'indice-blue': {
    accent: 'bg-[#2563EB]',
    icon: 'bg-blue-50 text-[#2563EB] ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900',
  },
  'indice-green': {
    accent: 'bg-[#147514]',
    icon: 'bg-emerald-50 text-[#147514] ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900',
  },
  'indice-yellow': {
    accent: 'bg-[#F4C84A]',
    icon: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900',
  },
  'indice-coral': {
    accent: 'bg-[#FF6B5E]',
    icon: 'bg-red-50 text-[#D9483B] ring-red-100 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900',
  },
};

const absoluteAccessUrl = (item?: Pick<MultiKioskSummary, 'access_path'>) => {
  if (!item?.access_path || typeof window === 'undefined') return '';
  return new URL(item.access_path, window.location.origin).toString();
};

type MultiKioskOverviewFilter = 'ALL' | 'ACTIVE' | 'ATTENTION';

function StatusBadge({ label, status }: { label: string; status: MultiKioskStatus }) {
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', statusClasses[status] ?? statusClasses.DISABLED)}>{label}</span>;
}

export default function MultiKioskCenterPage() {
  const navigate = useNavigate();
  const canManageGlobal = canManageMultiKiosks(getCachedAuthSession());
  const { currentLanguage } = useLanguage();
  const workspaceCopy = useMemo(() => getKioskCenterWorkspaceCopy(currentLanguage.code), [currentLanguage.code]);
  const adminCopy = useMemo(() => getMultiKioskAdminCopy(currentLanguage.code), [currentLanguage.code]);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('view') as KioskCenterWorkspaceView | null;
  const activeView: KioskCenterWorkspaceView = canManageGlobal
    ? (requestedView && ['multi-kiosks', 'inventory', 'people', 'activity'].includes(requestedView)
      ? requestedView
      : 'multi-kiosks')
    : 'inventory';
  const [items, setItems] = useState<MultiKioskSummary[]>([]);
  const [catalog, setCatalog] = useState<MultiKioskCatalog>({ tools: [], providerTools: [], kiosks: [], employees: [] });
  const [editor, setEditor] = useState<MultiKioskEditorState | null>(null);
  const [qrItem, setQrItem] = useState<MultiKioskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MultiKioskStatus>('ALL');
  const [overviewFilter, setOverviewFilter] = useState<MultiKioskOverviewFilter>('ALL');
  const [optionsItem, setOptionsItem] = useState<MultiKioskSummary | null>(null);
  const [pendingCommand, setPendingCommand] = useState<MultiKioskPendingCommand | null>(null);
  const activeViewCopy = workspaceCopy.navigation[activeView];
  const qrUrl = absoluteAccessUrl(qrItem ?? undefined);
  const qr = useKioskQrCode(qrUrl, '#2563EB');
  const attentionCount = items.filter(item => item.status !== 'ACTIVE').length;
  const filteredItems = items.filter(item => {
    if (overviewFilter === 'ACTIVE' && item.status !== 'ACTIVE') return false;
    if (overviewFilter === 'ATTENTION' && item.status === 'ACTIVE') return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    const query = search.trim().toLocaleLowerCase();
    if (!query) return true;
    return [item.name, item.description ?? '', workspaceCopy.multi.statuses[item.status] ?? item.status]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query);
  });
  const load = async () => {
    if (!canManageGlobal) {
      setLoading(false);
      return;
    }
    setLoading(true); setError('');
    try { const [nextItems, nextCatalog] = await Promise.all([multiKioskAdminApi.list(), multiKioskAdminApi.catalog()]); setItems(nextItems); setCatalog(nextCatalog); }
    catch { setError(workspaceCopy.multi.loadError); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [canManageGlobal]);
  const edit = async (id: number) => { setBusyId(id); try { setEditor(mapMultiKioskDetailToEditor(await multiKioskAdminApi.detail(id))); } catch { setError(workspaceCopy.multi.openError); } finally { setBusyId(null); } };
  const copyLink = async (item: MultiKioskSummary) => { const url = absoluteAccessUrl(item); if (!url) return; await navigator.clipboard.writeText(url); setCopiedId(item.id); window.setTimeout(() => setCopiedId(current => current === item.id ? null : current), 1800); };
  const changeView = (view: KioskCenterWorkspaceView) => {
    if (!canManageGlobal && view !== 'inventory') return;
    const next = new URLSearchParams(searchParams);
    if (view === 'multi-kiosks') next.delete('view'); else next.set('view', view);
    setSearchParams(next, { replace: true });
  };
  const executeCommand = async () => {
    if (!pendingCommand) return;
    setBusyId(pendingCommand.item.id);
    setError('');
    try {
      if (pendingCommand.action === 'rotate') {
        await multiKioskAdminApi.rotateLink(pendingCommand.item.id);
      } else {
        await multiKioskAdminApi.transition(pendingCommand.item.id, pendingCommand.action);
      }
      setPendingCommand(null);
      await load();
    } catch {
      setError(pendingCommand.action === 'rotate' ? workspaceCopy.multi.rotateError : workspaceCopy.multi.stateError);
    } finally {
      setBusyId(null);
    }
  };
  return (
    <main className="relative mx-auto min-h-[calc(100vh-5.5rem)] max-w-[1600px] bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,0.10),transparent_24rem),radial-gradient(circle_at_85%_8%,rgba(96,165,250,0.10),transparent_26rem)] px-4 pb-12 sm:px-6 lg:px-8">
      <header
        data-kiosk-center-sticky-header
        className="sticky top-0 z-30 -mx-4 mb-5 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <IndiceAdminWorkspaceHeader
          backLabel={workspaceCopy.backToDashboard}
          icon={<Grid2X2 />}
          onBack={() => navigate('/dashboard')}
          title={adminCopy.center.title}
          subtitle={(
            <>
              <span className="font-medium text-[var(--indice-brand-action)] dark:text-blue-300">{activeViewCopy.label}</span>
              <span aria-hidden="true"> · </span>
              {activeViewCopy.description}
            </>
          )}
          navigation={(
            <IndiceWorkspaceNavigation
              ariaLabel={workspaceCopy.navigationLabel}
              className="min-w-max flex-nowrap"
              value={activeView}
              onValueChange={changeView}
              tone="blue"
              items={canManageGlobal ? [
                { id: 'multi-kiosks', label: workspaceCopy.navigation['multi-kiosks'].label, icon: <Grid2X2 />, description: workspaceCopy.navigation['multi-kiosks'].description },
                { id: 'inventory', label: workspaceCopy.navigation.inventory.label, icon: <Layers3 />, description: workspaceCopy.navigation.inventory.description },
                { id: 'people', label: workspaceCopy.navigation.people.label, icon: <UsersRound />, description: workspaceCopy.navigation.people.description },
                { id: 'activity', label: workspaceCopy.navigation.activity.label, icon: <History />, description: workspaceCopy.navigation.activity.description },
              ] : [
                { id: 'inventory', label: workspaceCopy.navigation.inventory.label, icon: <Layers3 />, description: workspaceCopy.navigation.inventory.description },
              ]}
            />
          )}
        />
      </header>

      {activeView === 'multi-kiosks' ? (
        <div className="space-y-5">
          <IndiceTitleBar
            tone="blue"
            icon={<Grid2X2 className="h-5 w-5" />}
            title={workspaceCopy.navigation['multi-kiosks'].label}
            subtitle={adminCopy.center.subtitle}
            actions={canManageGlobal ? (
              <Button type="button" onClick={() => setEditor(createEmptyMultiKioskEditor())} aria-label={adminCopy.center.create} className="h-10 rounded-xl bg-[var(--indice-brand-action)] px-4 text-white shadow-sm hover:bg-[var(--indice-brand-action-hover)]">
                <Plus className="mr-2 h-4 w-4" />
                {adminCopy.center.create}
              </Button>
            ) : undefined}
          />

          <IndiceFilterBar
            title={workspaceCopy.multi.filtersTitle}
            subtitle={workspaceCopy.multi.filtersSubtitle}
            summary={workspaceCopy.multi.resultCount(filteredItems.length, items.length)}
            gridClassName="lg:grid-cols-[minmax(260px,1.5fr)_minmax(220px,0.7fr)]"
          >
            <IndiceFilterSearch label={workspaceCopy.multi.searchLabel} placeholder={workspaceCopy.multi.searchPlaceholder} tone="blue" value={search} onValueChange={setSearch} onClear={() => setSearch('')} />
            <IndiceFilterSelect
              label={workspaceCopy.multi.statusLabel}
              tone="blue"
              value={statusFilter}
              onValueChange={value => { setStatusFilter(value as 'ALL' | MultiKioskStatus); setOverviewFilter('ALL'); }}
              options={[
                { value: 'ALL', label: workspaceCopy.multi.all },
                ...(['ACTIVE', 'DISABLED', 'EXPIRED', 'REVOKED'] as MultiKioskStatus[]).map(status => ({ value: status, label: workspaceCopy.multi.statuses[status] ?? status })),
              ]}
            />
          </IndiceFilterBar>

          <KioskStatusNavigator
            ariaLabel={workspaceCopy.multi.statusNavigation}
            value={overviewFilter}
            onValueChange={value => setOverviewFilter(value as MultiKioskOverviewFilter)}
            items={[
              { value: 'ALL', label: workspaceCopy.multi.total, count: items.length, icon: Grid2X2, tone: 'blue' },
              { value: 'ACTIVE', label: workspaceCopy.multi.active, count: items.filter(item => item.status === 'ACTIVE').length, icon: ShieldCheck, tone: 'green' },
              { value: 'ATTENTION', label: workspaceCopy.multi.attention, count: attentionCount, icon: AlertTriangle, tone: 'amber' },
            ]}
          />

          {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-medium text-slate-950 dark:text-white">{adminCopy.center.configuredTitle}</h2><p className="mt-1 text-xs text-slate-500">{adminCopy.center.configuredSubtitle}</p></div><button type="button" aria-label={workspaceCopy.multi.refresh} title={workspaceCopy.multi.refresh} onClick={() => void load()} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-[var(--indice-brand-action)]/45 hover:bg-[var(--indice-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)]/40 dark:border-slate-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button></div>
            {loading ? (
              <div className="grid min-h-52 place-items-center" aria-busy="true"><LoaderCircle className="h-7 w-7 animate-spin text-[var(--indice-brand-action)]" /></div>
            ) : filteredItems.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700"><Smartphone className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-base font-medium text-slate-800 dark:text-white">{adminCopy.center.emptyTitle}</p><p className="mt-1 text-sm text-slate-500">{adminCopy.center.emptyDescription}</p></div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredItems.map(item => {
                  const itemTheme = multiKioskThemeClasses[item.theme_key] ?? multiKioskThemeClasses['indice-blue'];
                  return (
                    <article
                      key={item.id}
                      data-kiosk-theme={item.theme_key}
                      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.75)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--indice-brand-action)]/45 hover:shadow-[0_18px_38px_-26px_rgba(37,99,235,0.22)] motion-reduce:transform-none dark:border-slate-700 dark:bg-slate-950/70 dark:hover:border-blue-700 sm:flex-row sm:items-center"
                    >
                      <span className={cn('absolute inset-y-0 left-0 w-1', itemTheme.accent)} aria-hidden="true" />
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 transition-transform group-hover:scale-105 motion-reduce:transform-none', itemTheme.icon)} aria-hidden="true">
                          <Smartphone className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="max-w-full truncate text-base font-medium text-slate-950 dark:text-white">{item.name}</h3>
                            <StatusBadge status={item.status} label={workspaceCopy.multi.statuses[item.status] ?? item.status} />
                            <span className={cn('rounded-full border px-2 py-1 text-[10px] font-medium', item.audience_type === 'PROVIDER' ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>{item.audience_type === 'PROVIDER' ? 'Proveedores' : 'Personal'}</span>
                          </div>
                          {item.description ? <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p> : null}
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{adminCopy.center.toolCount(item.tool_count ?? 0)} · {adminCopy.center.authorizedTools}{item.allow_provider_registration ? ' · Solicitudes de alta activas' : ''}</p>
                          <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--indice-brand-soft)] px-2.5 py-1 text-xs text-[var(--indice-brand-text)] dark:bg-blue-950/35 dark:text-blue-300"><Link2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.access_path ? `${workspaceCopy.multi.linkReady} · ${item.public_token_hint}` : workspaceCopy.multi.linkUnavailable}</span></p>
                        </div>
                      </div>
                      <IndiceTableActionGroup className="sm:ml-auto">
                        <KioskAdminActionButton accent="blue" label={workspaceCopy.multi.edit} disabled={busyId === item.id || item.status === 'REVOKED'} onClick={() => void edit(item.id)}>{busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}</KioskAdminActionButton>
                        <KioskAdminActionButton accent="blue" label={workspaceCopy.multi.share} disabled={!item.access_path} onClick={() => setQrItem(item)}><QrCode className="h-4 w-4" /></KioskAdminActionButton>
                        <KioskAdminActionButton accent="blue" label={workspaceCopy.multi.open} disabled={!item.access_path} onClick={() => window.open(absoluteAccessUrl(item), '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" /></KioskAdminActionButton>
                        <KioskAdminActionButton accent="blue" label={workspaceCopy.multi.more} disabled={item.status === 'REVOKED'} onClick={() => setOptionsItem(item)}><MoreHorizontal className="h-4 w-4" /></KioskAdminActionButton>
                      </IndiceTableActionGroup>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : activeView === 'inventory' ? (
        <KioskCenterPage embedded />
      ) : activeView === 'people' ? (
        <KioskAccessView copy={workspaceCopy} employees={catalog.employees} tools={catalog.tools} error={error} loading={loading} onRefresh={() => void load()} onReviewAccess={() => navigate('/home-panel/users')} />
      ) : (
        <KioskActivityView copy={workspaceCopy} />
      )}

      {editor ? <MultiKioskEditorModal catalog={catalog} editor={editor} onClose={() => setEditor(null)} onSaved={(_, close = true) => { if (close) setEditor(null); void load(); }} /> : null}
      {optionsItem ? <MultiKioskOptionsModal copy={workspaceCopy} item={optionsItem} onClose={() => setOptionsItem(null)} onCommand={command => { setOptionsItem(null); setPendingCommand(command); }} /> : null}
      {pendingCommand ? <MultiKioskCommandConfirmationModal copy={workspaceCopy} command={pendingCommand} busy={busyId === pendingCommand.item.id} onCancel={() => setPendingCommand(null)} onConfirm={() => void executeCommand()} /> : null}
      <KioskModalFrame open={Boolean(qrItem)} onOpenChange={open => { if (!open) setQrItem(null); }} size="form" contentClassName="sm:!w-[min(92vw,28rem)] sm:!max-w-md" surface="administration" tone="blue" icon={<QrCode className="h-5 w-5" />} title={workspaceCopy.multi.shareTitle} description={workspaceCopy.multi.shareDescription} footer={<Button variant="outline" type="button" onClick={() => setQrItem(null)}>{workspaceCopy.multi.close}</Button>}>
        <div className="text-center">{qr ? <img src={qr} alt={workspaceCopy.multi.qrAlt} className="mx-auto h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3" /> : <div className="mx-auto grid h-56 w-56 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800"><LoaderCircle className="h-6 w-6 animate-spin text-slate-400" /></div>}<p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">{qrItem?.name}</p><button type="button" onClick={() => qrItem && void copyLink(qrItem)} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-[var(--indice-brand-action)]/45 hover:bg-[var(--indice-brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"><Clipboard className="h-4 w-4" />{copiedId === qrItem?.id ? workspaceCopy.multi.copied : workspaceCopy.multi.copyLink}</button></div>
      </KioskModalFrame>
    </main>
  );
}
