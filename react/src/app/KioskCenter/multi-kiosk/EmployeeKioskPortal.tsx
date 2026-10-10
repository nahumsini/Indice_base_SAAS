import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import { multiKioskPublicApi, type MultiKioskMobileSession, type MultiKioskCard, type MultiKioskToday } from '../../api/multiKiosks';
import { ApiClientError } from '../../lib/apiClient';
import { messagingApi } from '../../Messaging/api';
import type { ComposerState } from '../../Messaging/MessagingWorkspace';
import { MessagingTransportContext, MessagingVisibleContext } from '../../Messaging/MessagingTransportContext';
import { useKioskNavigationState } from '../../components/kiosk-engine/KioskNavigationBoundary';
import type { MultiKioskMobileCopy } from '../multiKioskMobileTranslations';
import { EmployeeKioskHome } from './EmployeeKioskHome';
import { EmployeeKioskToday } from './EmployeeKioskToday';
import { employeePortalCopy, employeePortalCount } from './employeePortalCopy';

const Messages = lazy(() => import('../../Messaging/MessagingWorkspace').then(module => ({ default: module.MessagingWorkspace })));
type Tab = 'today' | 'tools' | 'messages';
export function EmployeeKioskPortal({ token, session, locale, copy, accent, workspace, busyId, error, onOpen, onHome, onAuthorizationFailure, navigate }: {
  token: string; session: MultiKioskMobileSession; locale: string; copy: MultiKioskMobileCopy;
  accent: { color: string; soft: string }; workspace: ReactNode; busyId: number | null; error: string;
  onOpen: (card: MultiKioskCard) => Promise<void>; onHome: () => void;
  onAuthorizationFailure: (failure: unknown) => boolean; navigate: (action: () => void) => void;
}) {
  const c = employeePortalCopy(locale);
  const [tab, setTab] = useState<Tab>('today');
  const [visitedMessages, setVisitedMessages] = useState(false);
  const [messageRevision, setMessageRevision] = useState(0);
  const [composer, setComposer] = useState<ComposerState>({ dirty:false, busy:false });
  const [today, setToday] = useState<MultiKioskToday | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [revision, setRevision] = useState(0);
  const messagesPanel = useRef<HTMLDivElement>(null);
  const portalPanel = useRef<HTMLDivElement>(null);
  const navigationBar = useRef<HTMLElement>(null);
  useEffect(() => {
    const measure = () => portalPanel.current?.style.setProperty('--employee-navigation-height',
      `${window.innerWidth < 768 ? navigationBar.current?.getBoundingClientRect().height ?? 0 : 0}px`);
    const observer = new ResizeObserver(measure);
    if (navigationBar.current) observer.observe(navigationBar.current);
    measure(); window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const authFailure = useRef(onAuthorizationFailure);
  authFailure.current = onAuthorizationFailure;
  useKioskNavigationState(composer);
  const api = useMemo(() => messagingApi('member', async <T,>(path: string, init?: RequestInit): Promise<T> => {
    try { return await multiKioskPublicApi.employeeMessaging<T>(token, path, init); }
    catch (failure) {
      if (mounted.current && failure instanceof ApiClientError && (failure.code === 'KIOSK_ACTION_NOT_ALLOWED' || failure.code === 'KIOSK_NOT_AVAILABLE' || failure.status === 401)) authFailure.current(failure);
      throw failure;
    }
  }, ''), [token]);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); if (navigator.onLine) refresh(); };
    window.addEventListener('online', update); window.addEventListener('offline', update);
    const focus = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', focus);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); document.removeEventListener('visibilitychange', focus); };
  }, [refresh]);
  useEffect(() => {
    if (workspace || tab !== 'today' || document.hidden) return;
    const controller = new AbortController();
    setLoading(true);
    multiKioskPublicApi.today(token, controller.signal).then(data => { if (!controller.signal.aborted) { setToday(data); setFailed(false); } })
      .catch(failure => { if (!controller.signal.aborted && !authFailure.current(failure)) { setToday(null); setFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const timer = window.setTimeout(refresh, 60000);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [token, revision, tab, Boolean(workspace), refresh]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { if (!document.hidden && navigator.onLine) { const count = await apiUnread(); if (active) setUnread(count); } }
      catch { if (active) setUnread(null); }
      finally { if (active) timer = setTimeout(poll, 15000); }
    };
    const apiUnread = async () => {
      try { return await multiKioskPublicApi.employeeMessaging<number>(token, '/unread'); }
      catch (failure) { if (active && mounted.current && failure instanceof ApiClientError && (failure.code === 'KIOSK_ACTION_NOT_ALLOWED' || failure.code === 'KIOSK_NOT_AVAILABLE')) authFailure.current(failure); throw failure; }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [token, tab]);
  const messagesVisible = tab === 'messages' && !workspace;
  useEffect(() => {
    if (!messagesVisible) return;
    const viewport = window.visualViewport;
    const resize = () => {
      const panel = messagesPanel.current;
      if (!panel) return;
      const bottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
      const clearance = window.innerWidth < 768 ? (navigationBar.current?.getBoundingClientRect().height ?? 72) + 16 : 24;
      panel.style.height = `${Math.max(160, bottom - panel.getBoundingClientRect().top - clearance)}px`;
    };
    const observer = new ResizeObserver(resize);
    if (navigationBar.current) observer.observe(navigationBar.current);
    resize(); window.addEventListener('resize', resize); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); };
  }, [messagesVisible]);
  const select = (next: Tab) => navigate(() => {
    if (composer.dirty) { setVisitedMessages(false); setMessageRevision(value => value + 1); setComposer({ dirty:false, busy:false }); }
    onHome(); setTab(next); if (next === 'messages') setVisitedMessages(true);
    window.scrollTo({ top: 0, behavior:'instant' });
  });
  const open = (id: number) => {
    const card = session.kiosks.find(item => item.id === id);
    if (card) { setTab('tools'); void onOpen(card); }
  };
  const activeTab = workspace ? 'tools' : tab;
  return <div ref={portalPanel} className="[--employee-navigation-height:calc(4.5rem+env(safe-area-inset-bottom))] pb-[calc(var(--employee-navigation-height)+1rem)] md:[--employee-navigation-height:0px] md:pb-0 [&_[data-kiosk-sticky-action].sticky]:bottom-[var(--employee-navigation-height)] [&_[data-preticket-cart-bar]]:bottom-[var(--employee-navigation-height)] [&_[data-waiter-workspace]_footer.sticky]:bottom-[var(--employee-navigation-height)]" data-employee-portal>
    <nav ref={navigationBar} aria-label={c.navigation} className="fixed inset-x-0 bottom-0 z-40 bg-slate-50/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:static md:mb-5 md:max-w-lg md:bg-transparent md:p-0 md:backdrop-blur-none dark:bg-slate-950/95 md:dark:bg-transparent" data-employee-navigation>
      <div className="grid grid-cols-3 gap-1 rounded-[1.5rem] border border-[#DCE5F1] bg-white p-1.5 shadow-[0_6px_24px_-8px_rgba(20,54,117,0.22)] dark:border-slate-700 dark:bg-slate-900 md:rounded-[1.25rem] md:shadow-none [[data-kiosk-large-text=true]_&]:grid-cols-[minmax(0,0.75fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
      {(['today','tools','messages'] as const).map(key => {
        const selected = activeTab === key;
        const emoji = key === 'today' ? '🌤️' : key === 'tools' ? '🧰' : unread ? '📬' : '💬';
        return <button key={key} type="button" aria-label={key === 'messages' && unread ? `${c.messages}, ${employeePortalCount(locale, 'unread', unread)}` : c[key]} aria-current={selected ? 'page' : undefined} disabled={composer.busy || busyId !== null} onClick={() => select(key)} className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.125rem] px-1 py-1.5 text-xs font-medium transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 disabled:opacity-50 md:min-h-12 md:flex-row md:gap-2 md:px-3 md:text-sm ${selected ? 'bg-[#143675] text-white shadow-[0_3px_8px_-3px_rgba(20,54,117,0.45)] dark:bg-[#2563EB]' : 'text-[#425466] hover:bg-[#EFF6FF] dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          <span aria-hidden="true" className="relative flex h-7 items-center justify-center"><span className="text-[1.5rem] leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{emoji}</span>{key === 'messages' && unread !== null && unread > 0 ? <span className="absolute -right-3.5 -top-1.5 min-w-4 rounded-full bg-[#BE123C] px-1 text-center text-[10px] leading-4 text-white ring-2 ring-white dark:ring-slate-900">{unread > 99 ? '99+' : unread}</span> : null}</span>
          <span className="max-w-full leading-4 [overflow-wrap:anywhere]">{c[key]}</span>
        </button>;
      })}
      </div>
    </nav>
    {!online ? <p role="status" className="mb-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><WifiOff size={18} className="shrink-0" />{c.offline}</p> : null}
    {error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {workspace}
    <div hidden={Boolean(workspace) || tab !== 'today'}>{!workspace && tab === 'today' ? <EmployeeKioskToday name={session.identity?.name ?? session.employee?.name ?? ''} locale={locale} data={today} unread={unread} loading={loading} failed={failed} busy={busyId !== null} onRefresh={refresh} onOpen={open} onMessages={() => select('messages')} onTools={() => select('tools')} /> : null}</div>
    <div hidden={Boolean(workspace) || tab !== 'tools'}><EmployeeKioskHome accent={accent} busyId={busyId} cards={session.kiosks} copy={copy} employeeName={session.identity?.name ?? session.employee?.name ?? ''} moduleLabel={module => copy.moduleNames[module] ?? module} onOpen={onOpen} /></div>
    <div hidden={!messagesVisible}><div ref={messagesPanel} className="flex h-[70dvh] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700" data-kiosk-messages>
      {visitedMessages ? <MessagingTransportContext.Provider value={api}><MessagingVisibleContext.Provider value={messagesVisible}><Suspense fallback={<p role="status" className="p-5 text-sm">{copy.loading}</p>}><Messages key={messageRevision} initialKind="DIRECT" portal="member" locale={locale} userId={0} contained onComposerState={setComposer} /></Suspense></MessagingVisibleContext.Provider></MessagingTransportContext.Provider> : null}
    </div></div>
  </div>;
}
