import { CalendarDays } from 'lucide-react';
import type { PeriodFilter } from '../../types/expenseView.types';
import type { FinanceTranslations } from '../../translations';

const filterInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

interface FinancialOverviewPeriodFilterProps {
  customEndDate: string;
  customStartDate: string;
  periodFilter: PeriodFilter;
  resultCount: number;
  text: FinanceTranslations;
  onCustomEndDateChange: (value: string) => void;
  onCustomStartDateChange: (value: string) => void;
  onPeriodFilterChange: (value: PeriodFilter) => void;
}

export function FinancialOverviewPeriodFilter({
  customEndDate,
  customStartDate,
  periodFilter,
  resultCount,
  text,
  onCustomEndDateChange,
  onCustomStartDateChange,
  onPeriodFilterChange,
}: FinancialOverviewPeriodFilterProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">{text.filters.title}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{text.kpis.periodFilterHelp}</p>
          </div>
        </div>
        <span className="rounded-full border border-[#147514]/15 bg-[#147514]/10 px-3 py-1 text-sm font-bold text-[#147514] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
          {text.common.results(resultCount)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SelectField
          label={text.filters.period}
          value={periodFilter}
          onChange={(value) => onPeriodFilterChange(value as PeriodFilter)}
          options={[
            ['this_month', text.periods.thisMonth],
            ['last_month', text.periods.lastMonth],
            ['two_months_ago', text.periods.twoMonthsAgo],
            ['this_year', text.periods.thisYear],
            ['last_year', text.periods.lastYear],
            ['custom', text.periods.custom],
          ]}
        />
        {periodFilter === 'custom' ? (
          <>
            <DateField label={text.budgets.filters.from} value={customStartDate} onChange={onCustomStartDateChange} />
            <DateField label={text.budgets.filters.to} value={customEndDate} onChange={onCustomEndDateChange} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[][];
  value: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={filterInputClass}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={filterInputClass} />
    </label>
  );
}
