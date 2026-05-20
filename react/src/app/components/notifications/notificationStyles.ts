import type { AppNotification } from '../../api/notifications';

export const getNotificationStyle = (notification: AppNotification) => {
  switch (notification.source_subtype) {
    case 'urgent':
      return {
        emoji: '🚨',
        color: 'red',
        priority: 'high',
        type: 'alert',
      };
    case 'reminder':
      return {
        emoji: '⏰',
        color: 'blue',
        priority: 'medium',
        type: 'info',
      };
    case 'celebration':
      return {
        emoji: '🎉',
        color: 'gold',
        priority: 'low',
        type: 'info',
      };
    default:
      return {
        emoji: '📢',
        color: 'blue',
        priority: 'medium',
        type: 'info',
      };
  }
};

export const getModuleColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
    gold: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
    gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  };
  return colorMap[color] || colorMap.blue;
};
