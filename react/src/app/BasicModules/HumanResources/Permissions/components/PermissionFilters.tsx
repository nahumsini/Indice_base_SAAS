import { Search } from 'lucide-react';
import type { PermissionItem, PermissionFilterState } from '../types/permissions.types';
import type { PermissionsTranslations } from '../translations';

interface PermissionFiltersProps {
  copy: PermissionsTranslations;
  filters: PermissionFilterState;
  onFiltersChange: (filters: PermissionFilterState) => void;
  isManager?: boolean;
  permissions: PermissionItem[];
}

export function PermissionFilters({
  copy,
  filters,
  onFiltersChange,
  isManager = false,
  permissions,
}: PermissionFiltersProps) {
  const employeeOptions = Array.from(new Set(permissions.map((permission) => permission.employee.name))).sort();

  const updateFilter = <K extends keyof PermissionFilterState>(key: K, value: PermissionFilterState[K]) => {
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
            {copy.filters.status}
          </label>
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value as PermissionFilterState['status'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allStatuses}</option>
            <option value="pending">{copy.status.pending}</option>
            <option value="approved">{copy.status.approved}</option>
            <option value="rejected">{copy.status.rejected}</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.type}
          </label>
          <select
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value as PermissionFilterState['type'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allTypes}</option>
            <option value="vacation">{copy.types.vacation}</option>
            <option value="sick_leave">{copy.types.sick_leave}</option>
            <option value="personal">{copy.types.personal}</option>
            <option value="maternity">{copy.types.maternity}</option>
            <option value="bereavement">{copy.types.bereavement}</option>
            <option value="unpaid">{copy.types.unpaid}</option>
            <option value="other">{copy.types.other}</option>
          </select>
        </div>

        {isManager ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {copy.filters.employee}
            </label>
            <select
              value={filters.employee}
              onChange={(event) => updateFilter('employee', event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">{copy.filters.allEmployees}</option>
              {employeeOptions.map((employee) => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
