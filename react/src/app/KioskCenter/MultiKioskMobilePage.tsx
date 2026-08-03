import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Clock3, Grid2X2, KeyRound,
  ListChecks, LoaderCircle, LockKeyhole, QrCode, Search,
  ShieldCheck, Sparkles, WalletCards, UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { ApiClientError } from '../lib/apiClient';
import { KioskPublicShell } from '../components/kiosk-engine/KioskPublicShell';
import { useKioskQrCode } from '../components/kiosk-engine/useKioskQrCode';
import { cn } from '../components/ui/utils';
import {
  multiKioskMobileSession,
  multiKioskPublicApi,
  type MultiKioskBootstrap,
  type MultiKioskCard,
  type MultiKioskChildWorkspace,
  type MultiKioskMobileSession,
} from '../api/multiKiosks';
import type { PublicTaskKioskTask } from '../BasicModules/ProcessesTasks/Kiosk/processTaskKioskApi';

const accents: Record<string, { color: string; soft: string }> = {
  'indice-blue': { color: '#2563EB', soft: '#EFF6FF' },
  'indice-green': { color: '#16876B', soft: '#EAF8F3' },
  'indice-yellow': { color: '#C67A05', soft: '#FFF8E6' },
  'indice-coral': { color: '#E85D52', soft: '#FFF0EE' },
};

const moduleIcons: Record<string, typeof ListChecks> = {
  PROCESS_TASKS: ListChecks,
  HUMAN_RESOURCES: UsersRound,
  EXPENSES: WalletCards,
  PETTY_CASH: WalletCards,
};

const moduleName = (module: string) => ({
  PROCESS_TASKS: 'Procesos y tareas',
  HUMAN_RESOURCES: 'Recursos Humanos',
  EXPENSES: 'Gastos',
  PETTY_CASH: 'Caja chica',
  SALES: 'Ventas',
  POINT_OF_SALE: 'Punto de venta',
}[module] ?? module.replace(/_/g, ' '));

const friendlyError = (error: unknown) => {
  if (error instanceof ApiClientError && error.status === 429) return 'Se alcanzó el límite de intentos. Espera un momento antes de volver a intentar.';
  if (error instanceof ApiClientError && [401, 403].includes(error.status)) return 'El PIN no es válido o tu acceso ya no está activo.';
  if (error instanceof ApiClientError && error.status === 404) return 'Este Multikiosco ya no está disponible.';
  return 'No fue posible completar la operación. Intenta nuevamente.';
};

function useDesktopViewport() {
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return desktop;
}

function MobileHeader({ bootstrap, employee, accent }: {
  bootstrap: MultiKioskBootstrap;
  employee?: string;
  accent: { color: string; soft: string };
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ color: accent.color, backgroundColor: accent.soft }}>
          <Grid2X2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: accent.color }}>{bootstrap.company_name}</p>
          <h1 className="mt-1 text-xl font-medium tracking-tight text-slate-950 dark:text-white">{bootstrap.name}</h1>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {employee ? `Hola, ${employee}. Elige dónde trabajar.` : bootstrap.description || 'Accede a tus herramientas de trabajo.'}
          </p>
        </div>
      </div>
    </header>
  );
}

