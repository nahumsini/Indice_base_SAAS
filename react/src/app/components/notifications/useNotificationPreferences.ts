import { useEffect, useRef, useState } from 'react';
import { notificationsApi, type NotificationPreferences, type NotificationPreferenceChange } from '../../api/notifications';
import { dispatchNotificationsRefresh } from '../../api/notificationEvents';
import { ApiClientError } from '../../lib/apiClient';

export function useNotificationPreferences() {
  const [confirmed, setConfirmed] = useState<NotificationPreferences | null>(null);
  const [pending, setPending] = useState<NotificationPreferenceChange | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'loadError' | 'saveError' | 'conflict'>('loading');
  const generation = useRef(0);
  const busy = useRef(false);

  const load = async () => {
    const request = ++generation.current;
    busy.current = true;
    setStatus('loading');
    try {
      const response = await notificationsApi.preferences();
      if (request !== generation.current) return;
      setConfirmed(response); setPending(null); setStatus('ready');
    } catch {
      if (request === generation.current) setStatus('loadError');
    } finally {
      if (request === generation.current) busy.current = false;
    }
  };
  useEffect(() => {
    void load();
    return () => { generation.current++; busy.current = false; };
  }, []);

  const save = async (change: NotificationPreferenceChange) => {
    if (busy.current) return;
    busy.current = true;
    const request = ++generation.current;
    setPending(change); setStatus('saving');
    try {
      const response = await notificationsApi.savePreferences(change);
      if (request !== generation.current) return;
      setConfirmed(response); setPending(null); setStatus('saved');
      dispatchNotificationsRefresh();
    } catch (error) {
      if (request === generation.current) setStatus(error instanceof ApiClientError && error.status === 409 ? 'conflict' : 'saveError');
    } finally {
      if (request === generation.current) busy.current = false;
    }
  };
  const change = (patch: Omit<NotificationPreferenceChange, 'version'>) => {
    if (confirmed && !pending && !busy.current) void save({ ...patch, version: confirmed.version });
  };
  const enabled = Object.fromEntries(confirmed?.items.map(item => [`${item.module}:${item.eventType}`, item.enabled]) ?? []);
  pending?.items?.forEach(item => { enabled[`${item.module}:${item.eventType}`] = item.enabled; });
  return {
    confirmed, enabled, quietMode: pending?.quietMode ?? confirmed?.quietMode ?? false,
    status, disabled: !confirmed || Boolean(pending) || status === 'loading' || status === 'loadError',
    change, reload: load, retry: () => pending ? void save(pending) : void load(),
  };
}
