import type { KioskTranslations } from './translations';
import type { KioskTodayActivity } from './publicKioskTypes';

interface PublicKioskActivityCardProps {
  activeActivityLocation?: { name: string } | null;
  activityStateLabel: string;
  copy: KioskTranslations;
  todayActivity: KioskTodayActivity;
  formatActivityDate: (dateValue: string) => string;
  formatActivityTime: (dateTimeValue?: string | null) => string;
}

export function PublicKioskActivityCard({
  activeActivityLocation,
  activityStateLabel,
  copy,
  todayActivity,
  formatActivityDate,
  formatActivityTime,
}: PublicKioskActivityCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:px-4 sm:py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {copy.todayActivity}
          </p>
          <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
            {formatActivityDate(todayActivity.attendance_date)}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            {activityStateLabel}
          </p>
        </div>
        <div className="inline-flex w-fit max-w-full items-center rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
          {copy.activityStatus}: {copy.activityStatusLabels[todayActivity.status]}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.firstCheckIn}</p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
            {formatActivityTime(todayActivity.first_check_in_at)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.lastCheckOut}</p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
            {formatActivityTime(todayActivity.last_check_out_at)}
          </p>
        </div>
        {activeActivityLocation ? (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950 sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.activeLocation}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{activeActivityLocation.name}</p>
          </div>
        ) : null}
      </div>

      {!todayActivity.has_check_in && !todayActivity.has_check_out ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.noActivityToday}</p>
      ) : null}
    </div>
  );
}
