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
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm shadow-[0_14px_34px_-32px_rgba(15,23,42,0.8)] dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#177D66] dark:text-[#8FE0CA]">
            {copy.stepLabel} 4 · {copy.todayActivity}
          </p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
            {formatActivityDate(todayActivity.attendance_date)}
          </p>
        </div>
        <div className="inline-flex max-w-[45%] items-center rounded-full bg-[#59C3A5]/12 px-3 py-1 text-right text-[11px] font-black text-[#177D66] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
          {copy.activityStatusLabels[todayActivity.status]}
        </div>
      </div>

      <p className="mt-2 text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
        {activityStateLabel}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.firstCheckIn}</p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
            {formatActivityTime(todayActivity.first_check_in_at)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.lastCheckOut}</p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
            {formatActivityTime(todayActivity.last_check_out_at)}
          </p>
        </div>
        {activeActivityLocation ? (
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.activeLocation}</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{activeActivityLocation.name}</p>
          </div>
        ) : null}
      </div>

    </section>
  );
}
