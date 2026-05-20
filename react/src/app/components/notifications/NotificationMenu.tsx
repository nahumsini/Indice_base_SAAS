import { Bell } from 'lucide-react';
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

interface NotificationMenuProps {
  open: boolean;
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  moduleLabel: string;
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
  moduleLabel,
  onOpenChange,
  onOpenAll,
  onOpenItem,
}: NotificationMenuProps) {
  const { currentLanguage, t } = useLanguage();
  const previewItems = items.slice(0, 3);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 h-9 w-9 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs bg-red-500 hover:bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] overflow-hidden p-0 sm:w-96">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-[#558DBD]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-white">{t.header.notifications}</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-white/20 text-white hover:bg-white/30 border-white/30">
                {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
          {loading && <p className="p-4 text-sm text-gray-500">Cargando notificaciones...</p>}
          {!loading && error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!loading && !error && previewItems.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No hay notificaciones.</p>
          )}
          {!loading && !error && previewItems.map((notification, index) => {
            const style = getNotificationStyle(notification);
            const colorClasses = getModuleColorClasses(style.color);
            return (
              <div key={notification.id}>
                <DropdownMenuItem
                  className="cursor-pointer p-4 hover:bg-gray-50 focus:bg-gray-50 dark:hover:bg-gray-700/50 dark:focus:bg-gray-700/50"
                  onSelect={() => onOpenItem(notification)}
                >
                  <div className="flex w-full min-w-0 gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center text-lg`}>
                      {style.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`min-w-0 break-words text-sm font-medium ${notification.is_unread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {notification.title}
                        </p>
                        {notification.is_unread && <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />}
                      </div>
                      <div className="mt-1.5 flex min-w-0 items-center gap-2">
                        <span className={`inline-flex max-w-full items-center truncate rounded border px-2 py-0.5 text-xs font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                          {moduleLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                        {formatNotificationTime(notification.created_at, currentLanguage.code)}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
                {index < previewItems.length - 1 && <DropdownMenuSeparator className="mx-0 my-0" />}
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onOpenAll}
            className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Ver todas las notificaciones
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
