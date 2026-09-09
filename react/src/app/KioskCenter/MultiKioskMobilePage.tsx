import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Grid2X2,
  Handshake,
  LoaderCircle,
  LockKeyhole,
  LogOut,
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
import { ProviderCenterAccessGate } from './multi-kiosk/ProviderCenterAccessGate';
import { getProviderCenterPublicCopy, type ProviderCenterPublicCopy } from './providerCenterPublicTranslations';

const accents: Record<string, { color: string; soft: string; textClassName: string }> = {
  'indice-aqua': { color: '#177D66', soft: '#EAF8F3', textClassName: 'text-emerald-700 dark:text-emerald-300' },
  'indice-blue': { color: '#2563EB', soft: '#EFF6FF', textClassName: 'text-blue-700 dark:text-blue-300' },
  'indice-green': { color: '#16876B', soft: '#EAF8F3', textClassName: 'text-emerald-700 dark:text-emerald-300' },
  'indice-yellow': { color: '#C67A05', soft: '#FFF8E6', textClassName: 'text-amber-800 dark:text-amber-300' },
  'indice-coral': { color: '#E85D52', soft: '#FFF0EE', textClassName: 'text-rose-700 dark:text-rose-300' },
};

const identityTones: Record<string, KioskThemeTone> = {
  'indice-aqua': 'aqua',
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

function MultiKioskHeader({
  bootstrap,
  identityName,
  accent,
  copy,
  providerCopy,
  compact = false,
  busy = false,
  onBack,
  onSignOut,
  utilities,
  workspace,
}: {
  bootstrap: MultiKioskBootstrap;
  identityName?: string;
  accent: { color: string; soft: string; textClassName: string };
  copy: MultiKioskMobileCopy;
  providerCopy?: ProviderCenterPublicCopy;
  compact?: boolean;
  busy?: boolean;
  onBack?: () => void;
  onSignOut?: () => void;
  utilities?: ReactNode;
  workspace?: MultiKioskChildWorkspace | null;
}) {
  const signOutLabel = bootstrap.audience_type === 'PROVIDER'
    ? (providerCopy?.header.changeProvider ?? copy.launcher.signOut)
    : copy.launcher.signOut;

  if (compact && identityName) {
    return (
      <header
        className="border-b border-slate-200 bg-white px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-950 sm:px-4"
        data-multi-kiosk-app-bar
      >
        <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-[479px]:grid-cols-1 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {workspace && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-4 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                style={{ '--tw-ring-color': `${accent.color}25` } as React.CSSProperties}
                aria-label={copy.workspace.back}
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <span
                aria-hidden="true"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                style={{ color: accent.color, backgroundColor: accent.soft }}
              >
                {bootstrap.audience_type === 'PROVIDER'
                  ? <Handshake className="h-5 w-5" />
                  : <Grid2X2 className="h-5 w-5" />}
              </span>
            )}
            {workspace ? (
              <MultiKioskToolGlyph source={workspace.kiosk} className="h-10 w-10 shrink-0 rounded-xl max-[359px]:hidden" />
            ) : null}

            <div className="min-w-0 flex-1">
              <p className={`truncate text-[11px] font-medium leading-4 ${workspace ? 'text-slate-500 dark:text-slate-400' : accent.textClassName}`}>
                {workspace ? moduleName(workspace.kiosk.module, copy) : bootstrap.company_name}
              </p>
              <h1
                className="truncate text-base font-medium leading-5 text-slate-950 dark:text-white sm:text-lg"
                id={workspace ? 'multi-kiosk-workspace-title' : undefined}
              >
                {workspace ? workspace.kiosk.name : bootstrap.name}
              </h1>
              {workspace ? (
                <p className="truncate text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  {workspace.bootstrap?.scope_label ?? workspace.kiosk.purpose} · {identityName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {utilities}
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                disabled={busy}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-0 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-4 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 sm:w-auto sm:px-3"
                style={{ '--tw-ring-color': `${accent.color}25` } as React.CSSProperties}
                aria-label={signOutLabel}
                title={signOutLabel}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{bootstrap.audience_type === 'PROVIDER' ? signOutLabel : copy.launcher.changeEmployee}</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-slate-200 bg-white px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-950 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 max-[479px]:grid-cols-1">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{ color: accent.color, backgroundColor: accent.soft }}
          >
            {bootstrap.audience_type === 'PROVIDER'
              ? <Handshake className="h-5 w-5" />
              : <Grid2X2 className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-medium ${accent.textClassName}`}>
              {bootstrap.audience_type === 'PROVIDER' && providerCopy
                ? `${providerCopy.header.portal} · ${bootstrap.company_name}`
                : bootstrap.company_name}
            </p>
            <h1 className="mt-1 text-xl font-medium tracking-tight text-slate-950 dark:text-white">{bootstrap.name}</h1>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {bootstrap.description || copy.header.defaultDescription}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end">{utilities}</div>
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

function Launcher({ session, accent, busy, busyId, copy, error, onOpen }: {
  session: MultiKioskMobileSession;
  accent: { color: string; soft: string; textClassName: string };
  busy: boolean;
  busyId: number | null;
  copy: MultiKioskMobileCopy;
  error: string;
  onOpen: (card: MultiKioskCard) => Promise<void>;
}) {
  return (
    <div aria-busy={busy || busyId !== null} className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5" data-multi-kiosk-launcher>
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
        sessionLabel={session.identity?.name ?? session.provider?.name ?? session.employee?.name ?? ''}
        sessionStatusLabel={copy.launcher.activeSession}
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
  const providerAudience = bootstrap?.audience_type === 'PROVIDER';
  const accentKey = providerAudience ? 'indice-aqua' : (bootstrap?.theme_key ?? 'indice-blue');
  const accent = accents[accentKey] ?? accents['indice-blue'];
  const identityTone = providerAudience ? 'aqua' : (identityTones[accentKey] ?? 'blue');
  const copy = getMultiKioskMobileCopy(currentLanguage.code);
  const providerCopy = getProviderCenterPublicCopy(currentLanguage.code);
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

  const authenticate = async (pin: string, providerName?: string) => {
    if (!bootstrap || authenticationInFlightRef.current) return;
    authenticationInFlightRef.current = true;
    setLoading(true);
    setError('');
    multiKioskMobileSession.clearAuthority(token);
    try { setSession(await multiKioskPublicApi.authenticate(token, pin, bootstrap.csrf_token, providerName)); }
    catch (failure) {
      setError(providerAudience && failure instanceof ApiClientError && failure.status === 403
        ? providerCopy.access.invalidCredentials
        : friendlyError(failure, copy));
    }
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
        if (lastOpenedTool) lastOpenedTool.focus();
        else launcherFocusRef.current?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [session, workspaceOpen]);

  if (!bootstrap && !loading) {
    return <main className="grid min-h-dvh place-items-center bg-slate-100 p-6 text-center text-sm text-slate-600">{error || copy.errors.unavailable}</main>;
  }

  const posWorkspace = workspace?.kiosk.module === 'POINT_OF_SALE';
  const providerWorkspace = providerAudience && Boolean(workspace);
  const shellWidth = !session
    ? providerAudience ? 'max-w-2xl' : 'max-w-[31rem]'
    : workspace
      ? posWorkspace ? 'max-w-[96rem]' : providerWorkspace ? 'max-w-5xl' : 'max-w-3xl'
      : 'max-w-6xl';

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
      header={bootstrap ? ((utilities) => (
        <MultiKioskHeader
          bootstrap={bootstrap}
          accent={accent}
          copy={copy}
          providerCopy={providerAudience ? providerCopy : undefined}
          compact={Boolean(session)}
          identityName={session?.identity?.name ?? session?.provider?.name ?? session?.employee?.name}
          busy={loading || busyId !== null}
          onBack={workspace ? returnToLauncher : undefined}
          onSignOut={session ? () => { void signOut(); } : undefined}
          utilities={utilities}
          workspace={workspace}
        />
      )) : <div />}
    >
      {bootstrap && !session ? (
        bootstrap.audience_type === 'PROVIDER' ? (
          <ProviderCenterAccessGate
            allowRegistration={bootstrap.allow_provider_registration}
            backspaceLabel={copy.pin.backspace}
            busy={loading}
            clearLabel={copy.pin.clear}
            companyName={bootstrap.company_name}
            copy={providerCopy}
            error={error}
            onClearError={() => setError('')}
            onRegister={async payload => (await multiKioskPublicApi.registerProvider(token, payload, bootstrap.csrf_token)).message}
            onSubmit={(providerName, pin) => authenticate(pin, providerName)}
          />
        ) : (
          <PinGate busy={loading} copy={copy} error={error} onClearError={() => setError('')} onSubmit={authenticate} tone={identityTone} />
        )
      ) : session && workspace && activeKioskId !== null ? (
        <div
          ref={workspaceFocusRef}
          aria-labelledby="multi-kiosk-workspace-title"
          tabIndex={-1}
          className={`mx-auto w-full outline-none ${posWorkspace ? 'max-w-[96rem]' : providerWorkspace ? 'max-w-5xl' : 'max-w-3xl'}`}
        >
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
          <Launcher session={session} accent={accent} busy={loading} busyId={busyId} copy={copy} error={error} onOpen={openTool} />
        </div>
      ) : null}
    </KioskPublicShell>
  );
}
