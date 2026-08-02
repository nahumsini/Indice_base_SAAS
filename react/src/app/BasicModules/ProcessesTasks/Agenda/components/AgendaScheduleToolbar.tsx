import { ArrowUp } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import type { AgendaScheduleViewMode } from '../types';
import type { AgendaTranslations } from '../translations';

type AgendaScheduleToolbarProps = {
  onMoveWindow: (direction: -1 | 1) => void;
  onScheduleViewModeChange: (mode: AgendaScheduleViewMode) => void;
  onSelectedScheduleDateChange: (dateKey: string) => void;
  scheduleCopy: AgendaTranslations['schedule'];
  scheduleViewMode: AgendaScheduleViewMode;
  selectedScheduleDate: string;
  todayAgendaValue: string;
  visibleCount: number;
  visibleScheduledCount: number;
  weekRangeLabel: string;
};

export function AgendaScheduleToolbar({
  onMoveWindow,
  onScheduleViewModeChange,
  onSelectedScheduleDateChange,
  scheduleCopy,
  scheduleViewMode,
  selectedScheduleDate,
  todayAgendaValue,
  visibleCount,
  visibleScheduledCount,
  weekRangeLabel,
}: AgendaScheduleToolbarProps) {
  return (
    <div className="rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 p-5 shadow-sm dark:border-[#F4C84A]/40 dark:bg-[#F4C84A]/15">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-xl font-medium text-slate-950 dark:text-white">
            {scheduleViewMode === 'day'
              ? scheduleCopy.dayTitle
              : scheduleViewMode === 'week'
                ? scheduleCopy.weekTitle
                : scheduleCopy.listTitle}
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            {scheduleViewMode === 'day' ? scheduleCopy.daySubtitle : scheduleCopy.weekSubtitle}
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {([
              { value: 'day', label: scheduleCopy.viewDay },
              { value: 'week', label: scheduleCopy.viewWeek },
              { value: 'list', label: scheduleCopy.viewList },
            ] as Array<{ value: AgendaScheduleViewMode; label: string }>).map((viewOption) => (
              <button
                key={viewOption.value}
                type="button"
                className={cn(
                  'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                  scheduleViewMode === viewOption.value
                    ? 'bg-[#F4C84A] text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white',
                )}
                onClick={() => onScheduleViewModeChange(viewOption.value)}
              >
                {viewOption.label}
              </button>
            ))}
          </div>
          <Input
            type="date"
            value={selectedScheduleDate}
            onChange={(event) => onSelectedScheduleDateChange(event.target.value || todayAgendaValue)}
            className="h-10 w-[168px] shrink-0 rounded-lg border-slate-200 bg-white font-medium shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-700 dark:bg-slate-800"
          />
          <Button
            variant="outline"
            className="h-10 rounded-lg border-slate-200 bg-white px-3 font-medium shadow-none dark:border-slate-700 dark:bg-slate-800"
            onClick={() => onMoveWindow(-1)}
          >
            <ArrowUp className="h-4 w-4 -rotate-90" />
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-lg border-slate-200 bg-white px-4 font-medium shadow-none dark:border-slate-700 dark:bg-slate-800"
            onClick={() => onSelectedScheduleDateChange(todayAgendaValue)}
          >
            {scheduleCopy.today}
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-lg border-slate-200 bg-white px-3 font-medium shadow-none dark:border-slate-700 dark:bg-slate-800"
            onClick={() => onMoveWindow(1)}
          >
            <ArrowUp className="h-4 w-4 rotate-90" />
          </Button>
          <Badge
            variant="outline"
            className="rounded-full border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-sm font-medium text-[#2563EB]"
          >
            {scheduleViewMode === 'day' ? scheduleCopy.dayBadge(visibleCount) : scheduleCopy.weekBadge(visibleCount)}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-2 text-sm font-medium text-[#177d66]"
          >
            {scheduleCopy.plannedBadge(visibleScheduledCount)}
          </Badge>
          {scheduleViewMode !== 'day' ? (
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {weekRangeLabel}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
