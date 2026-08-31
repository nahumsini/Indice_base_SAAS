import {
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
  useIndiceFilterDisclosureCopy,
} from '../../../../components/frontend-os';
import type { IncentivesTranslations } from '../translations';
import type { RHIncentivo } from '../types';

interface IncentiveFiltersProps {
  copy: IncentivesTranslations;
  searchQuery: string;
  selectedStatus: 'all' | RHIncentivo['estado'];
  selectedType: 'all' | RHIncentivo['tipo'];
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onStatusChange: (value: 'all' | RHIncentivo['estado']) => void;
  onTypeChange: (value: 'all' | RHIncentivo['tipo']) => void;
}

export function IncentiveFilters({
  copy,
  searchQuery,
  selectedStatus,
  selectedType,
  onSearchChange,
  onClearFilters,
  onStatusChange,
  onTypeChange,
}: IncentiveFiltersProps) {
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedStatus !== 'all' || selectedType !== 'all');

  return (
    <IndiceFilterBar
      className="mb-5"
      gridClassName="lg:grid-cols-3"
      title={copy.filters.title}
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={0}
          advancedLabel={disclosureCopy.moreFilters}
          clearLabel={disclosureCopy.clearFilters}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={false}
          onClear={onClearFilters}
          onToggleAdvanced={() => undefined}
          showAdvancedToggle={false}
          tone="aqua"
        />
      )}
    >
      <IndiceFilterSearch
        label={copy.filters.searchLabel}
        value={searchQuery}
        onValueChange={onSearchChange}
        onClear={() => onSearchChange('')}
        placeholder={copy.filters.searchPlaceholder}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filters.type}
        value={selectedType}
        onValueChange={(value) => onTypeChange(value as 'all' | RHIncentivo['tipo'])}
        options={[
          { value: 'all', label: copy.filters.allTypes },
          { value: 'Automatizado', label: copy.types.Automatizado },
          { value: 'Manual', label: copy.types.Manual },
        ]}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filters.status}
        value={selectedStatus}
        onValueChange={(value) => onStatusChange(value as 'all' | RHIncentivo['estado'])}
        options={[
          { value: 'all', label: copy.filters.allStatuses },
          { value: 'Activo', label: copy.statuses.Activo },
          { value: 'Programado', label: copy.statuses.Programado },
          { value: 'Pausado', label: copy.statuses.Pausado },
        ]}
        tone="aqua"
      />
    </IndiceFilterBar>
  );
}
