import { AlertTriangle, Bell, CheckCircle2, CircleDot } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppNotification } from '../../api/notifications';
import { useLanguage } from '../../shared/context';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatNotificationTime } from './notificationTime';
import { getModuleColorClasses, getNotificationStyle } from './notificationStyles';
import { getNotificationModule, getNotificationPriority, type NotificationPriority } from './notificationCatalog';
import { getNotificationCenterCopy } from './notificationCenterCopy';

interface NotificationMenuProps {
  open: boolean;
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onOpenAll: () => void;
  onOpenItem: (notification: AppNotification) => void;
}

export function NotificationMenu({
  open,
  items,
  unreadCount,
  loading,
  error,
  onOpenChange,
  onOpenAll,
  onOpenItem,
}: NotificationMenuProps) {
  const { currentLanguage } = useLanguage();
  const copy = getNotificationCenterCopy(currentLanguage.code);
  const previewItems = getPreviewItems(items);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-red-500 p-0 text-[10px] hover:bg-red-500 sm:h-5 sm:w-5 sm:text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] overflow-hidden p-0 sm:w-[26rem]">
        <div className="border-b border-blue-500 bg-[#2563EB] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">Indice</p>
              <h3 className="text-base font-bold text-white">{copy.previewTitle}</h3>
            </div>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="border-white/30 bg-white/20 text-xs text-white hover:bg-white/30">
                {unreadCount} {unreadCount === 1 ? copy.newSingular : copy.newPlural}
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto overflow-x-hidden">
          {loading && <p className="p-4 text-sm text-gray-500">{copy.loading}</p>}
          {!loading && error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!loading && !error && previewItems.length === 0 && (
            <p className="p-4 text-sm text-gray-500">{copy.previewEmpty}</p>
          )}
          {!loading && !error && previewItems.map((notification, index) => (
            <NotificationPreviewItem
              key={notification.id}
              notification={notification}
              locale={currentLanguage.code}
              onOpenItem={onOpenItem}
            >
              {index < previewItems.length - 1 && <DropdownMenuSeparator className="mx-0 my-0" />}
            </NotificationPreviewItem>
          ))}
        </div>
        <div className="border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <button
            onClick={onOpenAll}
            className="w-full text-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {copy.previewAll}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationPreviewItem({
  notification,
  locale,
  onOpenItem,
  children,
}: {
  notification: AppNotification;
  locale: string;
  onOpenItem: (notification: AppNotification) => void;
  children: ReactNode;
}) {
  const style = getNotificationStyle(notification);
  const colorClasses = getModuleColorClasses(style.color);
  const moduleMeta = getNotificationModule(notification);
  const priority = getNotificationPriority(notification);
  const Icon = priority === 'high' ? AlertTriangle : priority === 'low' ? CheckCircle2 : CircleDot;

  return (
    <div>
      <DropdownMenuItem
        className="cursor-pointer p-4 hover:bg-gray-50 focus:bg-gray-50 dark:hover:bg-gray-700/50 dark:focus:bg-gray-700/50"
        onSelect={() => onOpenItem(notification)}
      >
        <div className="flex w-full min-w-0 gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${colorClasses.bg} ${colorClasses.border}`}>
            <Icon className={`h-4 w-4 ${colorClasses.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className={`min-w-0 break-words text-sm font-bold ${notification.is_unread ? 'text-gray-950 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {notification.title}
              </p>
              {notification.is_unread && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
            </div>
            <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{notification.description}</p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <span className={`inline-flex max-w-full items-center truncate rounded border px-2 py-0.5 text-xs font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                {moduleMeta.shortLabel}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatNotificationTime(notification.created_at, locale)}
              </span>
            </div>
          </div>
        </div>
      </DropdownMenuItem>
      {children}
    </div>
  );
}

function getPreviewItems(items: AppNotification[]) {
  return [...items].sort((first, second) => {
    const firstScore = getNotificationScore(first);
    const secondScore = getNotificationScore(second);
    if (firstScore !== secondScore) {
      return secondScore - firstScore;
    }
    return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
  }).slice(0, 5);
}

function getNotificationScore(notification: AppNotification) {
  const priority = getNotificationPriority(notification);
  const priorityScore: Record<NotificationPriority, number> = { high: 3, medium: 2, low: 1 };
  return priorityScore[priority] + (notification.is_unread ? 3 : 0);
}
