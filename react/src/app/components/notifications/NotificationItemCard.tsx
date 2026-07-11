import { Check, Trash2 } from 'lucide-react';
import type { AppNotification } from '../../api/notifications';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatNotificationTime } from './notificationTime';
import { getModuleColorClasses } from './notificationStyles';
import { getNotificationDisplayTitle, getNotificationModule, getNotificationPriority, type NotificationPriority } from './notificationCatalog';
import type { NotificationCenterCopy } from './notificationCenterCopy';

interface NotificationItemCardProps {
  notification: AppNotification;
  locale: string;
  copy: NotificationCenterCopy;
  onOpen: (notification: AppNotification) => void;
  onMarkRead: (notificationId: number) => void;
  onDismiss: (notificationId: number) => void;
}

const priorityTone: Record<NotificationPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function NotificationItemCard({
  notification,
  locale,
  copy,
  onOpen,
  onMarkRead,
  onDismiss,
}: NotificationItemCardProps) {
  const moduleMeta = getNotificationModule(notification, locale);
  const colorClasses = getModuleColorClasses(moduleMeta.color);
  const priority = getNotificationPriority(notification);
  const priorityLabel = getPriorityLabel(priority, copy);
  const displayTitle = getNotificationDisplayTitle(notification, locale);

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#59C3A5]/60 hover:shadow-md ${
        notification.is_unread
          ? 'border-[#59C3A5]/40 bg-[#E7F3F2]/55'
          : 'border-gray-200 bg-white'
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
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${colorClasses.bg} ${colorClasses.border}`} aria-hidden="true">
          {moduleMeta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className={`min-w-0 break-words font-bold ${notification.is_unread ? 'text-gray-950' : 'text-gray-700'}`}>
                  {displayTitle}
                </h3>
                {notification.is_unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#3AAE90]" />}
              </div>
              <p className="mt-1 line-clamp-2 break-words text-sm text-gray-600">
                {notification.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge variant="outline" className={priorityTone[priority]}>{priorityLabel}</Badge>
              <Badge variant="outline" className={`${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                {moduleMeta.label}
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-gray-500">
              {formatNotificationTime(notification.created_at, locale)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(notification);
                }}
                className="h-8 text-xs"
              >
                {copy.open}
              </Button>
              {notification.is_unread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                  className="h-8 text-xs text-[#147514] hover:bg-[#E7F3F2]"
                >
                  <Check className="h-3.5 w-3.5" />
                  {copy.markRead}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismiss(notification.id);
                }}
                className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label={copy.dismiss}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPriorityLabel(priority: NotificationPriority, copy: NotificationCenterCopy) {
  if (priority === 'high') {
    return copy.highPriority;
  }
  if (priority === 'medium') {
    return copy.mediumPriority;
  }
  return copy.lowPriority;
}
