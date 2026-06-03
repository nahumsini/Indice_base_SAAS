import type { ReactNode } from 'react';
import { Users } from 'lucide-react';
import type { ControlTranslations } from '../../../translations';
import type {
  DailyAttendanceMetric,
  TimeTableUnitCoverage,
} from '../../../types/timeTableTypes';
export { EmployeeTable } from './TimeTableEmployeeTable';

export function TimeTableFilters({
  businessFilter,
  businessOptions,
  copy,
  date,
  unitFilter,
  unitOptions,
  onBusinessFilterChange,
  onDateChange,
  onUnitFilterChange,
}: {
  businessFilter: string;
  businessOptions: Array<[string, string]>;
  copy: ControlTranslations;
  date: string;
  unitFilter: string;
  unitOptions: Array<[string, string]>;
  onBusinessFilterChange: (value: string) => void;
  onDateChange: (date: string) => void;
  onUnitFilterChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.timeTable.filtersTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.timeTable.filtersDescription}
          </p>
        </div>

        <label className="block w-full xl:w-52">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {copy.timeTable.attendanceDate}
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) {
                onDateChange(event.target.value);
              }
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <label className="block w-full xl:w-72">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {copy.labels.unit}
          </span>
          <select
            value={unitFilter}
            onChange={(event) => onUnitFilterChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.timeTable.allUnits}</option>
            {unitOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="block w-full xl:w-72">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {copy.labels.business}
          </span>
          <select
            value={businessFilter}
            onChange={(event) => onBusinessFilterChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{copy.timeTable.allBusinesses}</option>
            {businessOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export function TimeTableKpiStrip({ metrics }: { metrics: DailyAttendanceMetric[] }) {
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {metrics.map((metric, index) => (
        <div key={metric.key} className="flex items-center gap-x-4">
          <TimeTableKpiMetric
            icon={metric.icon}
            label={metric.label}
            title={metric.title}
            value={metric.value}
            valueClassName={metric.valueClassName}
          />
          {index < metrics.length - 1 ? <KpiSeparator /> : null}
        </div>
      ))}
    </section>
  );
}

function TimeTableKpiMetric({
  icon,
  label,
  title,
  value,
  valueClassName = 'text-[#59C3A5]',
}: {
  icon: ReactNode;
  label: string;
  title: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-[145px] items-center gap-2" title={title}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#8FE0CA]/15 dark:text-[#8FE0CA]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-5 text-slate-950 dark:text-white">
          <span className={valueClassName}>{value}</span>
        </p>
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function KpiSeparator() {
  return <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 md:inline-flex" />;
}

export function OrganizationSummary({
  businessFilter,
  copy,
  dateLabel,
  selectedBusinessLabel,
  selectedUnitLabel,
  totalEmployees,
  unitFilter,
  visibleUnitCoverage,
  onUnitFilterChange,
}: {
  businessFilter: string;
  copy: ControlTranslations;
  dateLabel: string;
  selectedBusinessLabel: string;
  selectedUnitLabel: string;
  totalEmployees: number;
  unitFilter: string;
  visibleUnitCoverage: TimeTableUnitCoverage[];
  onUnitFilterChange: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.timeTable.organizationSummaryTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.timeTable.organizationSummaryDescription(
              totalEmployees,
              unitFilter ? selectedUnitLabel : copy.timeTable.allUnits,
              businessFilter ? selectedBusinessLabel : copy.timeTable.allBusinesses,
            )}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-[#59C3A5]/10 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-[#8FE0CA]/15 dark:text-[#8FE0CA]">
          {dateLabel}
        </span>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleUnitCoverage.length > 0 ? visibleUnitCoverage.map((group) => (
          <button
            key={group.unitId}
            type="button"
            onClick={() => onUnitFilterChange(group.unitId)}
            className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
              unitFilter === group.unitId
                ? 'border-[#59C3A5] bg-[#59C3A5]/5 shadow-sm dark:border-[#8FE0CA] dark:bg-[#8FE0CA]/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{group.unit}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {copy.timeTable.businessCount(group.businessList.length)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-slate-800 dark:text-[#8FE0CA]">
                <Users className="h-3.5 w-3.5" />
                {group.count}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {group.businessList.slice(0, 3).map((business) => (
                <div key={business.business} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">{business.business}</span>
                  <span className="font-semibold text-slate-950 dark:text-white">{business.count}</span>
                </div>
              ))}
            </div>
          </button>
        )) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
            {copy.timeTable.noUnitsMatch}
          </div>
        )}
      </div>
    </section>
  );
}
