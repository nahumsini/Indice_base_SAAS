import { Bell } from 'lucide-react';
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
import { getModuleColorClasses } from './notificationStyles';
import {
  getNotificationDisplayTitle,
  getNotificationModule,
  getNotificationPriority,
  type NotificationPriority,
} from './notificationCatalog';
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
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-10 w-10 rounded-full border text-[#4B5563] transition-all hover:border-[#59C3A5]/35 hover:bg-white/70 hover:text-[#222831] dark:text-gray-300 dark:hover:border-[#59C3A5]/45 dark:hover:bg-white/10 dark:hover:text-white ${open ? 'border-[#59C3A5]/50 bg-white/75 dark:bg-white/10' : 'border-transparent'}`}
          aria-label={copy.previewTitle}
          aria-expanded={open}
          title={copy.previewTitle}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-red-500 p-0 text-[10px] hover:bg-red-500 sm:h-5 sm:w-5 sm:text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#59C3A5]/35 bg-white p-0 shadow-[0_24px_60px_rgba(34,40,49,0.18)] dark:border-[#59C3A5]/30 dark:bg-[#222831] sm:w-[26rem]"
      >
        <div className="border-b border-[#3AAE90] bg-[#59C3A5] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">{copy.previewTitle}</h3>
            </div>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="border-white/30 bg-white/20 text-xs text-white hover:bg-white/30">
                {unreadCount} {unreadCount === 1 ? copy.newSingular : copy.newPlural}
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto overflow-x-hidden bg-white dark:bg-[#222831]">
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
        <div className="border-t border-[#59C3A5]/25 bg-[#E7F3F2] p-3 dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10">
          <button
            onClick={onOpenAll}
            className="w-full rounded-xl px-3 py-2 text-center text-sm font-semibold text-[#147514] transition-colors hover:bg-white/70 hover:text-[#0F5E1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] dark:text-[#8DE0C8] dark:hover:bg-white/10 dark:hover:text-white"
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
  const moduleMeta = getNotificationModule(notification, locale);
  const colorClasses = getModuleColorClasses(moduleMeta.color);
  const displayTitle = getNotificationDisplayTitle(notification, locale);

  return (
    <div>
      <DropdownMenuItem
        className="cursor-pointer p-4 hover:bg-[#E7F3F2]/65 focus:bg-[#E7F3F2]/65 dark:hover:bg-[#59C3A5]/10 dark:focus:bg-[#59C3A5]/10"
        onSelect={() => onOpenItem(notification)}
      >
        <div className="flex w-full min-w-0 gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl ${colorClasses.bg} ${colorClasses.border}`} aria-hidden="true">
            {moduleMeta.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className={`min-w-0 break-words text-sm font-bold ${notification.is_unread ? 'text-gray-950 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {displayTitle}
              </p>
              {notification.is_unread && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#3AAE90]" />}
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
