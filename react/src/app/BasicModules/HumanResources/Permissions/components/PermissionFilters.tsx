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
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Search by employee or folio..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value as PermissionFilterState['status'])}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(event) => updateFilter('type', event.target.value as PermissionFilterState['type'])}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Employee
            </label>
            <select
              value={filters.employee}
              onChange={(event) => updateFilter('employee', event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
