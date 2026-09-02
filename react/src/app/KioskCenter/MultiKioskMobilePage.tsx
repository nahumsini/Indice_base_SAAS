import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Grid2X2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import {
  isMultiKioskAuthorizationFailure,
  isMultiKioskChildAuthorityLoss,
  multiKioskMobileSession,
  multiKioskPublicApi,
  type MultiKioskBootstrap,
  type MultiKioskCard,
  type MultiKioskChildWorkspace,
  type MultiKioskMobileSession,
} from '../api/multiKiosks';
import { KioskIdentityGate } from '../components/kiosk-engine/KioskIdentityGate';
import { KioskPublicShell } from '../components/kiosk-engine/KioskPublicShell';
import type { KioskThemeTone } from '../components/kiosk-engine/KioskWorkspacePrimitives';
import { ApiClientError } from '../lib/apiClient';
import { useLanguage } from '../shared/context';
import {
  getMultiKioskToolIdentity,
  MultiKioskLauncherDashboard,
  MultiKioskToolGlyph,
  MultiKioskToolHost,
} from './multi-kiosk';
import {
  getMultiKioskMobileCopy,
  type MultiKioskMobileCopy,
} from './multiKioskMobileTranslations';

const accents: Record<string, { color: string; soft: string; textClassName: string }> = {
  'indice-blue': { color: '#2563EB', soft: '#EFF6FF', textClassName: 'text-blue-700 dark:text-blue-300' },
  'indice-green': { color: '#16876B', soft: '#EAF8F3', textClassName: 'text-emerald-700 dark:text-emerald-300' },
  'indice-yellow': { color: '#C67A05', soft: '#FFF8E6', textClassName: 'text-amber-800 dark:text-amber-300' },
  'indice-coral': { color: '#E85D52', soft: '#FFF0EE', textClassName: 'text-rose-700 dark:text-rose-300' },
};

