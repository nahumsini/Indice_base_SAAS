import { useEffect, useMemo, useState } from 'react';
import {
  Clipboard, ExternalLink, Grid2X2, History, Layers3, Link2, LoaderCircle,
  MoreHorizontal, Pencil, Plus, QrCode, RefreshCw, ShieldCheck, Smartphone,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import { useKioskQrCode } from '../components/kiosk-engine/useKioskQrCode';
import { IndiceWorkspaceNavigation } from '../components/frontend-os';
import { useLanguage } from '../shared/context';
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
import {
  createEmptyMultiKioskEditor,
  mapMultiKioskDetailToEditor,
  MultiKioskEditorModal,
  type MultiKioskCatalog,
  type MultiKioskEditorState,
} from './MultiKioskEditorModal';

const statusCopy: Record<MultiKioskStatus, { label: string; classes: string }> = {
  ACTIVE: { label: 'Activo', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  DISABLED: { label: 'Deshabilitado', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  EXPIRED: { label: 'Vencido', classes: 'border-slate-200 bg-slate-100 text-slate-600' },
  REVOKED: { label: 'Revocado', classes: 'border-red-200 bg-red-50 text-red-700' },
};

const absoluteAccessUrl = (item?: Pick<MultiKioskSummary, 'access_path'>) => {
  if (!item?.access_path || typeof window === 'undefined') return '';
  return new URL(item.access_path, window.location.origin).toString();
};

function StatusBadge({ status }: { status: MultiKioskStatus }) {
  const copy = statusCopy[status] ?? statusCopy.DISABLED;
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', copy.classes)}>{copy.label}</span>;
}

function ActionButton({ label, icon, onClick, danger = false, disabled = false }: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-900 dark:hover:bg-slate-800', danger ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>{icon}</button>;
}

export default function MultiKioskCenterPage() {
  const { currentLanguage } = useLanguage();
  const workspaceCopy = useMemo(() => getKioskCenterWorkspaceCopy(currentLanguage.code), [currentLanguage.code]);
  const adminCopy = useMemo(() => getMultiKioskAdminCopy(currentLanguage.code), [currentLanguage.code]);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('view') as KioskCenterWorkspaceView | null;
  const activeView: KioskCenterWorkspaceView = requestedView && ['multi-kiosks', 'inventory', 'people', 'activity'].includes(requestedView)
    ? requestedView
    : 'multi-kiosks';
  const [items, setItems] = useState<MultiKioskSummary[]>([]);
  const [catalog, setCatalog] = useState<MultiKioskCatalog>({ tools: [], kiosks: [], employees: [] });
  const [editor, setEditor] = useState<MultiKioskEditorState | null>(null);
  const [qrItem, setQrItem] = useState<MultiKioskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [optionsItem, setOptionsItem] = useState<MultiKioskSummary | null>(null);
  const [pendingCommand, setPendingCommand] = useState<MultiKioskPendingCommand | null>(null);
  const qrUrl = absoluteAccessUrl(qrItem ?? undefined);
  const qr = useKioskQrCode(qrUrl, '#2563EB');
  const summaryCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Multikioscos', value: items.length, icon: Grid2X2 },
    { label: 'Activos', value: items.filter(item => item.status === 'ACTIVE').length, icon: ShieldCheck },
    { label: adminCopy.center.toolsPublished, value: items.reduce((sum, item) => sum + (item.tool_count ?? 0), 0), icon: Layers3 },
  ];
  const load = async () => {
    setLoading(true); setError('');
    try { const [nextItems, nextCatalog] = await Promise.all([multiKioskAdminApi.list(), multiKioskAdminApi.catalog()]); setItems(nextItems); setCatalog(nextCatalog); }
    catch { setError('No fue posible cargar el Centro de kioscos.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const edit = async (id: number) => { setBusyId(id); try { setEditor(mapMultiKioskDetailToEditor(await multiKioskAdminApi.detail(id))); } catch { setError('No fue posible abrir este Multikiosco.'); } finally { setBusyId(null); } };
  const copyLink = async (item: MultiKioskSummary) => { const url = absoluteAccessUrl(item); if (!url) return; await navigator.clipboard.writeText(url); setCopiedId(item.id); window.setTimeout(() => setCopiedId(current => current === item.id ? null : current), 1800); };
  const changeView = (view: KioskCenterWorkspaceView) => {
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
      setError(pendingCommand.action === 'rotate' ? 'No fue posible renovar el enlace.' : 'No fue posible cambiar el estado.');
    } finally {
      setBusyId(null);
    }
  };
  return (
    <main className="mx-auto min-h-[calc(100vh-5.5rem)] max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <IndiceWorkspaceNavigation
        ariaLabel={workspaceCopy.navigationLabel}
        value={activeView}
        onValueChange={changeView}
        tone="aqua"
        items={[
          { id: 'multi-kiosks', label: workspaceCopy.navigation['multi-kiosks'].label, icon: <Grid2X2 />, description: workspaceCopy.navigation['multi-kiosks'].description },
          { id: 'inventory', label: workspaceCopy.navigation.inventory.label, icon: <Layers3 />, description: workspaceCopy.navigation.inventory.description },
          { id: 'people', label: workspaceCopy.navigation.people.label, icon: <UsersRound />, description: workspaceCopy.navigation.people.description },
          { id: 'activity', label: workspaceCopy.navigation.activity.label, icon: <History />, description: workspaceCopy.navigation.activity.description },
        ]}
        className="mb-5"
      />

      {activeView === 'multi-kiosks' ? (
        <div className="space-y-5">
          <section className="rounded-xl border border-[#59C3A5]/45 bg-[#59C3A5]/10 p-5 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/25">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#59C3A5]/50 bg-white text-[#177D66] shadow-sm dark:bg-slate-900 dark:text-emerald-300"><Grid2X2 className="h-5 w-5" /></span>
                <div><h1 className="text-xl font-medium text-slate-950 dark:text-white">{adminCopy.center.title}</h1><p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600 dark:text-slate-300">{adminCopy.center.subtitle}</p></div>
              </div>
              <Button type="button" onClick={() => setEditor(createEmptyMultiKioskEditor())} className="h-11 shrink-0 bg-[#177D66] text-white hover:bg-[#126553]"><Plus className="mr-2 h-4 w-4" />{adminCopy.center.create}</Button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summaryCards.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Icon className="h-5 w-5" /></span><div><p className="text-xl font-medium tabular-nums text-slate-950 dark:text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>)}
          </section>

          {error ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-medium text-slate-950 dark:text-white">{adminCopy.center.configuredTitle}</h2><p className="mt-1 text-xs text-slate-500">{adminCopy.center.configuredSubtitle}</p></div><button type="button" aria-label="Actualizar Multikioscos" title="Actualizar Multikioscos" onClick={() => void load()} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:hover:bg-slate-800"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button></div>
            {loading ? (
              <div className="grid min-h-52 place-items-center" aria-busy="true"><LoaderCircle className="h-7 w-7 animate-spin text-blue-600" /></div>
            ) : items.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700"><Smartphone className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-base font-medium text-slate-800 dark:text-white">{adminCopy.center.emptyTitle}</p><p className="mt-1 text-sm text-slate-500">{adminCopy.center.emptyDescription}</p></div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map(item => (
                  <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 dark:border-slate-700 dark:hover:border-blue-800 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Smartphone className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-base font-medium text-slate-950 dark:text-white">{item.name}</h3><StatusBadge status={item.status} /></div><p className="mt-1 truncate text-xs text-slate-500">{adminCopy.center.toolCount(item.tool_count ?? 0)} · {adminCopy.center.authorizedTools}</p><p className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-300"><Link2 className="h-3.5 w-3.5" />{item.access_path ? `Enlace listo · ${item.public_token_hint}` : 'Enlace protegido no disponible'}</p></div></div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <ActionButton label="Editar" disabled={busyId === item.id || item.status === 'REVOKED'} onClick={() => void edit(item.id)} icon={busyId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} />
                      <ActionButton label="Compartir enlace y QR" disabled={!item.access_path} onClick={() => setQrItem(item)} icon={<QrCode className="h-4 w-4" />} />
                      <ActionButton label="Abrir enlace" disabled={!item.access_path} onClick={() => window.open(absoluteAccessUrl(item), '_blank', 'noopener,noreferrer')} icon={<ExternalLink className="h-4 w-4" />} />
                      <ActionButton label="Más opciones" disabled={item.status === 'REVOKED'} onClick={() => setOptionsItem(item)} icon={<MoreHorizontal className="h-4 w-4" />} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : activeView === 'inventory' ? (
        <KioskCenterPage embedded />
      ) : activeView === 'people' ? (
        <KioskAccessView copy={workspaceCopy} employees={catalog.employees} tools={catalog.tools} error={error} loading={loading} onRefresh={() => void load()} />
      ) : (
        <KioskActivityView copy={workspaceCopy} />
      )}

      {editor ? <MultiKioskEditorModal catalog={catalog} editor={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); void load(); }} /> : null}
      {optionsItem ? <MultiKioskOptionsModal copy={workspaceCopy} item={optionsItem} onClose={() => setOptionsItem(null)} onCommand={command => { setOptionsItem(null); setPendingCommand(command); }} /> : null}
      {pendingCommand ? <MultiKioskCommandConfirmationModal copy={workspaceCopy} command={pendingCommand} busy={busyId === pendingCommand.item.id} onCancel={() => setPendingCommand(null)} onConfirm={() => void executeCommand()} /> : null}
      <KioskModalFrame open={Boolean(qrItem)} onOpenChange={open => { if (!open) setQrItem(null); }} size="form" contentClassName="sm:!w-[min(92vw,28rem)] sm:!max-w-md" surface="administration" tone="blue" icon={<QrCode className="h-5 w-5" />} title="Compartir Multikiosco" description="Escanea desde el celular del colaborador." footer={<Button variant="outline" type="button" onClick={() => setQrItem(null)}>Cerrar</Button>}>
        <div className="text-center">{qr ? <img src={qr} alt="Código QR del Multikiosco" className="mx-auto h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3" /> : <div className="mx-auto grid h-56 w-56 place-items-center rounded-2xl bg-slate-100"><LoaderCircle className="h-6 w-6 animate-spin text-slate-400" /></div>}<p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">{qrItem?.name}</p><button type="button" onClick={() => qrItem && void copyLink(qrItem)} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><Clipboard className="h-4 w-4" />{copiedId === qrItem?.id ? 'Enlace copiado' : 'Copiar enlace'}</button></div>
      </KioskModalFrame>
    </main>
  );
}
