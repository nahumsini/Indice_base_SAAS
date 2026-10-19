import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface AppNotification {
  id: number;
  source_type: 'announcement' | 'task' | 'project' | 'process' | string;
  source_id: number | null;
  title: string;
  description: string;
  module_slug: string;
  source_subtype: 'general' | 'urgent' | 'reminder' | 'celebration' | string;
  status: string;
  is_unread: boolean;
  read_at?: string | null;
  created_at?: string | null;
  action_url?: string | null;
}

export interface NotificationsSummary {
  total_count: number;
  unread_count: number;
}

export interface NotificationsResponse {
  items: AppNotification[];
  summary: NotificationsSummary;
}

export interface NotificationPreference {
  module: string;
  eventType: string;
  enabled: boolean;
}
export interface NotificationPreferences {
  version: number;
  quietMode: boolean;
  items: NotificationPreference[];
}
export interface NotificationPreferenceChange {
  version: number;
  quietMode?: boolean;
  items?: NotificationPreference[];
}

export const notificationsApi = {
  preferences() {
    return apiClient<NotificationPreferences>(`${endpoints.notifications.list}/preferences`);
  },
  savePreferences(change: NotificationPreferenceChange) {
    return apiClient<NotificationPreferences>(`${endpoints.notifications.list}/preferences`, {
      method: 'PUT', body: JSON.stringify(change),
    });
  },
  list() {
    return apiClient<NotificationsResponse>(endpoints.notifications.list);
  },

  markRead(notificationId: string | number) {
    return apiClient<AppNotification>(`${endpoints.notifications.list}/${notificationId}/read`, {
      method: 'POST',
    });
  },

  markAllRead() {
    return apiClient<{ updated_count: number }>(endpoints.notifications.readAll, {
      method: 'POST',
    });
  },

  dismiss(notificationId: string | number) {
    return apiClient<{ success: boolean }>(`${endpoints.notifications.list}/${notificationId}`, {
      method: 'DELETE',
    });
  },
};
