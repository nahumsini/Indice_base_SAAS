import { type ReactNode } from 'react';
import { Eye, Info, Megaphone, MousePointer2, PencilLine, Send, Timer } from 'lucide-react';
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

const getSegmentWidth = (count: number, total: number) => {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
};

export function AnnouncementKpiStrip({
  copy,
  draftCount,
  progressCopy,
  publishedCount,
  readRate,
  scheduledCount,
  selectedCount = 0,
  showSelectionMetrics = false,
  totalCount,
  visibleCount,
}: AnnouncementKpiStripProps) {
  const actionRate = totalCount > 0 ? `${Math.round((publishedCount / totalCount) * 100)}%` : '0%';

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <AnnouncementKpiMetric icon={<Megaphone className="h-4 w-4" />} value={totalCount} label={copy.totalAnnouncements} />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <AnnouncementKpiMetric
            icon={<Send className="h-4 w-4" />}
            value={publishedCount}
            label={copy.published}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <AnnouncementKpiMetric
            icon={<Timer className="h-4 w-4" />}
            value={scheduledCount}
            label={copy.scheduled}
            valueClassName="text-sky-600 dark:text-sky-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <AnnouncementKpiMetric
            icon={<PencilLine className="h-4 w-4" />}
            value={draftCount}
            label={copy.drafts}
            valueClassName="text-amber-600 dark:text-amber-300"
          />
          <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
          <AnnouncementKpiMetric
            icon={<Eye className="h-4 w-4" />}
            value={visibleCount}
            label={copy.visibleAfterFilters}
            valueClassName="text-[#59C3A5] dark:text-blue-300"
          />
          {showSelectionMetrics ? (
            <>
              <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
              <AnnouncementKpiMetric
                icon={<MousePointer2 className="h-4 w-4" />}
                value={selectedCount}
                label={copy.selected}
                valueClassName="text-blue-600 dark:text-blue-300"
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showSelectionMetrics && selectedCount > 0 ? (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              {copy.selectedBadge(selectedCount)}
            </span>
          ) : null}
          <span className="rounded-full border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-3 py-1 text-xs font-semibold text-[#177d66] dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/15 dark:text-[#8DE1CB]">
            {copy.publishedRate(actionRate)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="flex h-full">
            <div className="bg-emerald-500 transition-all duration-300" style={{ width: getSegmentWidth(publishedCount, totalCount) }} />
            <div className="bg-sky-500 transition-all duration-300" style={{ width: getSegmentWidth(scheduledCount, totalCount) }} />
            <div className="bg-amber-500 transition-all duration-300" style={{ width: getSegmentWidth(draftCount, totalCount) }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <LegendItem color="bg-emerald-500" label={progressCopy.published} />
          <LegendItem color="bg-sky-500" label={progressCopy.scheduled} />
          <LegendItem color="bg-amber-500" label={progressCopy.draft} />
        </div>
      </div>

      <div className="rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-4 py-3 dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/15">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#59C3A5] dark:text-blue-300" />
          <p className="text-sm leading-relaxed text-[#59C3A5] dark:text-blue-200">
            {copy.summary(publishedCount, scheduledCount, draftCount, readRate, visibleCount, totalCount)}
          </p>
        </div>
      </div>
    </div>
  );
}

function AnnouncementKpiMetric({
  icon,
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-fit items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {icon}
      </span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
      <span>{label}</span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
