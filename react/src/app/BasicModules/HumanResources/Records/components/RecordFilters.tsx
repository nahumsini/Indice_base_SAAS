import { Search } from 'lucide-react';
import type { RecordFiltersState } from '../types/records.types';

interface RecordFiltersProps {
  filters: RecordFiltersState;
  onFiltersChange: (filters: RecordFiltersState) => void;
  unitOptions: string[];
  businessOptions: string[];
}

export function RecordFilters({ filters, onFiltersChange, unitOptions, businessOptions }: RecordFiltersProps) {
  const updateFilter = <K extends keyof RecordFiltersState>(key: K, value: RecordFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Filters</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Search record
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Employee, title, type or description"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Unit
          </label>
          <select
            value={filters.unit}
            onChange={(event) => updateFilter('unit', event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All units</option>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Business
          </label>
          <select
            value={filters.business}
            onChange={(event) => updateFilter('business', event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All businesses</option>
            {businessOptions.map((business) => (
              <option key={business} value={business}>{business}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value as RecordFiltersState['status'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value as RecordFiltersState['type'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All types</option>
            <option value="incident">Incident</option>
            <option value="warning">Warning</option>
            <option value="recognition">Recognition</option>
            <option value="observation">Observation</option>
            <option value="training">Training</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Severity
          </label>
          <select
            value={filters.severity}
            onChange={(event) => updateFilter('severity', event.target.value as RecordFiltersState['severity'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Date from
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
            Date to
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
