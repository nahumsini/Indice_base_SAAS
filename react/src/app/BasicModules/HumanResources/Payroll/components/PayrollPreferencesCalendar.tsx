import { CalendarDays, CalendarRange } from 'lucide-react';
import type { PayrollPreferences } from '../../../../api/humanResources';
import type { PayrollTranslations } from '../translations';

const fieldClassName = 'mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none focus:border-[#269C82] focus:ring-2 focus:ring-[#59C3A5]/20 disabled:opacity-60 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white';

type Props = { copy: PayrollTranslations; form: PayrollPreferences; onChange: (form: PayrollPreferences) => void };

export function PayrollPreferencesCalendar({ copy, form, onChange }: Props) {
  const text = copy.preferencesDialog;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"><CalendarDays className="h-4 w-4 text-[#177D66] dark:text-[#B8F2E3]" />{copy.frequencies.weekly}</h4>
        <label className="block text-sm text-slate-600 dark:text-slate-300">{text.weeklyStartDay}
          <select value={form.weekly_start_day} onChange={(event) => onChange({ ...form, weekly_start_day: Number(event.target.value) })} className={fieldClassName}>
            {text.weekDays.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
        </label>
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.weeklyHelper}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"><CalendarRange className="h-4 w-4 text-[#177D66] dark:text-[#B8F2E3]" />{copy.frequencies.biweekly}</h4>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-slate-600 dark:text-slate-300">{text.biweeklyFirstDay}
            <select value={form.biweekly_first_day} onChange={(event) => {
              const day = Number(event.target.value);
              onChange({ ...form, biweekly_first_day: day, biweekly_second_day: Math.max(form.biweekly_second_day, day + 1) });
            }} className={fieldClassName}>
              {Array.from({ length: 27 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
          <label className="block text-sm text-slate-600 dark:text-slate-300">{text.biweeklySecondDay}
            <select value={form.biweekly_second_day} onChange={(event) => onChange({ ...form, biweekly_second_day: Number(event.target.value) })} className={fieldClassName}>
              {Array.from({ length: 27 }, (_, index) => index + 2).map(day => <option key={day} value={day} disabled={day <= form.biweekly_first_day}>{day}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.biweeklyHelper}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"><CalendarDays className="h-4 w-4 text-[#177D66] dark:text-[#B8F2E3]" />{copy.frequencies.monthly}</h4>
        <label className="block text-sm text-slate-600 dark:text-slate-300">{text.monthlyStartDay}
          <select value={form.monthly_start_day} onChange={(event) => onChange({ ...form, monthly_start_day: Number(event.target.value) })} className={fieldClassName}>
            {Array.from({ length: 31 }, (_, index) => index + 1).map(day => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.monthlyHelper}</p>
      </section>
    </div>
  );
}