function PinGate({ accent, busy, error, onSubmit }: {
  accent: { color: string; soft: string };
  busy: boolean;
  error: string;
  onSubmit: (pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState('');
  return (
    <form
      className="my-auto rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
      onSubmit={event => { event.preventDefault(); void onSubmit(pin); }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ color: accent.color, backgroundColor: accent.soft }}><KeyRound className="h-5 w-5" /></span>
      <h2 className="mt-4 text-xl font-medium text-slate-950 dark:text-white">Identifícate para continuar</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Usa tu PIN personal. El enlace identifica al Multikiosco; el PIN confirma quién eres.</p>
      <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="multi-kiosk-pin">PIN personal</label>
      <input
        id="multi-kiosk-pin"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={12}
        pattern="[0-9]{4,12}"
        value={pin}
        onChange={event => setPin(event.target.value.replace(/\D/g, ''))}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl tracking-[0.3em] text-slate-950 outline-none transition focus:bg-white focus:ring-4 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        style={{ '--tw-ring-color': `${accent.color}25` } as React.CSSProperties}
        aria-describedby={error ? 'multi-kiosk-pin-error' : undefined}
      />
      {error ? <p id="multi-kiosk-pin-error" role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{error}</p> : null}
      <button
        disabled={busy || pin.length < 4}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium text-white transition disabled:opacity-45"
        style={{ backgroundColor: accent.color }}
        type="submit"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {busy ? 'Verificando…' : 'Entrar a mis kioscos'}
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">Tu sesión permanece abierta durante la jornada y se cierra por inactividad o si cambia tu acceso.</p>
    </form>
  );
}

function Launcher({ session, accent, busyId, error, onOpen }: {
  session: MultiKioskMobileSession;
  accent: { color: string; soft: string };
  busyId: number | null;
  error: string;
  onOpen: (card: MultiKioskCard) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const cards = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return session.kiosks.filter(card => !normalized || [card.name, card.purpose, moduleName(card.module)]
      .some(value => value.toLocaleLowerCase().includes(normalized)));
  }, [query, session.kiosks]);
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar una actividad" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:ring-4 dark:border-slate-700 dark:bg-slate-950" style={{ '--tw-ring-color': `${accent.color}20` } as React.CSSProperties} />
      </div>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Accesos disponibles</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-950">{cards.length}</span>
      </div>
      <div className="grid gap-3">
        {cards.map(card => {
          const Icon = moduleIcons[card.module] ?? Sparkles;
          const needsVerification = card.availability === 'VERIFICATION_REQUIRED';
          return (
            <button key={card.id} type="button" onClick={() => void onOpen(card)} disabled={busyId !== null} className="group flex min-h-24 w-full items-center gap-4 rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ color: accent.color, backgroundColor: accent.soft }}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: accent.color }}>{moduleName(card.module)}</span>
                <span className="mt-1 block truncate text-base font-medium text-slate-950 dark:text-white">{card.name}</span>
                <span className="mt-1 block line-clamp-1 text-xs text-slate-500">{needsVerification ? 'Solicitará verificación al abrir' : card.purpose}</span>
              </span>
              {busyId === card.id ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" style={{ color: accent.color }} /> : <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />}
            </button>
          );
        })}
      </div>
      {cards.length === 0 ? <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">No hay accesos que coincidan con tu búsqueda.</div> : null}
    </div>
  );
}

function TaskWorkspace({ token, kioskId, workspace, accent, onRefresh }: {
  token: string;
  kioskId: number;
  workspace: MultiKioskChildWorkspace;
  accent: { color: string; soft: string };
  onRefresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [pending, setPending] = useState<number | 'create' | null>(null);
  const [error, setError] = useState('');
  const csrf = sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? '';
  const tasks = workspace.bootstrap?.tasks ?? [];
  const summaries: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Pendientes', value: tasks.filter(task => task.status !== 'completed').length, icon: Clock3 },
    { label: 'Vencidas', value: tasks.filter(task => task.is_overdue && task.status !== 'completed').length, icon: ListChecks },
    { label: 'En alcance', value: tasks.length, icon: ShieldCheck },
  ];
  const visible = tasks.filter(task => !query.trim() || [task.title, task.folio, task.assigned_name]
    .some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const mutate = async (capability: string, payload: Record<string, unknown>, marker: number | 'create') => {
    setPending(marker); setError('');
    try { await multiKioskPublicApi.action(token, kioskId, capability, payload, csrf); await onRefresh(); }
    catch (failure) { setError(friendlyError(failure)); }
    finally { setPending(null); }
  };
  const create = async () => {
    if (!quickTitle.trim()) return;
    await mutate('process-tasks.task.create@v1', { title: quickTitle.trim(), priority: 'medium', dueDate: new Date().toISOString().slice(0, 10) }, 'create');
    setQuickTitle('');
  };
  const complete = (task: PublicTaskKioskTask) => mutate('process-tasks.task.complete@v1', { resource_id: task.id, completion_percent: 100 }, task.id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {summaries.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950"><Icon className="mx-auto h-4 w-4" style={{ color: accent.color }} /><p className="mt-2 text-xl text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div>)}
      </div>
      <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <p className="text-sm font-medium text-slate-900 dark:text-white">Captura rápida</p>
        <input value={quickTitle} onChange={event => setQuickTitle(event.target.value)} placeholder="¿Qué tarea necesitas registrar?" className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
        <button type="button" onClick={() => void create()} disabled={!quickTitle.trim() || pending !== null} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: accent.color }}>{pending === 'create' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Agregar tarea</button>
      </section>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar en mis tareas" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /></div>
        <div className="mt-3 space-y-2">
          {visible.map(task => <article key={task.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start gap-2"><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', task.is_overdue ? 'bg-rose-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500')} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-950 dark:text-white">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.folio}{task.due_date ? ` · ${task.due_date}` : ''}</p></div></div>{task.can_complete && task.status !== 'completed' ? <button type="button" onClick={() => void complete(task)} disabled={pending !== null} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 disabled:opacity-50">{pending === task.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Completar</button> : null}</article>)}
          {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No hay tareas para mostrar.</p> : null}
        </div>
      </section>
    </div>
  );
}

export default function MultiKioskMobilePage() {
  const token = useParams().publicAccessToken ?? '';
  const desktop = useDesktopViewport();
  const [bootstrap, setBootstrap] = useState<MultiKioskBootstrap | null>(null);
  const [session, setSession] = useState<MultiKioskMobileSession | null>(null);
  const [workspace, setWorkspace] = useState<MultiKioskChildWorkspace | null>(null);
  const [activeKioskId, setActiveKioskId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const qr = useKioskQrCode(typeof window === 'undefined' ? '' : window.location.href, '#2563EB');
  const accent = accents[bootstrap?.theme_key ?? 'indice-blue'] ?? accents['indice-blue'];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    multiKioskPublicApi.bootstrap(token, controller.signal)
      .then(async data => {
        setBootstrap(data);
        try { sessionStorage.setItem(`indice.multi-kiosk.${token}.csrf`, data.csrf_token); } catch { /* no-op */ }
        if (!desktop && multiKioskMobileSession.get(token)) {
          try { setSession(await multiKioskPublicApi.session(token, controller.signal)); }
          catch { multiKioskMobileSession.clear(token); }
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(friendlyError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [desktop, token]);

  const authenticate = async (pin: string) => {
    if (!bootstrap) return;
    setLoading(true); setError('');
    try { setSession(await multiKioskPublicApi.authenticate(token, pin, bootstrap.csrf_token)); }
    catch (failure) { setError(friendlyError(failure)); }
    finally { setLoading(false); }
  };

  const open = async (card: MultiKioskCard) => {
    if (!bootstrap) return;
    setBusyId(card.id); setError('');
    try {
      await multiKioskPublicApi.launch(token, card.id, bootstrap.csrf_token);
      setWorkspace(await multiKioskPublicApi.workspace(token, card.id));
      setActiveKioskId(card.id);
    } catch (failure) { setError(friendlyError(failure)); }
    finally { setBusyId(null); }
  };

  const refreshWorkspace = useCallback(async () => {
    if (activeKioskId === null) return;
    setWorkspace(await multiKioskPublicApi.workspace(token, activeKioskId));
  }, [activeKioskId, token]);

  if (!bootstrap && !loading) return <main className="grid min-h-dvh place-items-center bg-slate-100 p-6 text-center text-sm text-slate-600">{error || 'Este Multikiosco no está disponible.'}</main>;

  return (
    <KioskPublicShell
      moduleScope="MULTI_KIOSK"
      maxWidthClassName="max-w-[31rem]"
      minimalContent
      loadingOverlay={loading ? <div className="fixed inset-0 z-[200] grid place-items-center bg-white/80 backdrop-blur-sm dark:bg-slate-950/80"><LoaderCircle className="h-7 w-7 animate-spin" style={{ color: accent.color }} /></div> : null}
      header={bootstrap ? <MobileHeader bootstrap={bootstrap} employee={session?.employee.name} accent={accent} /> : <div />}
    >
      {bootstrap && desktop ? (
        <section className="my-auto rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ color: accent.color, backgroundColor: accent.soft }}><QrCode className="h-5 w-5" /></span>
          <h2 className="mt-4 text-xl font-medium text-slate-950 dark:text-white">Abre este Multikiosco en tu celular</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Esta experiencia está diseñada para el trabajo móvil. Escanea el código con tu teléfono para identificarte y comenzar.</p>
          {qr ? <img src={qr} alt="Código QR del Multikiosco" className="mx-auto mt-5 h-52 w-52 rounded-2xl border border-slate-200 bg-white p-3" /> : <div className="mx-auto mt-5 grid h-52 w-52 place-items-center rounded-2xl bg-slate-100"><LoaderCircle className="h-6 w-6 animate-spin text-slate-400" /></div>}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><ShieldCheck className="h-4 w-4" />El trabajo operativo se habilita únicamente en móvil</div>
        </section>
      ) : bootstrap && !session ? (
        <PinGate accent={accent} busy={loading} error={error} onSubmit={authenticate} />
      ) : session && workspace && activeKioskId !== null ? (
        <div className="space-y-4">
          <button type="button" onClick={() => { setWorkspace(null); setActiveKioskId(null); setError(''); }} className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" />Todos mis kioscos</button>
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: accent.color }}>{moduleName(workspace.kiosk.module)}</p>
            <h2 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{workspace.kiosk.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{workspace.bootstrap?.scope_label ?? workspace.kiosk.purpose}</p>
          </section>
          {workspace.experience_status !== 'READY' ? <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 text-center text-amber-900"><LockKeyhole className="mx-auto h-7 w-7" /><h3 className="mt-3 text-base font-medium">Verificación especializada requerida</h3><p className="mt-2 text-sm leading-6">Este acceso ya está asignado, pero el módulo debe completar su paso seguro de identidad antes de permitir operaciones.</p></section> : workspace.kiosk.module === 'PROCESS_TASKS' ? <TaskWorkspace token={token} kioskId={activeKioskId} workspace={workspace} accent={accent} onRefresh={refreshWorkspace} /> : <section className="rounded-[24px] border border-slate-200 bg-white p-6 text-center text-sm text-slate-500"><ShieldCheck className="mx-auto h-7 w-7" style={{ color: accent.color }} /><p className="mt-3">El kiosco está conectado y listo para que su módulo publique esta experiencia móvil.</p></section>}
        </div>
      ) : session ? (
        <Launcher session={session} accent={accent} busyId={busyId} error={error} onOpen={open} />
      ) : null}
    </KioskPublicShell>
  );
}
