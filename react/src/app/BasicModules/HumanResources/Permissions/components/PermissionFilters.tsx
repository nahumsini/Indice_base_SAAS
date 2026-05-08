import { Search } from 'lucide-react';
import type { PermissionItem, PermissionFilterState } from '../types/permissions.types';

interface PermissionFiltersProps {
  filters: PermissionFilterState;
  onFiltersChange: (filters: PermissionFilterState) => void;
  isManager?: boolean;
  permissions: PermissionItem[];
}

export function PermissionFilters({
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
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Filters</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Search request
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Employee or folio"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value as PermissionFilterState['status'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value as PermissionFilterState['type'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All types</option>
            <option value="vacation">Vacation</option>
            <option value="sick_leave">Sick Leave</option>
            <option value="personal">Personal</option>
            <option value="maternity">Maternity/Paternity</option>
            <option value="bereavement">Bereavement</option>
            <option value="unpaid">Unpaid Leave</option>
            <option value="other">Other</option>
          </select>
        </div>

        {isManager ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Employee
            </label>
            <select
              value={filters.employee}
              onChange={(event) => updateFilter('employee', event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">All employees</option>
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
