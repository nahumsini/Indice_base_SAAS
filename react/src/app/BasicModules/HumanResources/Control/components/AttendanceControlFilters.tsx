import { useEffect, useState } from 'react';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterField,
  IndiceFilterSearch,
  IndiceFilterSelect,
  getIndiceFilterControlClassName,
  useIndiceFilterDisclosureCopy,
} from '../../../../components/frontend-os';
import type { AttendanceControlCopy } from './ControlAttendanceWidgets';
import type { AttendanceFilterOption } from './EmployeeAttendanceList';
import { todayIsoDate } from '../utils/control.utils';

export function AttendanceControlFilters({
  allFilterValue,
  businessFilter,
  businessFilterOptions,
  controlDate,
  copy,
  onBusinessFilterChange,
  onClearFilters,
  onDateChange,
  onSearchChange,
  onStatusFilterChange,
  onUnitFilterChange,
  searchQuery,
  statusFilter,
  statusFilterOptions,
  unitFilter,
  unitFilterOptions,
}: {
  allFilterValue: string;
  businessFilter: string;
  businessFilterOptions: AttendanceFilterOption[];
  controlDate: string;
  copy: AttendanceControlCopy;
  onBusinessFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onUnitFilterChange: (value: string) => void;
  searchQuery: string;
  statusFilter: string;
  statusFilterOptions: AttendanceFilterOption[];
  unitFilter: string;
  unitFilterOptions: AttendanceFilterOption[];
}) {
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const formatOptionLabel = (option: AttendanceFilterOption) => (
    typeof option.count === 'number' ? `${option.label} (${option.count})` : option.label
  );
  const activeAdvancedFilterCount = [unitFilter, businessFilter].filter((value) => value !== allFilterValue).length;
  const hasActiveFilters = Boolean(
    searchQuery.trim()
      || controlDate !== todayIsoDate()
      || statusFilter !== allFilterValue
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
      className="mb-5"
      gridClassName="lg:grid-cols-3"
      title={copy.labels.filtersTitle}
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
          label={copy.labels.searchLabel}
          value={searchQuery}
          onValueChange={onSearchChange}
          onClear={() => onSearchChange('')}
          placeholder={copy.searchPlaceholder}
          tone="aqua"
        />

        <IndiceFilterField label={copy.labels.period}>
          <input
            type="date"
            value={controlDate}
            onChange={(event) => onDateChange(event.target.value)}
            className={getIndiceFilterControlClassName('aqua')}
          />
        </IndiceFilterField>

        <IndiceFilterSelect
          label={copy.labels.status}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
          options={statusFilterOptions.map((option) => ({ ...option, label: formatOptionLabel(option) }))}
          tone="aqua"
        />

        {showAdvancedFilters ? (
          <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-3" gridClassName="lg:grid-cols-2">
            <IndiceFilterSelect
              label={copy.labels.unit}
              value={unitFilter}
              onValueChange={onUnitFilterChange}
              options={[
                { value: allFilterValue, label: copy.labels.allUnits },
                ...unitFilterOptions,
              ]}
              tone="aqua"
            />
            <IndiceFilterSelect
              label={copy.labels.business}
              value={businessFilter}
              onValueChange={onBusinessFilterChange}
              options={[
                { value: allFilterValue, label: copy.labels.allBusinesses },
                ...businessFilterOptions,
              ]}
              tone="aqua"
            />
          </IndiceFilterAdvancedSection>
        ) : null}
    </IndiceFilterBar>
  );
}