const identityTones: Record<string, KioskThemeTone> = {
  'indice-blue': 'blue',
  'indice-green': 'green',
  'indice-yellow': 'yellow',
  'indice-coral': 'coral',
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

function MultiKioskHeader({ bootstrap, employee, accent, copy, compact = false }: {
  bootstrap: MultiKioskBootstrap;
  employee?: string;
  accent: { color: string; soft: string; textClassName: string };
  copy: MultiKioskMobileCopy;
  compact?: boolean;
}) {
  return (
    <header className={`border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6 ${compact ? 'py-3' : 'py-5'}`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`grid shrink-0 place-items-center rounded-2xl ${compact ? 'h-10 w-10 sm:h-12 sm:w-12' : 'h-12 w-12'}`}
          style={{ color: accent.color, backgroundColor: accent.soft }}
        >
          <Grid2X2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-medium ${accent.textClassName}`}>{bootstrap.company_name}</p>
          <h1 className={`mt-1 font-medium tracking-tight text-slate-950 dark:text-white ${compact ? 'text-lg sm:text-xl' : 'text-xl'}`}>{bootstrap.name}</h1>
          {!compact ? (
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {employee ? copy.header.employeeGreeting(employee) : bootstrap.description || copy.header.defaultDescription}
            </p>
          ) : null}
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
      {error ? (
        <p id="multi-kiosk-pin-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {error}
        </p>
      ) : null}
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

function Launcher({ session, accent, busy, busyId, copy, error, onOpen, onSignOut }: {
  session: MultiKioskMobileSession;
  accent: { color: string; soft: string; textClassName: string };
  busy: boolean;
  busyId: number | null;
  copy: MultiKioskMobileCopy;
  error: string;
  onOpen: (card: MultiKioskCard) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div aria-busy={busy || busyId !== null} className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5">
      <section
        aria-label={copy.launcher.activeSession}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5 sm:pl-6"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent.color }} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 dark:border-slate-700"
              style={{ color: accent.color, backgroundColor: accent.soft }}
            >
              <Grid2X2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{copy.launcher.activeSession}</span>
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-medium leading-6 text-slate-950 dark:text-white sm:text-xl">
                {copy.header.employeeGreeting(session.employee.name)}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            disabled={busy || busyId !== null}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-4 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            style={{ '--tw-ring-color': `${accent.color}25` } as React.CSSProperties}
            aria-label={copy.launcher.signOut}
            title={copy.launcher.signOut}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden min-[360px]:inline">{copy.launcher.changeEmployee}</span>
          </button>
        </div>
      </section>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {busyId !== null ? (
        <p
          aria-live="polite"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          role="status"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" style={{ color: accent.color }} />
          {copy.loading}
        </p>
      ) : null}
      <MultiKioskLauncherDashboard
        busyId={busy ? -1 : busyId}
        cards={session.kiosks}
        copy={copy.launcher}
        moduleLabel={ownerModule => moduleName(ownerModule, copy)}
        onOpen={onOpen}
      />
    </div>
  );
}

export default function MultiKioskMobilePage() {
  const token = useParams().publicAccessToken ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentLanguage } = useLanguage();
  const [bootstrap, setBootstrap] = useState<MultiKioskBootstrap | null>(null);
  const [session, setSession] = useState<MultiKioskMobileSession | null>(null);
  const [workspace, setWorkspace] = useState<MultiKioskChildWorkspace | null>(null);
  const [activeKioskId, setActiveKioskId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const routeAttemptRef = useRef('');
  const authenticationInFlightRef = useRef(false);
  const signOutInFlightRef = useRef(false);
  const openingKioskIdRef = useRef<number | null>(null);
  const openControllerRef = useRef<AbortController | null>(null);
  const workspaceRequestRef = useRef(0);
  const lastOpenedKioskIdRef = useRef<number | null>(null);
  const launcherFocusRef = useRef<HTMLDivElement>(null);
  const workspaceFocusRef = useRef<HTMLDivElement>(null);
  const requestedToolIdentity = searchParams.get('tool') ?? '';
  const accent = accents[bootstrap?.theme_key ?? 'indice-blue'] ?? accents['indice-blue'];
  const identityTone = identityTones[bootstrap?.theme_key ?? 'indice-blue'] ?? 'blue';
  const copy = getMultiKioskMobileCopy(currentLanguage.code);
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const setToolRoute = useCallback((identity: string | null, replace = false) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      if (identity) next.set('tool', identity);
      else next.delete('tool');
      return next;
    }, { replace });
  }, [setSearchParams]);

  const clearLocalAuthority = useCallback((message = '', clearRoute = true) => {
    openControllerRef.current?.abort();
    openControllerRef.current = null;
    openingKioskIdRef.current = null;
    workspaceRequestRef.current += 1;
    multiKioskMobileSession.clearAuthority(token);
    routeAttemptRef.current = '';
    setWorkspace(null);
    setActiveKioskId(null);
    setSession(null);
    setBusyId(null);
    setError(message);
    if (clearRoute) setToolRoute(null, true);
  }, [setToolRoute, token]);

  const clearChildAuthority = useCallback((kioskId: number, message: string) => {
    openControllerRef.current?.abort();
    openControllerRef.current = null;
    openingKioskIdRef.current = null;
    workspaceRequestRef.current += 1;
    multiKioskMobileSession.childClear(token, kioskId);
    routeAttemptRef.current = '';
    setWorkspace(null);
    setActiveKioskId(null);
    setBusyId(null);
    setSession(current => current
      ? { ...current, kiosks: current.kiosks.filter(card => card.id !== kioskId) }
      : current);
    setError(message);
    setToolRoute(null, true);
  }, [setToolRoute, token]);

  const handleAuthorizationFailure = useCallback((failure: unknown, kioskId = activeKioskId) => {
    if (isMultiKioskAuthorizationFailure(failure)) {
      clearLocalAuthority(copy.errors.sessionExpired);
      return true;
    }
    if (isMultiKioskChildAuthorityLoss(failure) && kioskId !== null) {
      clearChildAuthority(kioskId, copy.errors.toolUnavailable);
      return true;
    }
    return false;
  }, [activeKioskId, clearChildAuthority, clearLocalAuthority, copy.errors.sessionExpired, copy.errors.toolUnavailable]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    multiKioskPublicApi.bootstrap(token, controller.signal)
      .then(async data => {
        setBootstrap(data);
        try { sessionStorage.setItem(`indice.multi-kiosk.${token}.csrf`, data.csrf_token); } catch { /* no-op */ }
        if (multiKioskMobileSession.get(token)) {
          try { setSession(await multiKioskPublicApi.session(token, controller.signal)); }
          catch (failure) {
            if (controller.signal.aborted) return;
            clearLocalAuthority(isMultiKioskAuthorizationFailure(failure)
              ? copyRef.current.errors.sessionExpired
              : friendlyError(failure, copyRef.current));
          }
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(friendlyError(failure, copyRef.current)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [clearLocalAuthority, token]);

  const authenticate = async (pin: string) => {
    if (!bootstrap || authenticationInFlightRef.current) return;
    authenticationInFlightRef.current = true;
    setLoading(true);
    setError('');
    multiKioskMobileSession.clearAuthority(token);
    try { setSession(await multiKioskPublicApi.authenticate(token, pin, bootstrap.csrf_token)); }
    catch (failure) { setError(friendlyError(failure, copy)); }
    finally {
      authenticationInFlightRef.current = false;
      setLoading(false);
    }
  };

  const openTool = useCallback(async (card: MultiKioskCard, syncRoute = true) => {
    if (!bootstrap || openingKioskIdRef.current !== null) return;
    const controller = new AbortController();
    const requestId = ++workspaceRequestRef.current;
    openingKioskIdRef.current = card.id;
    openControllerRef.current = controller;
    lastOpenedKioskIdRef.current = card.id;
    setBusyId(card.id);
    setError('');
    try {
      const launchAndLoad = async () => {
        await multiKioskPublicApi.launch(token, card.id, bootstrap.csrf_token, controller.signal);
        return multiKioskPublicApi.workspace(token, card.id, controller.signal);
      };
      let nextWorkspace: MultiKioskChildWorkspace;
      if (multiKioskMobileSession.childGet(token, card.id)) {
        try {
          nextWorkspace = await multiKioskPublicApi.workspace(token, card.id, controller.signal);
        } catch (failure) {
          if (!isMultiKioskAuthorizationFailure(failure) || controller.signal.aborted) throw failure;
          multiKioskMobileSession.childClear(token, card.id);
          nextWorkspace = await launchAndLoad();
        }
      } else {
        nextWorkspace = await launchAndLoad();
      }
      if (controller.signal.aborted || workspaceRequestRef.current !== requestId) return;
      const identity = getMultiKioskToolIdentity(card);
      routeAttemptRef.current = identity;
      if (syncRoute) setToolRoute(identity);
      setActiveKioskId(card.id);
      setWorkspace(nextWorkspace);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (!handleAuthorizationFailure(failure, card.id)) {
        setError(friendlyError(failure, copy));
        if (!syncRoute) setToolRoute(null, true);
      }
    } finally {
      if (openControllerRef.current === controller) openControllerRef.current = null;
      if (openingKioskIdRef.current === card.id) openingKioskIdRef.current = null;
      if (workspaceRequestRef.current === requestId) setBusyId(null);
    }
  }, [bootstrap, copy, handleAuthorizationFailure, setToolRoute, token]);

  useEffect(() => {
    if (!session || busyId !== null || !requestedToolIdentity) return;
    const activeToolIdentity = workspace ? getMultiKioskToolIdentity(workspace.kiosk) : '';
    if (activeToolIdentity === requestedToolIdentity) return;
    if (routeAttemptRef.current === requestedToolIdentity) return;
    const card = session.kiosks.find(item => getMultiKioskToolIdentity(item) === requestedToolIdentity);
    if (!card) {
      routeAttemptRef.current = requestedToolIdentity;
      setWorkspace(null);
      setActiveKioskId(null);
      setError(copy.errors.unavailable);
      setToolRoute(null, true);
      return;
    }
    routeAttemptRef.current = requestedToolIdentity;
    setWorkspace(null);
    setActiveKioskId(null);
    void openTool(card, false);
  }, [busyId, copy.errors.unavailable, openTool, requestedToolIdentity, session, setToolRoute, workspace]);

  useEffect(() => {
    if (requestedToolIdentity) return;
    routeAttemptRef.current = '';
    if (!workspace) return;
    setWorkspace(null);
    setActiveKioskId(null);
    setError('');
  }, [requestedToolIdentity, workspace]);

  const refreshWorkspace = useCallback(async () => {
    if (activeKioskId === null) return;
    const requestId = ++workspaceRequestRef.current;
    const nextWorkspace = await multiKioskPublicApi.workspace(token, activeKioskId);
    if (workspaceRequestRef.current === requestId) setWorkspace(nextWorkspace);
  }, [activeKioskId, token]);

  useEffect(() => () => {
    openControllerRef.current?.abort();
    workspaceRequestRef.current += 1;
  }, [token]);

  const returnToLauncher = () => {
    openControllerRef.current?.abort();
    openControllerRef.current = null;
    openingKioskIdRef.current = null;
    workspaceRequestRef.current += 1;
    setBusyId(null);
    routeAttemptRef.current = '';
    setWorkspace(null);
    setActiveKioskId(null);
    setError('');
    setToolRoute(null, true);
  };

  const signOut = async () => {
    if (signOutInFlightRef.current) return;
    signOutInFlightRef.current = true;
    openControllerRef.current?.abort();
    openControllerRef.current = null;
    openingKioskIdRef.current = null;
    workspaceRequestRef.current += 1;
    setLoading(true);
    try {
      if (bootstrap) await multiKioskPublicApi.signOut(token, bootstrap.csrf_token);
    } catch {
      // The shared device still forgets all local authority when server revocation is unavailable.
    } finally {
      clearLocalAuthority('');
      signOutInFlightRef.current = false;
      setLoading(false);
    }
  };

  const workspaceOpen = Boolean(session && workspace && activeKioskId !== null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (workspaceOpen) workspaceFocusRef.current?.focus();
      else if (session) {
        const lastOpenedKioskId = lastOpenedKioskIdRef.current;
        const lastOpenedTool = lastOpenedKioskId === null
          ? null
          : launcherFocusRef.current?.querySelector<HTMLButtonElement>(`[data-multi-kiosk-id="${lastOpenedKioskId}"]`);
        (lastOpenedTool ?? launcherFocusRef.current)?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [session, workspaceOpen]);

  if (!bootstrap && !loading) {
    return <main className="grid min-h-dvh place-items-center bg-slate-100 p-6 text-center text-sm text-slate-600">{error || copy.errors.unavailable}</main>;
  }

  const shellWidth = !session ? 'max-w-[31rem]' : workspace ? 'max-w-3xl' : 'max-w-6xl';

  return (
    <KioskPublicShell
      moduleScope="MULTI_KIOSK"
      defaultLocale={bootstrap?.locale}
      maxWidthClassName={shellWidth}
      minimalContent
      loadingOverlay={loading ? (
        <div
          aria-label={copy.loading}
          aria-live="polite"
          className="fixed inset-0 z-[200] grid place-items-center bg-white/80 backdrop-blur-sm dark:bg-slate-950/80"
          role="status"
        >
          <LoaderCircle className="h-7 w-7 animate-spin" style={{ color: accent.color }} />
        </div>
      ) : null}
      header={bootstrap ? (
        <MultiKioskHeader
          bootstrap={bootstrap}
          accent={accent}
          copy={copy}
          compact={Boolean(session)}
        />
      ) : <div />}
    >
      {bootstrap && !session ? (
        <PinGate busy={loading} copy={copy} error={error} onClearError={() => setError('')} onSubmit={authenticate} tone={identityTone} />
      ) : session && workspace && activeKioskId !== null ? (
        <div
          ref={workspaceFocusRef}
          aria-labelledby="multi-kiosk-workspace-title"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl space-y-3 outline-none sm:space-y-4"
        >
          <button
            type="button"
            onClick={returnToLauncher}
            className="sticky top-0 z-30 -mx-1 inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-50/95 px-3 text-sm font-medium text-slate-600 outline-none backdrop-blur transition hover:text-slate-950 focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:text-white sm:static sm:mx-0 sm:bg-transparent sm:px-2 sm:backdrop-blur-none sm:dark:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {copy.workspace.back}
          </button>
          <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950 sm:p-4">
            <MultiKioskToolGlyph source={workspace.kiosk} className="h-10 w-10 sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{moduleName(workspace.kiosk.module, copy)}</p>
              <h2 id="multi-kiosk-workspace-title" className="mt-1 text-lg font-medium text-slate-950 dark:text-white sm:text-xl">{workspace.kiosk.name}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {workspace.bootstrap?.scope_label ?? workspace.kiosk.purpose}
              </p>
            </div>
          </section>
          {workspace.experience_status !== 'READY' ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
              <LockKeyhole className="mx-auto h-7 w-7" aria-hidden="true" />
              <h3 className="mt-3 text-base font-medium">{copy.workspace.verificationTitle}</h3>
              <p className="mt-2 text-sm leading-6">{copy.workspace.verificationDescription}</p>
              <button
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/25 dark:border-amber-700 dark:bg-slate-950 dark:text-amber-100 dark:hover:bg-amber-950/60"
                onClick={returnToLauncher}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {copy.workspace.back}
              </button>
            </section>
          ) : (
            <MultiKioskToolHost
              key={workspace.session.id}
              token={token}
              kioskId={activeKioskId}
              workspace={workspace}
              locale={currentLanguage.code}
              copy={copy}
              onAuthorizationFailure={handleAuthorizationFailure}
              onRefresh={refreshWorkspace}
            />
          )}
        </div>
      ) : session ? (
        <div ref={launcherFocusRef} aria-labelledby="multi-kiosk-tool-dashboard-title" tabIndex={-1} className="outline-none">
          <Launcher session={session} accent={accent} busy={loading} busyId={busyId} copy={copy} error={error} onOpen={openTool} onSignOut={signOut} />
        </div>
      ) : null}
    </KioskPublicShell>
  );
}
