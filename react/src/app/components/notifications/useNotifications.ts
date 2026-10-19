import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsApi, type AppNotification, type NotificationsSummary } from '../../api/notifications';
import { NOTIFICATIONS_REFRESH_EVENT } from '../../api/notificationEvents';
import { ApiClientError } from '../../lib/apiClient';
import { notificationFlowCopy } from './notificationFlowCopy';

const emptySummary: NotificationsSummary = { total_count: 0, unread_count: 0 };
type Snapshot = { items: AppNotification[]; summary: NotificationsSummary };
const empty: Snapshot = { items: [], summary: emptySummary };

/** Mounted per account/company by NotificationLauncher. Late responses never restore private state. */
export function useNotifications(locale: string) {
  const copy = notificationFlowCopy(locale);
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const mounted = useRef(false);
  const generation = useRef(0);
  const version = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const busy = useRef(false);
  const copyRef = useRef(copy); copyRef.current = copy;
  const failureText = (cause: unknown, action = false) => cause instanceof ApiClientError && [401,403].includes(cause.status)
    ? copyRef.current.accessError : action ? copyRef.current.actionError : copyRef.current.loadError;

  const refresh = useCallback((): Promise<void> => {
    if (!mounted.current) return Promise.resolve();
    if (inFlight.current) return inFlight.current;
    const current = generation.current;
    const requestVersion = version.current;
    setRefreshing(true);
    const request = (async () => {
      try {
        const response = await notificationsApi.list();
        if (!mounted.current || current !== generation.current || requestVersion !== version.current || busy.current) return;
        const items = Array.isArray(response?.items) ? response.items : [];
        setSnapshot({ items, summary: {
          total_count: Math.max(0, Number(response?.summary?.total_count) || 0),
          unread_count: Math.max(0, Number(response?.summary?.unread_count) || 0),
        } });
        setError('');
      } catch (cause) {
        if (!mounted.current || current !== generation.current || requestVersion !== version.current || busy.current) return;
        if (cause instanceof ApiClientError && [401,403].includes(cause.status)) setSnapshot(empty);
        setError(failureText(cause));
      } finally {
        if (mounted.current && current === generation.current) { setLoading(false); setRefreshing(false); }
      }
    })();
    inFlight.current = request;
    void request.finally(() => { if (inFlight.current === request) inFlight.current = null; });
    return request;
  }, []);

  const mutate = async (key: string, operation: () => Promise<unknown>, apply: (state: Snapshot) => Snapshot): Promise<boolean> => {
    if (!mounted.current || busy.current) return false;
    busy.current = true; setPending(key); setActionError('');
    const current = generation.current;
    version.current++;
    try {
      await operation();
      if (!mounted.current || current !== generation.current) return false;
      version.current++;
      setSnapshot(apply); setError('');
      // An earlier list response cannot overwrite this acknowledgement.
      const earlier = inFlight.current;
      if (earlier) void earlier.then(() => { if (mounted.current && current === generation.current) void refresh(); });
      else void refresh();
      return true;
    } catch (cause) {
      if (mounted.current && current === generation.current) {
        version.current++;
        if (cause instanceof ApiClientError && [401,403].includes(cause.status)) setSnapshot(empty);
        setActionError(failureText(cause, true));
      }
      return false;
    } finally {
      if (current === generation.current) { busy.current = false; if (mounted.current) setPending(null); }
    }
  };
  const markRead = (id: number) => mutate(`read:${id}`, () => notificationsApi.markRead(id), state => {
    const unread = state.items.some(item => item.id === id && item.is_unread);
    return { items: state.items.map(item => item.id === id ? { ...item, is_unread: false } : item), summary: { ...state.summary, unread_count: Math.max(0, state.summary.unread_count - Number(unread)) } };
  });
  const markAllRead = () => mutate('all', () => notificationsApi.markAllRead(), state => ({ items: state.items.map(item => ({ ...item, is_unread: false })), summary: { ...state.summary, unread_count: 0 } }));
  const dismiss = (id: number) => mutate(`dismiss:${id}`, async () => {
    try { await notificationsApi.dismiss(id); }
    catch (cause) {
      // A lost DELETE acknowledgement can be retried after the owner already removed the row.
      if (!(cause instanceof ApiClientError) || cause.status !== 404) throw cause;
    }
  }, state => {
    const item = state.items.find(item => item.id === id);
    return { items: state.items.filter(item => item.id !== id), summary: { total_count: Math.max(0, state.summary.total_count - Number(Boolean(item))), unread_count: Math.max(0, state.summary.unread_count - Number(Boolean(item?.is_unread))) } };
  });

  useEffect(() => {
    mounted.current = true; generation.current++;
    const updateVisible = () => { if (!document.hidden) void refresh(); };
    void refresh();
    const interval = window.setInterval(updateVisible, 30_000);
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, updateVisible);
    window.addEventListener('focus', updateVisible);
    window.addEventListener('online', updateVisible);
    document.addEventListener('visibilitychange', updateVisible);
    return () => {
      mounted.current = false; generation.current++; inFlight.current = null;
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, updateVisible);
      window.removeEventListener('focus', updateVisible);
      window.removeEventListener('online', updateVisible);
      document.removeEventListener('visibilitychange', updateVisible);
    };
  }, [refresh]);
  return { ...snapshot, loading, refreshing, error, actionError, pending, refresh, markRead, markAllRead, dismiss };
}
