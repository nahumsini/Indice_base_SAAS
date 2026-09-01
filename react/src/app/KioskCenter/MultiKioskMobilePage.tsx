import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Clock3, Grid2X2,
  ListChecks, LoaderCircle, LockKeyhole, LogOut, Search,
  ShieldCheck, Sparkles, WalletCards, UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useParams } from 'react-router';
import { ApiClientError } from '../lib/apiClient';
import { KioskIdentityGate } from '../components/kiosk-engine/KioskIdentityGate';
import { KioskPublicShell } from '../components/kiosk-engine/KioskPublicShell';
import type { KioskThemeTone } from '../components/kiosk-engine/KioskWorkspacePrimitives';
import { cn } from '../components/ui/utils';
import { useLanguage } from '../shared/context';
import {
  isMultiKioskAuthorizationFailure,
  multiKioskMobileSession,
  multiKioskPublicApi,
  type MultiKioskBootstrap,
  type MultiKioskCard,
  type MultiKioskChildWorkspace,
  type MultiKioskMobileSession,
} from '../api/multiKiosks';
import type { PublicTaskKioskTask } from '../BasicModules/ProcessesTasks/Kiosk/processTaskKioskApi';
import { AttendanceMultiKioskWorkspace } from './AttendanceMultiKioskWorkspace';
import { PettyCashMultiKioskWorkspace } from './PettyCashMultiKioskWorkspace';
import {
  getMultiKioskMobileCopy,
  type MultiKioskMobileCopy,
} from './multiKioskMobileTranslations';

const accents: Record<string, { color: string; soft: string }> = {
  'indice-blue': { color: '#2563EB', soft: '#EFF6FF' },
  'indice-green': { color: '#16876B', soft: '#EAF8F3' },
  'indice-yellow': { color: '#C67A05', soft: '#FFF8E6' },
  'indice-coral': { color: '#E85D52', soft: '#FFF0EE' },
};

const identityTones: Record<string, KioskThemeTone> = {
  'indice-blue': 'blue',
  'indice-green': 'green',
  'indice-yellow': 'yellow',
  'indice-coral': 'coral',
};

const moduleIcons: Record<string, typeof ListChecks> = {
  PROCESS_TASKS: ListChecks,
  HUMAN_RESOURCES: UsersRound,
  EXPENSES: WalletCards,
  PETTY_CASH: WalletCards,
};

const moduleName = (module: string, copy: MultiKioskMobileCopy) => (
  copy.moduleNames[module] ?? module.replace(/_/g, ' ')
);

const friendlyError = (error: unknown, copy: MultiKioskMobileCopy) => {
  if (error instanceof ApiClientError && error.status === 429) return copy.errors.rateLimit;
  if (isMultiKioskAuthorizationFailure(error)) return copy.errors.authorization;
  if (error instanceof ApiClientError && error.status === 404) return copy.errors.unavailable;
  return copy.errors.generic;
};

function MobileHeader({ bootstrap, employee, accent, copy }: {
  bootstrap: MultiKioskBootstrap;
  employee?: string;
  accent: { color: string; soft: string };
  copy: MultiKioskMobileCopy;
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
            {employee ? copy.header.employeeGreeting(employee) : bootstrap.description || copy.header.defaultDescription}
          </p>
        </div>
      </div>
    </header>
  );
}

