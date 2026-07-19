import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from '../../../../components/frontend-os';
import type { EmployeesTranslations } from '../translations';
import type { Option } from '../types/employees.types';

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
    <IndiceFilterBar className="mb-6" gridClassName="xl:grid-cols-5" title={filtersCopy.title}>
      <IndiceFilterSearch
        label={filtersCopy.searchLabel}
        value={searchQuery}
        onValueChange={onSearchQueryChange}
        placeholder={filtersCopy.searchPlaceholder}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={filtersCopy.unit}
        value={unitFilter}
        onValueChange={onUnitFilterChange}
        options={unitFilterOptions}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={filtersCopy.business}
        value={businessFilter}
        onValueChange={onBusinessFilterChange}
        options={businessFilterOptions}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={filtersCopy.department}
        value={departmentFilter}
        onValueChange={onDepartmentFilterChange}
        options={departmentFilterOptions}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={filtersCopy.status}
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={statusFilterOptions}
        tone="aqua"
      />
    </IndiceFilterBar>
  );
}
