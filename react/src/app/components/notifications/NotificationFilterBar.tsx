import { Check, ChevronDown, ChevronUp, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import type { NotificationModuleMeta, NotificationPriority } from './notificationCatalog';

type NotificationStatusFilter = 'all' | 'unread' | 'read';
type NotificationPriorityFilter = 'all' | NotificationPriority;

interface NotificationFilterBarProps {
  searchQuery: string;
  moduleFilter: string;
  priorityFilter: NotificationPriorityFilter;
  statusFilter: NotificationStatusFilter;
  unreadCount: number;
  totalCount: number;
  moduleOptions: NotificationModuleMeta[];
  copy: Record<string, string>;
  onSearchChange: (value: string) => void;
  onModuleFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: NotificationPriorityFilter) => void;
  onStatusFilterChange: (value: NotificationStatusFilter) => void;
  onRefresh: () => void;
  onMarkAllRead: () => void;
}

export function NotificationFilterBar({
  searchQuery,
  moduleFilter,
  priorityFilter,
  statusFilter,
  unreadCount,
  totalCount,
  moduleOptions,
  copy,
  onSearchChange,
  onModuleFilterChange,
  onPriorityFilterChange,
  onStatusFilterChange,
  onRefresh,
  onMarkAllRead,
}: NotificationFilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeAdvancedCount = Number(moduleFilter !== 'all') + Number(priorityFilter !== 'all');

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            type="search"
            placeholder={copy.searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-[var(--indice-brand-action)] focus-visible:ring-[var(--indice-brand-action)]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label={copy.clearSearch}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)] dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            type="button"
            variant="outline"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((current) => !current)}
            className="h-11 rounded-xl border-slate-200 bg-white px-3 text-slate-700 shadow-none hover:border-[var(--indice-brand-border)] hover:bg-[var(--indice-brand-soft)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {copy.filters}
            {activeAdvancedCount > 0 ? (
              <span className="rounded-full bg-[var(--indice-brand-action)] px-1.5 py-0.5 text-[11px] leading-none text-[var(--indice-brand-shell-foreground)]">
                {activeAdvancedCount}
              </span>
            ) : null}
            {advancedOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            className="h-11 rounded-xl border-slate-200 bg-white px-3 text-slate-700 shadow-none hover:border-[var(--indice-brand-border)] hover:bg-[var(--indice-brand-soft)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{copy.refresh}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="col-span-2 h-11 rounded-xl border-slate-200 bg-white px-3 text-slate-700 shadow-none hover:border-[var(--indice-brand-border)] hover:bg-[var(--indice-brand-soft)] disabled:opacity-45 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:col-auto"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {copy.markAllRead}
          </Button>
        </div>
      </div>

      {advancedOpen ? (
        <div className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end dark:border-slate-700">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{copy.module}</span>
            <Select value={moduleFilter} onValueChange={onModuleFilterChange}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white px-3 text-slate-800 focus:ring-[var(--indice-brand-action)]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <SelectValue placeholder={copy.allModules} />
              </SelectTrigger>
              <SelectContent className="z-[220]">
                <SelectItem value="all">{copy.allModules}</SelectItem>
                {moduleOptions.map((module) => (
                  <SelectItem key={module.slug} value={module.slug}>{module.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{copy.priority}</span>
            <Select value={priorityFilter} onValueChange={(value) => onPriorityFilterChange(value as NotificationPriorityFilter)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white px-3 text-slate-800 focus:ring-[var(--indice-brand-action)]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <SelectValue placeholder={copy.allPriorities} />
              </SelectTrigger>
              <SelectContent className="z-[220]">
                <SelectItem value="all">{copy.allPriorities}</SelectItem>
                <SelectItem value="high">{copy.highPriority}</SelectItem>
                <SelectItem value="medium">{copy.mediumPriority}</SelectItem>
                <SelectItem value="low">{copy.lowPriority}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {activeAdvancedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onModuleFilterChange('all');
                onPriorityFilterChange('all');
              }}
              className="h-10 rounded-xl px-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copy.clearFilters}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Tabs value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as NotificationStatusFilter)}>
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl bg-[var(--indice-brand-soft)] p-1 dark:bg-[var(--indice-brand-primary)]/15">
          <TabsTrigger value="all" className="rounded-lg text-slate-600 data-[state=active]:text-[var(--indice-brand-text)] data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:text-white">{copy.all} ({totalCount})</TabsTrigger>
          <TabsTrigger value="unread" className="rounded-lg text-slate-600 data-[state=active]:text-[var(--indice-brand-text)] data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:text-white">{copy.unread} ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read" className="rounded-lg text-slate-600 data-[state=active]:text-[var(--indice-brand-text)] data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:text-white">{copy.read} ({Math.max(totalCount - unreadCount, 0)})</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export type { NotificationPriorityFilter, NotificationStatusFilter };
