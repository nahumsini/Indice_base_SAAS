import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { AppNotification } from '../../api/notifications';
import { useLanguage } from '../../shared/context';
import { NotificationCenter } from '../NotificationCenter';
import { NotificationMenu } from './NotificationMenu';
import { useNotifications } from './useNotifications';
import { notificationDestination } from './notificationDestination';
import { notificationFlowCopy } from './notificationFlowCopy';

type Action = { kind: 'open'; notification: AppNotification } | { kind: 'read' | 'dismiss'; id: number } | { kind: 'all' };
export function NotificationLauncher({ scopeKey }: { scopeKey: string | null }) {
  return scopeKey ? <Launcher key={scopeKey} /> : null;
}
function Launcher() {
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage.code;
  const flow = notificationFlowCopy(locale);
  const notifications = useNotifications(locale);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [unavailable, setUnavailable] = useState<AppNotification | null>(null);
  const lastAction = useRef<Action | null>(null);
  const active = useRef(true);
  // Navigation continuations must not follow a response from the previous account/company.
  const lifetime = useRef(0);
  // useNotifications guards its own state; this guard also protects the router.
  useEffect(() => { active.current = true; lifetime.current++; return () => { active.current = false; lifetime.current++; }; }, []);
  const showCenter = () => { setMenuOpen(false); setCenterOpen(true); void notifications.refresh(); };
  const perform = async (action: Action) => {
    if (notifications.pending) return;
    lastAction.current = action;
    const generation = lifetime.current;
    if (action.kind === 'open') {
      const target = notificationDestination(action.notification.action_url, window.location.origin);
      if (!target) { setUnavailable(action.notification); showCenter(); return; }
      if (action.notification.is_unread && !await notifications.markRead(action.notification.id)) return;
      if (!active.current || generation !== lifetime.current) return;
      setMenuOpen(false); setCenterOpen(false); setUnavailable(null); lastAction.current = null;
      navigate(target);
      return;
    }
    const succeeded = action.kind === 'all' ? await notifications.markAllRead()
      : action.kind === 'read' ? await notifications.markRead(action.id) : await notifications.dismiss(action.id);
    if (succeeded && active.current && generation === lifetime.current) { lastAction.current = null; setUnavailable(null); }
  };
  const retry = () => { if (lastAction.current) void perform(lastAction.current); };
  return <>
    <NotificationMenu open={menuOpen} items={notifications.items} unreadCount={notifications.summary.unread_count}
      loading={notifications.loading} refreshing={notifications.refreshing} error={notifications.error}
      actionError={notifications.actionError} busy={Boolean(notifications.pending)}
      onRefresh={() => void notifications.refresh()} onRetryAction={retry}
      onOpenChange={open => { setMenuOpen(open); if (open) void notifications.refresh(); }}
      onOpenAll={showCenter} onOpenItem={notification => void perform({ kind: 'open', notification })} />
    <NotificationCenter isOpen={centerOpen} items={notifications.items} summary={notifications.summary}
      loading={notifications.loading} refreshing={notifications.refreshing} error={notifications.error}
      actionError={notifications.actionError} busy={Boolean(notifications.pending)} onRetryAction={retry}
      notice={unavailable ? { title: unavailable.title, description: unavailable.description, message: flow.unavailable } : null}
      onClose={() => setCenterOpen(false)} onRefresh={() => void notifications.refresh()}
      onOpenItem={notification => void perform({ kind: 'open', notification })}
      onMarkRead={id => void perform({ kind: 'read', id })} onMarkAllRead={() => void perform({ kind: 'all' })}
      onDismiss={id => void perform({ kind: 'dismiss', id })} />
  </>;
}
