import { useDeferredValue, useMemo, useState } from 'react';
import { Bell, BellOff, Inbox, Settings, X } from 'lucide-react';
import type { AppNotification, NotificationsSummary } from '../api/notifications';
import { useLanguage } from '../shared/context';
import { Button } from './ui/button';
import { NotificationFilterBar, type NotificationPriorityFilter, type NotificationStatusFilter } from './notifications/NotificationFilterBar';
import { NotificationItemCard } from './notifications/NotificationItemCard';
import { NotificationSettingsView } from './notifications/NotificationSettingsView';
import { NotificationSummaryStrip } from './notifications/NotificationSummaryStrip';
import {
  getNotificationModule,
  getNotificationPriority,
  getLocalizedNotificationPreferenceGroups,
  isActionableNotification,
} from './notifications/notificationCatalog';
import { getNotificationCenterCopy } from './notifications/notificationCenterCopy';

interface NotificationCenterProps {
  isOpen: boolean;
  items: AppNotification[];
  summary: NotificationsSummary;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRefresh: () => void;
  onOpenItem: (notification: AppNotification) => void;
  onMarkRead: (notificationId: number) => void;
  onMarkAllRead: () => void;
  onDismiss: (notificationId: number) => void;
}

type NotificationCenterView = 'inbox' | 'settings';

export function NotificationCenter(props: NotificationCenterProps) {
  const {
    isOpen,
    items,
    summary,
    loading,
    error,
    onClose,
    onRefresh,
    onOpenItem,
    onMarkRead,
    onMarkAllRead,
    onDismiss,
  } = props;
  const { currentLanguage } = useLanguage();
  const copy = getNotificationCenterCopy(currentLanguage.code);
  const [activeView, setActiveView] = useState<NotificationCenterView>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>('all');
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());
  const unreadCount = summary?.unread_count ?? 0;

  const moduleOptions = useMemo(() => {
    const options = new Map<string, ReturnType<typeof getNotificationModule>>();
    getLocalizedNotificationPreferenceGroups(currentLanguage.code)
      .forEach((group) => options.set(group.module.slug, group.module));
    items.forEach((item) => {
      const moduleMeta = getNotificationModule(item, currentLanguage.code);
      options.set(moduleMeta.slug, moduleMeta);
    });
    return Array.from(options.values()).sort((first, second) => first.label.localeCompare(second.label));
  }, [currentLanguage.code, items]);

  const visibleItems = useMemo(() => {
    return items.filter((notification) => {
      const moduleMeta = getNotificationModule(notification, currentLanguage.code);
      const priority = getNotificationPriority(notification);
      const searchableText = `${notification.title} ${notification.description} ${moduleMeta.label}`.toLowerCase();
      const matchesSearch = !deferredSearch || searchableText.includes(deferredSearch);
      const matchesModule = moduleFilter === 'all' || moduleMeta.slug === moduleFilter;
      const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'unread' && notification.is_unread)
        || (statusFilter === 'read' && !notification.is_unread);

      return matchesSearch && matchesModule && matchesPriority && matchesStatus;
    });
  }, [currentLanguage.code, deferredSearch, items, moduleFilter, priorityFilter, statusFilter]);

  const urgentCount = useMemo(
    () => items.filter((notification) => getNotificationPriority(notification) === 'high').length,
    [items],
  );
  const actionableCount = useMemo(
    () => items.filter(isActionableNotification).length,
    [items],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#59C3A5]/35 bg-white shadow-[0_28px_80px_rgba(34,40,49,0.24)] animate-in zoom-in-95 duration-200 dark:border-[#59C3A5]/30 dark:bg-[#222831]">
        <div className="border-b border-[#3AAE90] bg-[#59C3A5] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Bell className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold leading-tight">{copy.title}</h2>
                <p className="mt-1 text-sm text-white/80">{copy.subtitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-white hover:bg-white/20 focus-visible:ring-white/70" aria-label={copy.close}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setActiveView('inbox')}
              className={activeView === 'inbox' ? 'bg-white text-[#147514] hover:bg-white/90 focus-visible:ring-white/70' : 'bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/70'}
            >
              <Inbox className="h-4 w-4" />
              {copy.inbox}
            </Button>
            <Button
              type="button"
              onClick={() => setActiveView('settings')}
              className={activeView === 'settings' ? 'bg-white text-[#147514] hover:bg-white/90 focus-visible:ring-white/70' : 'bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/70'}
            >
              <Settings className="h-4 w-4" />
              {copy.settings}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F7F8FA] p-6 dark:bg-[#222831]">
          {activeView === 'inbox' ? (
            <div className="space-y-5">
              <NotificationSummaryStrip
                totalCount={items.length}
                unreadCount={unreadCount}
                urgentCount={urgentCount}
                actionableCount={actionableCount}
                copy={copy}
              />
              <div className="rounded-xl border border-[#59C3A5]/25 bg-white p-4 shadow-sm dark:border-[#59C3A5]/20 dark:bg-white/5">
                <NotificationFilterBar
                  searchQuery={searchQuery}
                  moduleFilter={moduleFilter}
                  priorityFilter={priorityFilter}
                  statusFilter={statusFilter}
                  unreadCount={unreadCount}
                  totalCount={items.length}
                  moduleOptions={moduleOptions}
                  copy={copy}
                  onSearchChange={setSearchQuery}
                  onModuleFilterChange={setModuleFilter}
                  onPriorityFilterChange={setPriorityFilter}
                  onStatusFilterChange={setStatusFilter}
                  onRefresh={onRefresh}
                  onMarkAllRead={onMarkAllRead}
                />
              </div>

              {loading && <p className="text-sm text-gray-500">{copy.loading}</p>}
              {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={onRefresh}>{copy.retry}</Button>
                  </div>
                </div>
              )}
              {!loading && !error && visibleItems.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#59C3A5]/40 bg-white py-14 text-center dark:bg-white/5">
                  <BellOff className="mx-auto mb-4 h-14 w-14 text-gray-300" />
                  <p className="text-lg font-bold text-gray-700">{copy.emptyTitle}</p>
                  <p className="mt-1 text-sm text-gray-500">{copy.emptyDescription}</p>
                </div>
              )}
              {!loading && !error && visibleItems.length > 0 && (
                <div className="space-y-3">
                  {visibleItems.map((notification) => (
                    <NotificationItemCard
                      key={notification.id}
                      notification={notification}
                      locale={currentLanguage.code}
                      copy={copy}
                      onOpen={onOpenItem}
                      onMarkRead={onMarkRead}
                      onDismiss={onDismiss}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NotificationSettingsView copy={copy} locale={currentLanguage.code} />
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#59C3A5]/25 bg-[#E7F3F2] px-6 py-4 text-[#222831] dark:bg-[#59C3A5]/10 dark:text-white sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-[#4B5563] dark:text-white/85">
            {activeView === 'inbox'
              ? `${copy.showing} ${visibleItems.length} ${copy.of} ${items.length}`
              : copy.preferencesNotice}
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="border-[#59C3A5]/35 bg-white text-[#147514] hover:bg-white/80 dark:border-[#59C3A5]/30 dark:bg-white/10 dark:text-[#8DE0C8] dark:hover:bg-white/15">
            {copy.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
