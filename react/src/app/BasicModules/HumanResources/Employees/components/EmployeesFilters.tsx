import { useEffect, useState } from 'react';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
  useIndiceFilterDisclosureCopy,
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
  onClearFilters: () => void;
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
  onClearFilters,
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
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const activeAdvancedFilterCount = departmentFilter === 'all' ? 0 : 1;
  const hasActiveFilters = Boolean(
    searchQuery.trim()
      || unitFilter !== 'all'
      || businessFilter !== 'all'
      || departmentFilter !== 'all'
      || statusFilter !== 'active',
  );

  useEffect(() => {
    if (activeAdvancedFilterCount > 0) setShowAdvancedFilters(true);
  }, [activeAdvancedFilterCount]);

  const handleClearFilters = () => {
    onClearFilters();
    setShowAdvancedFilters(false);
  };

  return (
    <IndiceFilterBar
      className="mb-6"
      gridClassName="lg:grid-cols-4"
      title={filtersCopy.title}
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={activeAdvancedFilterCount}
          advancedLabel={showAdvancedFilters ? disclosureCopy.hideFilters : disclosureCopy.moreFilters}
          clearLabel={disclosureCopy.clearFilters}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={showAdvancedFilters}
          onClear={handleClearFilters}
          onToggleAdvanced={() => setShowAdvancedFilters((current) => !current)}
          tone="aqua"
        />
      )}
    >
      <IndiceFilterSearch
        label={filtersCopy.searchLabel}
        value={searchQuery}
        onValueChange={onSearchQueryChange}
        onClear={() => onSearchQueryChange('')}
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
        label={filtersCopy.status}
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={statusFilterOptions}
        tone="aqua"
      />
      {showAdvancedFilters ? (
        <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-4" gridClassName="lg:grid-cols-4">
          <IndiceFilterSelect
            label={filtersCopy.department}
            value={departmentFilter}
            onValueChange={onDepartmentFilterChange}
            options={departmentFilterOptions}
            tone="aqua"
          />
        </IndiceFilterAdvancedSection>
      ) : null}
    </IndiceFilterBar>
  );
}
