import { useEffect, useState } from 'react';
import {
  notificationsApi,
  type AppNotification,
  type NotificationsSummary,
} from '../../api/notifications';
import { NOTIFICATIONS_REFRESH_EVENT } from '../../api/notificationEvents';

const emptySummary: NotificationsSummary = {
  total_count: 0,
  unread_count: 0,
};

function normalizeSummary(summary?: Partial<NotificationsSummary> | null): NotificationsSummary {
  return {
    total_count: Number(summary?.total_count) || 0,
    unread_count: Number(summary?.unread_count) || 0,
  };
}

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [summary, setSummary] = useState<NotificationsSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await notificationsApi.list();
      setItems(Array.isArray(response?.items) ? response.items : []);
      setSummary(normalizeSummary(response?.summary));
    } catch (loadError) {
      setItems([]);
      setSummary(emptySummary);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (notificationId: number) => {
    const updated = await notificationsApi.markRead(notificationId);
    await refresh();
    return updated;
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    await refresh();
  };

  const dismiss = async (notificationId: number) => {
    await notificationsApi.dismiss(notificationId);
    await refresh();
  };

  useEffect(() => {
    const handleRefresh = () => void refresh();
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    };
  }, []);

  return {
    items,
    summary,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    dismiss,
  };
}