function PinGate({ busy, copy, error, onClearError, onSubmit, tone }: {
  busy: boolean;
  copy: MultiKioskMobileCopy;
  error: string;
  onClearError: () => void;
  onSubmit: (pin: string) => Promise<void>;
  tone: KioskThemeTone;
}) {
  const [pin, setPin] = useState('');
  return (
    <div className="my-auto space-y-3">
      {error ? <p id="multi-kiosk-pin-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{error}</p> : null}
      <KioskIdentityGate
        backspaceLabel={copy.pin.backspace}
        clearLabel={copy.pin.clear}
        description={copy.pin.description}
        disabled={busy}
        isSubmitting={busy}
        onPinChange={(value) => {
          setPin(value);
          if (error) onClearError();
        }}
        onSubmit={() => void onSubmit(pin)}
        pinAriaLabel={copy.pin.ariaLabel}
        pinLength={5}
        pinValue={pin}
        privacyMessage={copy.pin.privacy}
        submitLabel={copy.pin.submit}
        title={copy.pin.title}
        tone={tone}
      />
    </div>
  );
}

function Launcher({ session, accent, busyId, copy, error, onOpen, onSignOut }: {
  session: MultiKioskMobileSession;
  accent: { color: string; soft: string };
  busyId: number | null;
  copy: MultiKioskMobileCopy;
  error: string;
  onOpen: (card: MultiKioskCard) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const cards = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return session.kiosks.filter(card => !normalized || [card.name, card.purpose, moduleName(card.module, copy)]
      .some(value => value.toLocaleLowerCase().includes(normalized)));
  }, [copy, query, session.kiosks]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{session.employee.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{copy.launcher.activeSession}</p>
        </div>
        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={busyId !== null}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          style={{ '--tw-ring-color': `${accent.color}25` } as React.CSSProperties}
          aria-label={copy.launcher.signOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>{copy.launcher.signOut}</span>
        </button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.launcher.searchPlaceholder} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:ring-4 dark:border-slate-700 dark:bg-slate-950" style={{ '--tw-ring-color': `${accent.color}20` } as React.CSSProperties} />
      </div>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{copy.launcher.available}</p>
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
                <span className="block text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: accent.color }}>{moduleName(card.module, copy)}</span>
                <span className="mt-1 block truncate text-base font-medium text-slate-950 dark:text-white">{card.name}</span>
                <span className="mt-1 block line-clamp-1 text-xs text-slate-500">{needsVerification ? copy.launcher.verificationRequired : card.purpose}</span>
              </span>
              {busyId === card.id ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" style={{ color: accent.color }} /> : <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />}
            </button>
          );
        })}
      </div>
      {cards.length === 0 ? <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-950">{session.kiosks.length === 0 ? copy.launcher.noAccess : copy.launcher.noMatches}</div> : null}
    </div>
  );
}

