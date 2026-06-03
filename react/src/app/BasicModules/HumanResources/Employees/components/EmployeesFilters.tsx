import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import type { EmployeesTranslations } from '../translations';
import type { Option } from '../types/employees.types';
import { FilterSelect } from './EmployeeTableControls';

interface EmployeesFiltersProps {
  businessFilter: string;
  businessFilterOptions: Option<string>[];
  departmentFilter: string;
  departmentFilterOptions: Option<string>[];
  filtersCopy: EmployeesTranslations['filters'];
  onBusinessFilterChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
  searchQuery: string;
  statusFilter: string;
  statusFilterOptions: Option<string>[];
  unitFilter: string;
  unitFilterOptions: Option<string>[];
}

export function EmployeesFilters({
  businessFilter,
  businessFilterOptions,
  departmentFilter,
  departmentFilterOptions,
  filtersCopy,
  onBusinessFilterChange,
  onDepartmentFilterChange,
  onSearchQueryChange,
  onStatusFilterChange,
  onUnitFilterChange,
  searchQuery,
  statusFilter,
  statusFilterOptions,
  unitFilter,
  unitFilterOptions,
}: EmployeesFiltersProps) {
  return (
    <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">{filtersCopy.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {filtersCopy.searchLabel}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={filtersCopy.searchPlaceholder}
              className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
        </div>
        <FilterSelect
          label={filtersCopy.unit}
          value={unitFilter}
          onChange={onUnitFilterChange}
          options={unitFilterOptions}
        />
        <FilterSelect
          label={filtersCopy.business}
          value={businessFilter}
          onChange={onBusinessFilterChange}
          options={businessFilterOptions}
        />
        <FilterSelect
          label={filtersCopy.department}
          value={departmentFilter}
          onChange={onDepartmentFilterChange}
          options={departmentFilterOptions}
        />
        <FilterSelect
          label={filtersCopy.status}
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={statusFilterOptions}
        />
      </div>
    </section>
  );
}
