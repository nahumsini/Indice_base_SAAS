import { Check, Trash2 } from 'lucide-react';
import type { AppNotification } from '../../api/notifications';
import { Button } from '../ui/button';
import { formatNotificationTime } from './notificationTime';
import { getModuleColorClasses, getNotificationStyle } from './notificationStyles';

interface NotificationItemCardProps {
  notification: AppNotification;
  moduleLabel: string;
  locale: string;
  onOpen: (notification: AppNotification) => void;
  onMarkRead: (notificationId: number) => void;
  onDismiss: (notificationId: number) => void;
}

export function NotificationItemCard({
  notification,
  moduleLabel,
  locale,
  onOpen,
  onMarkRead,
  onDismiss,
}: NotificationItemCardProps) {
  const style = getNotificationStyle(notification);
  const colorClasses = getModuleColorClasses(style.color);

  return (
    <div
      className={`group relative rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md hover:border-[#2563EB] ${
        notification.is_unread
          ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
          : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notification)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(notification);
        }
      }}
    >
      <div className="flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center text-xl`}>
          {style.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold break-words ${notification.is_unread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {notification.title}
                </h3>
                {notification.is_unread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 break-words line-clamp-2">
                {notification.description}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`inline-flex max-w-full items-center truncate rounded border px-2 py-0.5 text-xs font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                {moduleLabel}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatNotificationTime(notification.created_at, locale)}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {notification.is_unread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                  className="h-8 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar leída
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismiss(notification.id);
                }}
                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