function TaskWorkspace({ token, kioskId, workspace, accent, copy, onAuthorizationFailure, onRefresh }: {
  token: string;
  kioskId: number;
  workspace: MultiKioskChildWorkspace;
  accent: { color: string; soft: string };
  copy: MultiKioskMobileCopy;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [pending, setPending] = useState<number | 'create' | null>(null);
  const [error, setError] = useState('');
  const csrf = sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? '';
  const tasks = workspace.bootstrap?.tasks ?? [];
  const canCreateTask = workspace.session.capabilities.includes('process-tasks.task.create@1');
  const summaries: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: copy.tasks.pending, value: tasks.filter(task => task.status !== 'completed').length, icon: Clock3 },
    { label: copy.tasks.overdue, value: tasks.filter(task => task.is_overdue && task.status !== 'completed').length, icon: ListChecks },
    { label: copy.tasks.inScope, value: tasks.length, icon: ShieldCheck },
  ];
  const visible = tasks.filter(task => !query.trim() || [task.title, task.folio, task.assigned_name]
    .some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const mutate = async (capability: string, payload: Record<string, unknown>, marker: number | 'create') => {
    setPending(marker); setError('');
    try {
      await multiKioskPublicApi.action(token, kioskId, capability, payload, csrf);
      await onRefresh();
      return true;
    }
    catch (failure) {
      if (!onAuthorizationFailure(failure)) setError(friendlyError(failure, copy));
      return false;
    }
    finally { setPending(null); }
  };
  const create = async () => {
    if (!quickTitle.trim()) return;
    const created = await mutate('process-tasks.task.create@1', { title: quickTitle.trim(), priority: 'medium', dueDate: new Date().toISOString().slice(0, 10) }, 'create');
    if (created) setQuickTitle('');
  };
  const complete = (task: PublicTaskKioskTask) => mutate('process-tasks.task.complete@1', { resource_id: task.id, completion_percent: 100 }, task.id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {summaries.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950"><Icon className="mx-auto h-4 w-4" style={{ color: accent.color }} /><p className="mt-2 text-xl text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-[10px] text-slate-500">{label}</p></div>)}
      </div>
      {canCreateTask ? (
        <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.tasks.quickCapture}</p>
          <input value={quickTitle} onChange={event => setQuickTitle(event.target.value)} placeholder={copy.tasks.titlePlaceholder} className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />
          <button type="button" onClick={() => void create()} disabled={!quickTitle.trim() || pending !== null} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-white disabled:opacity-40" style={{ backgroundColor: accent.color }}>{pending === 'create' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{copy.tasks.add}</button>
        </section>
      ) : null}
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.tasks.searchPlaceholder} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" /></div>
        <div className="mt-3 space-y-2">
          {visible.map(task => <article key={task.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start gap-2"><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', task.is_overdue ? 'bg-rose-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500')} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-950 dark:text-white">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.folio}{task.due_date ? ` · ${task.due_date}` : ''}</p></div></div>{task.can_complete && task.status !== 'completed' ? <button type="button" onClick={() => void complete(task)} disabled={pending !== null} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 disabled:opacity-50">{pending === task.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{copy.tasks.complete}</button> : null}</article>)}
          {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{copy.tasks.empty}</p> : null}
        </div>
      </section>
    </div>
  );
}

export default function MultiKioskMobilePage() {
  const token = useParams().publicAccessToken ?? '';
  const { currentLanguage } = useLanguage();
  const [bootstrap, setBootstrap] = useState<MultiKioskBootstrap | null>(null);
  const [session, setSession] = useState<MultiKioskMobileSession | null>(null);
  const [workspace, setWorkspace] = useState<MultiKioskChildWorkspace | null>(null);
  const [activeKioskId, setActiveKioskId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accent = accents[bootstrap?.theme_key ?? 'indice-blue'] ?? accents['indice-blue'];
  const identityTone = identityTones[bootstrap?.theme_key ?? 'indice-blue'] ?? 'blue';
  const copy = getMultiKioskMobileCopy(currentLanguage.code);

  const clearLocalAuthority = useCallback((message = '') => {
    multiKioskMobileSession.clearAuthority(token);
    setWorkspace(null);
    setActiveKioskId(null);
    setSession(null);
    setBusyId(null);
    setError(message);
  }, [token]);

  const handleAuthorizationFailure = useCallback((failure: unknown) => {
    if (!isMultiKioskAuthorizationFailure(failure)) return false;
    clearLocalAuthority(copy.errors.sessionExpired);
    return true;
  }, [clearLocalAuthority, copy.errors.sessionExpired]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    multiKioskPublicApi.bootstrap(token, controller.signal)
      .then(async data => {
        setBootstrap(data);
        try { sessionStorage.setItem(`indice.multi-kiosk.${token}.csrf`, data.csrf_token); } catch { /* no-op */ }
        if (multiKioskMobileSession.get(token)) {
          try { setSession(await multiKioskPublicApi.session(token, controller.signal)); }
          catch (failure) {
            clearLocalAuthority(isMultiKioskAuthorizationFailure(failure)
              ? copy.errors.sessionExpired
              : friendlyError(failure, copy));
          }
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(friendlyError(failure, copy)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [clearLocalAuthority, copy, token]);

  const authenticate = async (pin: string) => {
    if (!bootstrap) return;
    setLoading(true); setError('');
    multiKioskMobileSession.clearAuthority(token);
    try { setSession(await multiKioskPublicApi.authenticate(token, pin, bootstrap.csrf_token)); }
    catch (failure) { setError(friendlyError(failure, copy)); }
    finally { setLoading(false); }
  };

  const open = async (card: MultiKioskCard) => {
    if (!bootstrap) return;
    setBusyId(card.id); setError('');
    try {
      await multiKioskPublicApi.launch(token, card.id, bootstrap.csrf_token);
      setWorkspace(await multiKioskPublicApi.workspace(token, card.id));
      setActiveKioskId(card.id);
    } catch (failure) {
      if (!handleAuthorizationFailure(failure)) setError(friendlyError(failure, copy));
    }
    finally { setBusyId(null); }
  };

  const refreshWorkspace = useCallback(async () => {
    if (activeKioskId === null) return;
    setWorkspace(await multiKioskPublicApi.workspace(token, activeKioskId));
  }, [activeKioskId, token]);

  const signOut = async () => {
    setLoading(true);
    try {
      if (bootstrap) await multiKioskPublicApi.signOut(token, bootstrap.csrf_token);
    } catch {
      // The shared device still forgets all local authority when server revocation is unavailable.
    } finally {
      clearLocalAuthority('');
      setLoading(false);
    }
  };

  if (!bootstrap && !loading) return <main className="grid min-h-dvh place-items-center bg-slate-100 p-6 text-center text-sm text-slate-600">{error || copy.errors.unavailable}</main>;

  return (
    <KioskPublicShell
      moduleScope="MULTI_KIOSK"
      defaultLocale={bootstrap?.locale}
      maxWidthClassName="max-w-[31rem]"
      minimalContent
      loadingOverlay={loading ? <div className="fixed inset-0 z-[200] grid place-items-center bg-white/80 backdrop-blur-sm dark:bg-slate-950/80"><LoaderCircle className="h-7 w-7 animate-spin" style={{ color: accent.color }} /></div> : null}
      header={bootstrap ? <MobileHeader bootstrap={bootstrap} employee={session?.employee.name} accent={accent} copy={copy} /> : <div />}
    >
      {bootstrap && !session ? (
        <PinGate busy={loading} copy={copy} error={error} onClearError={() => setError('')} onSubmit={authenticate} tone={identityTone} />
      ) : session && workspace && activeKioskId !== null ? (
        <div className="space-y-4">
          <button type="button" onClick={() => { setWorkspace(null); setActiveKioskId(null); setError(''); }} className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" />{copy.workspace.back}</button>
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: accent.color }}>{moduleName(workspace.kiosk.module, copy)}</p>
            <h2 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{workspace.kiosk.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{workspace.bootstrap?.scope_label ?? workspace.kiosk.purpose}</p>
          </section>
          {workspace.experience_status !== 'READY' ? (
            <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 text-center text-amber-900"><LockKeyhole className="mx-auto h-7 w-7" /><h3 className="mt-3 text-base font-medium">{copy.workspace.verificationTitle}</h3><p className="mt-2 text-sm leading-6">{copy.workspace.verificationDescription}</p></section>
          ) : workspace.kiosk.module === 'PROCESS_TASKS' ? (
            <TaskWorkspace token={token} kioskId={activeKioskId} workspace={workspace} accent={accent} copy={copy} onAuthorizationFailure={handleAuthorizationFailure} onRefresh={refreshWorkspace} />
          ) : workspace.kiosk.module === 'HUMAN_RESOURCES' ? (
            <AttendanceMultiKioskWorkspace key={workspace.session.id} token={token} kioskId={activeKioskId} workspace={workspace} locale={currentLanguage.code} onAuthorizationFailure={handleAuthorizationFailure} onRefresh={refreshWorkspace} />
          ) : workspace.kiosk.module === 'PETTY_CASH' ? (
            <PettyCashMultiKioskWorkspace key={workspace.session.id} token={token} kioskId={activeKioskId} workspace={workspace} locale={currentLanguage.code} onAuthorizationFailure={handleAuthorizationFailure} onRefresh={refreshWorkspace} />
          ) : (
            <section className="rounded-[24px] border border-slate-200 bg-white p-6 text-center text-sm text-slate-500"><ShieldCheck className="mx-auto h-7 w-7" style={{ color: accent.color }} /><p className="mt-3">{copy.workspace.connected}</p></section>
          )}
        </div>
      ) : session ? (
        <Launcher session={session} accent={accent} busyId={busyId} copy={copy} error={error} onOpen={open} onSignOut={signOut} />
      ) : null}
    </KioskPublicShell>
  );
}
