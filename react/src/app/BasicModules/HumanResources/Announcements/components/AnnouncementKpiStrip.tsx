import { Eye, Info, Megaphone, MousePointer2, PencilLine, Send, Timer } from 'lucide-react';
import { OperationalKpiArea } from '../../../shared/operational';
import type { AnnouncementKpiCopy, AnnouncementsTranslations } from '../translations';

interface AnnouncementKpiStripProps {
  copy: AnnouncementKpiCopy;
  draftCount: number;
  progressCopy: AnnouncementsTranslations['progress'];
  publishedCount: number;
  readRate: string;
  scheduledCount: number;
  selectedCount?: number;
  showSelectionMetrics?: boolean;
  totalCount: number;
  visibleCount: number;
}

export function AnnouncementKpiStrip(props: AnnouncementKpiStripProps) {
  const { copy, draftCount, progressCopy, publishedCount, readRate, scheduledCount, selectedCount = 0, showSelectionMetrics = false, totalCount, visibleCount } = props;
  const actionRate = totalCount > 0 ? `${Math.round((publishedCount / totalCount) * 100)}%` : '0%';

  return (
    <OperationalKpiArea
      className="mb-6"
      metrics={[
        { id: 'total', icon: <Megaphone className="h-4 w-4" />, value: totalCount, label: copy.totalAnnouncements },
        { id: 'published', icon: <Send className="h-4 w-4" />, value: publishedCount, label: copy.published, valueClassName: 'text-emerald-600 dark:text-emerald-400' },
        { id: 'scheduled', icon: <Timer className="h-4 w-4" />, value: scheduledCount, label: copy.scheduled, valueClassName: 'text-sky-600 dark:text-sky-300' },
        { id: 'drafts', icon: <PencilLine className="h-4 w-4" />, value: draftCount, label: copy.drafts, valueClassName: 'text-amber-600 dark:text-amber-300' },
        { id: 'visible', icon: <Eye className="h-4 w-4" />, value: visibleCount, label: copy.visibleAfterFilters },
        ...(showSelectionMetrics ? [{ id: 'selected', icon: <MousePointer2 className="h-4 w-4" />, value: selectedCount, label: copy.selected, valueClassName: 'text-blue-600 dark:text-blue-300' }] : []),
      ]}
      alertChips={[
        ...(showSelectionMetrics && selectedCount > 0 ? [{ id: 'selected', label: copy.selectedBadge(selectedCount), tone: 'info' as const }] : []),
        { id: 'rate', label: copy.publishedRate(actionRate), tone: 'success' },
      ]}
      distributionSegments={[
        { id: 'published', label: progressCopy.published, count: publishedCount, className: 'bg-emerald-500' },
        { id: 'scheduled', label: progressCopy.scheduled, count: scheduledCount, className: 'bg-sky-500' },
        { id: 'drafts', label: progressCopy.draft, count: draftCount, className: 'bg-amber-500' },
      ]}
      insight={copy.summary(publishedCount, scheduledCount, draftCount, readRate, visibleCount, totalCount)}
      insightIcon={<Info className="h-4 w-4" />}
    />
  );
}
