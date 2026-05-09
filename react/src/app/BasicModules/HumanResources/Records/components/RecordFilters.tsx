import { Search } from 'lucide-react';
import type { RecordFiltersState } from '../types/records.types';
import type { RecordFiltersCopy } from '../translations';

interface RecordFiltersProps {
  copy: RecordFiltersCopy;
  filters: RecordFiltersState;
  onFiltersChange: (filters: RecordFiltersState) => void;
  unitOptions: string[];
  businessOptions: string[];
}

export function RecordFilters({ copy, filters, onFiltersChange, unitOptions, businessOptions }: RecordFiltersProps) {
  const updateFilter = <K extends keyof RecordFiltersState>(key: K, value: RecordFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{copy.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.searchLabel}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder={copy.filters.searchPlaceholder}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.unit}
          </label>
          <select
            value={filters.unit}
            onChange={(event) => updateFilter('unit', event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allUnits}</option>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.business}
          </label>
          <select
            value={filters.business}
            onChange={(event) => updateFilter('business', event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allBusinesses}</option>
            {businessOptions.map((business) => (
              <option key={business} value={business}>{business}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.status}
          </label>
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value as RecordFiltersState['status'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allStatuses}</option>
            <option value="pending">{copy.status.pending}</option>
            <option value="reviewed">{copy.status.reviewed}</option>
            <option value="resolved">{copy.status.resolved}</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.type}
          </label>
          <select
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value as RecordFiltersState['type'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allTypes}</option>
            <option value="incident">{copy.types.incident}</option>
            <option value="warning">{copy.types.warning}</option>
            <option value="recognition">{copy.types.recognition}</option>
            <option value="observation">{copy.types.observation}</option>
            <option value="training">{copy.types.training}</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.severity}
          </label>
          <select
            value={filters.severity}
            onChange={(event) => updateFilter('severity', event.target.value as RecordFiltersState['severity'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allSeverity}</option>
            <option value="low">{copy.severity.low}</option>
            <option value="medium">{copy.severity.medium}</option>
            <option value="high">{copy.severity.high}</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.dateFrom}
          </label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.dateTo}
          </label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
