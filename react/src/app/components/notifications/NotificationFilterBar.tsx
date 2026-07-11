import { Check, Filter, RefreshCw, Search } from 'lucide-react';
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
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={copy.searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-10 border-[#D8DCE3] pl-10 focus-visible:border-[#59C3A5] focus-visible:ring-[#59C3A5]/25"
          />
        </div>
        <Select value={moduleFilter} onValueChange={onModuleFilterChange}>
          <SelectTrigger className="h-10 border-[#D8DCE3] focus:ring-[#59C3A5]/25">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={copy.allModules} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.allModules}</SelectItem>
            {moduleOptions.map((module) => (
              <SelectItem key={module.slug} value={module.slug}>{module.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(value) => onPriorityFilterChange(value as NotificationPriorityFilter)}>
          <SelectTrigger className="h-10 border-[#D8DCE3] focus:ring-[#59C3A5]/25">
            <SelectValue placeholder={copy.allPriorities} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.allPriorities}</SelectItem>
            <SelectItem value="high">{copy.highPriority}</SelectItem>
            <SelectItem value="medium">{copy.mediumPriority}</SelectItem>
            <SelectItem value="low">{copy.lowPriority}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onRefresh} className="h-10 border-[#D8DCE3] hover:border-[#59C3A5]/50 hover:bg-[#E7F3F2]">
          <RefreshCw className="h-4 w-4" />
          {copy.refresh}
        </Button>
        <Button variant="outline" onClick={onMarkAllRead} disabled={unreadCount === 0} className="h-10 border-[#D8DCE3] hover:border-[#59C3A5]/50 hover:bg-[#E7F3F2]">
          <Check className="h-4 w-4" />
          {copy.markAllRead}
        </Button>
      </div>
      <Tabs value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as NotificationStatusFilter)}>
        <TabsList className="grid w-full grid-cols-3 bg-[#E7F3F2]">
          <TabsTrigger value="all" className="data-[state=active]:text-[#147514] data-[state=active]:shadow-sm">{copy.all} ({totalCount})</TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:text-[#147514] data-[state=active]:shadow-sm">{copy.unread} ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read" className="data-[state=active]:text-[#147514] data-[state=active]:shadow-sm">{copy.read} ({Math.max(totalCount - unreadCount, 0)})</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export type { NotificationPriorityFilter, NotificationStatusFilter };
