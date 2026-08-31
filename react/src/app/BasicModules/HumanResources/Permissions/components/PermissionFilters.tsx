import { useEffect, useState } from 'react';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
  useIndiceFilterDisclosureCopy,
} from '../../../../components/frontend-os';
import type { PermissionItem, PermissionFilterState } from '../types/permissions.types';
import type { PermissionsTranslations } from '../translations';

interface PermissionFiltersProps {
  copy: PermissionsTranslations;
  filters: PermissionFilterState;
  onClearFilters: () => void;
  onFiltersChange: (filters: PermissionFilterState) => void;
  isManager?: boolean;
  permissions: PermissionItem[];
}

export function PermissionFilters({
  copy,
  filters,
  onClearFilters,
  onFiltersChange,
  isManager = false,
  permissions,
}: PermissionFiltersProps) {
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const employeeOptions = Array.from(
    new Set(
      permissions
        .map((permission) => permission.employee.name)
        .filter((employeeName): employeeName is string => Boolean(employeeName?.trim())),
    ),
  ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

  const updateFilter = <K extends keyof PermissionFilterState>(key: K, value: PermissionFilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const activeAdvancedFilterCount = isManager && filters.employee !== 'all' ? 1 : 0;
  const hasActiveFilters = Boolean(
    filters.search.trim()
      || filters.status !== 'all'
      || filters.type !== 'all'
      || filters.payrollTreatment !== 'all'
      || activeAdvancedFilterCount > 0,
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
      gridClassName="lg:grid-cols-4"
      title={copy.filters.title}
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={activeAdvancedFilterCount}
          advancedLabel={showAdvancedFilters ? disclosureCopy.hideFilters : disclosureCopy.moreFilters}
          clearLabel={disclosureCopy.clearFilters}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={showAdvancedFilters}
          onClear={handleClearFilters}
          onToggleAdvanced={() => setShowAdvancedFilters((current) => !current)}
          showAdvancedToggle={isManager}
          tone="aqua"
        />
      )}
    >
      <IndiceFilterSearch
        label={copy.filters.searchLabel}
        value={filters.search}
        onValueChange={(value) => updateFilter('search', value)}
        onClear={() => updateFilter('search', '')}
        placeholder={copy.filters.searchPlaceholder}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filters.status}
        value={filters.status}
        onValueChange={(value) => updateFilter('status', value as PermissionFilterState['status'])}
        options={[
          { value: 'all', label: copy.filters.allStatuses },
          { value: 'pending', label: copy.status.pending },
          { value: 'approved', label: copy.status.approved },
          { value: 'rejected', label: copy.status.rejected },
        ]}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filters.type}
        value={filters.type}
        onValueChange={(value) => updateFilter('type', value as PermissionFilterState['type'])}
        options={[
          { value: 'all', label: copy.filters.allTypes },
          { value: 'vacation', label: copy.types.vacation },
          { value: 'sick_leave', label: copy.types.sick_leave },
          { value: 'personal', label: copy.types.personal },
          { value: 'maternity', label: copy.types.maternity },
          { value: 'bereavement', label: copy.types.bereavement },
          { value: 'unpaid', label: copy.types.unpaid },
          { value: 'other', label: copy.types.other },
        ]}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filters.payrollTreatment}
        value={filters.payrollTreatment}
        onValueChange={(value) => updateFilter('payrollTreatment', value as PermissionFilterState['payrollTreatment'])}
        options={[
          { value: 'all', label: copy.filters.allPayrollTreatments },
          { value: 'paid', label: copy.payrollTreatment.paid },
          { value: 'unpaid', label: copy.payrollTreatment.unpaid },
        ]}
        tone="aqua"
      />

      {isManager && showAdvancedFilters ? (
        <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-4" gridClassName="lg:grid-cols-4">
          <IndiceFilterSelect
            label={copy.filters.employee}
            value={filters.employee}
            onValueChange={(value) => updateFilter('employee', value)}
            options={[
              { value: 'all', label: copy.filters.allEmployees },
              ...employeeOptions.map((employee) => ({ value: employee, label: employee })),
            ]}
            tone="aqua"
          />
        </IndiceFilterAdvancedSection>
      ) : null}
    </IndiceFilterBar>
  );
}
