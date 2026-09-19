import { useDeferredValue, useMemo, useState } from 'react';
import { Bell, BellOff, Inbox, Settings } from 'lucide-react';
import type { AppNotification, NotificationsSummary } from '../api/notifications';
import { useLanguage } from '../shared/context';
import { IndiceModalFrame } from './indice-modal';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
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
type NotificationDateGroup = 'today' | 'yesterday' | 'earlier';

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

  const groupedVisibleItems = useMemo(() => {
    const buckets: Record<NotificationDateGroup, AppNotification[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    visibleItems.forEach((notification) => {
      buckets[getNotificationDateGroup(notification.created_at)].push(notification);
    });
    return [
      { key: 'today', label: copy.today, items: buckets.today },
      { key: 'yesterday', label: copy.yesterday, items: buckets.yesterday },
      { key: 'earlier', label: copy.earlier, items: buckets.earlier },
    ].filter((group) => group.items.length > 0);
  }, [copy.earlier, copy.today, copy.yesterday, visibleItems]);

  const urgentCount = useMemo(
    () => items.filter((notification) => getNotificationPriority(notification) === 'high').length,
    [items],
  );
  const actionableCount = useMemo(
    () => items.filter(isActionableNotification).length,
    [items],
  );

  const showUrgentNotifications = () => {
    setActiveView('inbox');
    setSearchQuery('');
    setModuleFilter('all');
    setStatusFilter('all');
    setPriorityFilter('high');
  };

  if (!isOpen) return null;

  return (
    <IndiceModalFrame
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modalType="operational-workspace"
      contentClassName="sm:max-w-5xl"
      bodyClassName="bg-slate-50/95 px-0 py-0 dark:bg-slate-950"
      tone="blue"
      icon={<Bell className="h-5 w-5" />}
      eyebrow={unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? copy.newSingular : copy.newPlural}` : copy.inbox}
      title={copy.title}
      description={copy.subtitle}
      footerSummary={activeView === 'inbox'
        ? `${copy.showing} ${visibleItems.length} ${copy.of} ${items.length} · ${unreadCount} ${copy.unread.toLowerCase()}`
        : copy.preferencesNotice}
      footer={(
        <Button type="button" variant="outline" onClick={onClose}>{copy.close}</Button>
      )}
    >
      <div className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 px-5 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-auto" role="tablist" aria-label={copy.title}>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'inbox'}
              onClick={() => setActiveView('inbox')}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition sm:flex-none ${activeView === 'inbox' ? 'bg-white text-[var(--indice-brand-text)] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`}
            >
              <Inbox className="h-4 w-4" aria-hidden="true" />
              {copy.inbox}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'settings'}
              onClick={() => setActiveView('settings')}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition sm:flex-none ${activeView === 'settings' ? 'bg-white text-[var(--indice-brand-text)] shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              {copy.settings}
            </button>
          </div>
          {activeView === 'inbox' && unreadCount > 0 ? (
            <span className="hidden items-center justify-center rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-3 py-1 text-xs font-medium text-[var(--indice-brand-text)] dark:border-[var(--indice-brand-primary)]/35 dark:bg-[var(--indice-brand-primary)]/15 dark:text-[var(--indice-brand-text-dark)] sm:inline-flex">
              <span className="mr-2 h-2 w-2 rounded-full bg-[var(--indice-brand-action)]" aria-hidden="true" />
              {unreadCount} {unreadCount === 1 ? copy.newSingular : copy.newPlural}
            </span>
          ) : null}
        </div>
      </div>

      {activeView === 'inbox' ? (
        <div className="mx-auto max-w-5xl px-5 py-5">
          <NotificationSummaryStrip
            totalCount={items.length}
            unreadCount={unreadCount}
            urgentCount={urgentCount}
            actionableCount={actionableCount}
            onShowUrgent={showUrgentNotifications}
            copy={copy}
          />

          <div className="sticky top-[65px] z-20 -mx-1 mt-4 bg-slate-50/95 px-1 py-2 backdrop-blur-md dark:bg-slate-950/95">
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

          {loading ? <NotificationLoadingSkeleton /> : null}
          {!loading && error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={onRefresh}>{copy.retry}</Button>
              </div>
            </div>
          ) : null}
          {!loading && !error && visibleItems.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--indice-brand-border)] bg-white py-14 text-center dark:border-[var(--indice-brand-primary)]/35 dark:bg-slate-900">
              <BellOff className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="text-base font-semibold text-slate-800 dark:text-white">{copy.emptyTitle}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.emptyDescription}</p>
            </div>
          ) : null}
          {!loading && !error && groupedVisibleItems.length > 0 ? (
            <div className="mt-4 space-y-5">
              {groupedVisibleItems.map((group) => (
                <section key={group.key} aria-labelledby={`notification-group-${group.key}`}>
                  <div className="mb-2.5 flex items-center gap-3">
                    <h3 id={`notification-group-${group.key}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {group.label}
                    </h3>
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {group.items.length}
                    </span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
                  </div>
                  <div className="space-y-2.5">
                    {group.items.map((notification) => (
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
                </section>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto max-w-5xl px-5 py-5">
          <NotificationSettingsView copy={copy} locale={currentLanguage.code} />
        </div>
      )}
    </IndiceModalFrame>
  );
}

function getNotificationDateGroup(value?: string | null): NotificationDateGroup {
  if (!value) return 'earlier';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'earlier';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (timestamp >= today.getTime()) return 'today';
  if (timestamp >= yesterday.getTime()) return 'yesterday';
  return 'earlier';
}

function NotificationLoadingSkeleton() {
  return (
    <div className="mt-4 space-y-2.5" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
