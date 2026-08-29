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
import type { RecordFiltersState } from '../types/records.types';
import type { RecordFiltersCopy } from '../translations';

interface RecordFiltersProps {
  copy: RecordFiltersCopy;
  filters: RecordFiltersState;
  onClearFilters: () => void;
  onFiltersChange: (filters: RecordFiltersState) => void;
  unitOptions: string[];
  businessOptions: string[];
}

export function RecordFilters({ copy, filters, onClearFilters, onFiltersChange, unitOptions, businessOptions }: RecordFiltersProps) {
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const updateFilter = <K extends keyof RecordFiltersState>(key: K, value: RecordFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const activeAdvancedFilterCount = [filters.unit, filters.business, filters.severity]
    .filter((value) => value !== 'all').length
    + Number(Boolean(filters.dateFrom))
    + Number(Boolean(filters.dateTo));
  const hasActiveFilters = Boolean(
    filters.search.trim()
      || filters.status !== 'all'
      || filters.type !== 'all'
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
      gridClassName="lg:grid-cols-3"
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
        onValueChange={(value) => updateFilter('status', value as RecordFiltersState['status'])}
        options={[
          { value: 'all', label: copy.filters.allStatuses },
          { value: 'pending', label: copy.status.pending },
          { value: 'reviewed', label: copy.status.reviewed },
          { value: 'resolved', label: copy.status.resolved },
        ]}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filters.type}
        value={filters.type}
        onValueChange={(value) => updateFilter('type', value as RecordFiltersState['type'])}
        options={[
          { value: 'all', label: copy.filters.allTypes },
          { value: 'incident', label: copy.types.incident },
          { value: 'warning', label: copy.types.warning },
          { value: 'recognition', label: copy.types.recognition },
          { value: 'observation', label: copy.types.observation },
          { value: 'training', label: copy.types.training },
        ]}
        tone="aqua"
      />

      {showAdvancedFilters ? (
        <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-3" gridClassName="lg:grid-cols-4">
          <IndiceFilterSelect
            label={copy.filters.unit}
            value={filters.unit}
            onValueChange={(value) => updateFilter('unit', value)}
            options={[
              { value: 'all', label: copy.filters.allUnits },
              ...unitOptions.map((unit) => ({ value: unit, label: unit })),
            ]}
            tone="aqua"
          />
          <IndiceFilterSelect
            label={copy.filters.business}
            value={filters.business}
            onValueChange={(value) => updateFilter('business', value)}
            options={[
              { value: 'all', label: copy.filters.allBusinesses },
              ...businessOptions.map((business) => ({ value: business, label: business })),
            ]}
            tone="aqua"
          />
          <IndiceFilterSelect
            label={copy.filters.severity}
            value={filters.severity}
            onValueChange={(value) => updateFilter('severity', value as RecordFiltersState['severity'])}
            options={[
              { value: 'all', label: copy.filters.allSeverity },
              { value: 'low', label: copy.severity.low },
              { value: 'medium', label: copy.severity.medium },
              { value: 'high', label: copy.severity.high },
            ]}
            tone="aqua"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IndiceFilterField label={copy.filters.dateFrom}>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(event) => updateFilter('dateFrom', event.target.value)}
                className={getIndiceFilterControlClassName('aqua')}
              />
            </IndiceFilterField>
            <IndiceFilterField label={copy.filters.dateTo}>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(event) => updateFilter('dateTo', event.target.value)}
                className={getIndiceFilterControlClassName('aqua')}
              />
            </IndiceFilterField>
          </div>
        </IndiceFilterAdvancedSection>
      ) : null}
    </IndiceFilterBar>
  );
}
