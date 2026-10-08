import type { CSSProperties, ReactNode } from 'react';
import { MODULE_COLORS, type IndiceModuleTone } from '../../styles/moduleColors';

/** Presentation-only month/week/day grid, adopting the HR/Consulting calendar rhythm.
 * Owners supply scoped dates and content. This primitive owns no scheduling rules or mutations.
 */
export function IndiceCalendarSurface({ dates, locale, selectedDate, onSelectDate, renderDay, label, tone = 'blue' }: {
  dates: Date[]; locale: string; selectedDate: string; onSelectDate: (date: string) => void;
  renderDay: (date: string) => ReactNode; label: string;
  tone?: IndiceModuleTone;
}) {
  const theme = MODULE_COLORS[tone];
  const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const single = dates.length === 1, leading = single || !dates.length ? 0 : (dates[0].getDay() + 6) % 7;
  return <section aria-label={label} style={{ '--calendar-accent': theme.primary } as CSSProperties} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div className="overflow-x-auto"><div className={single ? 'min-w-0' : 'min-w-[840px]'}>
      {!single && <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">{Array.from({length:7},(_,i)=>new Date(2026,0,5+i)).map(date =>
        <div key={date.getDay()} className="p-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{new Intl.DateTimeFormat(locale,{weekday:'short'}).format(date)}</div>)}</div>}
      <div className={single ? '' : 'grid grid-cols-7'}>
        {Array.from({length:leading},(_,i)=><div key={`empty-${i}`} className="border-b border-r border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950" />)}
        {dates.map(date => <div key={key(date)} className={`min-h-36 min-w-0 border-b border-r border-slate-100 p-3 dark:border-slate-800 ${key(date)===selectedDate?`${theme.lightBg} ${theme.darkBg} ring-2 ring-inset ring-[var(--calendar-accent)]/25`:''}`}>
          <button type="button" onClick={()=>onSelectDate(key(date))} aria-label={new Intl.DateTimeFormat(locale,{dateStyle:'full'}).format(date)} aria-pressed={key(date)===selectedDate}
            className={`mb-3 flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-accent)] ${theme.iconHover}`}>
            {new Intl.NumberFormat(locale).format(date.getDate())}
          </button><div className="space-y-2">{renderDay(key(date))}</div>
        </div>)}
      </div>
    </div></div>
  </section>;
}
