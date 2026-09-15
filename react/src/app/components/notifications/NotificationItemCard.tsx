import { ArrowUpRight, Check, MoreHorizontal, Trash2 } from 'lucide-react';
import type { AppNotification } from '../../api/notifications';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200',
  medium: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200',
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
    <article
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--indice-brand-border)] hover:shadow-md focus-within:border-[var(--indice-brand-border)] dark:bg-slate-900 ${
        notification.is_unread
          ? 'border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)]/35 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-[var(--indice-brand-action)] dark:bg-[var(--indice-brand-primary)]/10'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notification)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(notification);
        }
      }}
    >
      <div className="flex gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl shadow-sm ${colorClasses.bg} ${colorClasses.border}`} aria-hidden="true">
          {moduleMeta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className={`min-w-0 break-words text-[15px] font-semibold leading-5 ${notification.is_unread ? 'text-slate-950 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {displayTitle}
                </h3>
                {notification.is_unread ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--indice-brand-action)] shadow-[0_0_0_3px_var(--indice-brand-soft)]" aria-label={copy.unread} />
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-slate-600 dark:text-slate-400">
                {notification.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityTone[priority]}`}>{priorityLabel}</Badge>
              <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                {moduleMeta.label}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatNotificationTime(notification.created_at, locale)}
            </span>
            <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(notification);
                }}
                className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--indice-brand-text)] hover:bg-[var(--indice-brand-soft)] dark:text-[var(--indice-brand-text-dark)] dark:hover:bg-[var(--indice-brand-primary)]/15"
              >
                {copy.open}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              {notification.is_unread ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                  className="h-8 rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.markRead}
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(event) => event.stopPropagation()}
                    className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label={copy.moreActions}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[230] min-w-40 rounded-xl p-1.5">
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDismiss(notification.id)}
                    className="cursor-pointer rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {copy.dismiss}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function getPriorityLabel(priority: NotificationPriority, copy: NotificationCenterCopy) {
  if (priority === 'high') return copy.highPriority;
  if (priority === 'medium') return copy.mediumPriority;
  return copy.lowPriority;
}
