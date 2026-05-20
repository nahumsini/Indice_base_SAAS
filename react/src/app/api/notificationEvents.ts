export const NOTIFICATIONS_REFRESH_EVENT = 'indice:notifications-refresh';

export const dispatchNotificationsRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
  }
};
