import {
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
  useIndiceFilterDisclosureCopy,
} from '../../../../components/frontend-os';
import type { HrAssetStatus } from '../../../../api/HumanResources/assets';
import type { AddNewAssetOption } from '../AddNewAssests';
import {
  assetTypeOptions,
  type AddNewAssetType,
} from '../constants/assetCatalog';
import type { AssetFiltersCopy } from '../translations';

type AssetTypeFilter = 'all' | AddNewAssetType;

interface AssetFiltersProps {
  copy: AssetFiltersCopy;
  searchQuery: string;
  statusFilter: 'all' | HrAssetStatus;
  typeFilter: AssetTypeFilter;
  unitFilter: string;
  unitOptions: AddNewAssetOption[];
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onStatusChange: (value: 'all' | HrAssetStatus) => void;
  onTypeChange: (value: AssetTypeFilter) => void;
  onUnitChange: (value: string) => void;
}

export function AssetFilters({
  copy,
  searchQuery,
  statusFilter,
  typeFilter,
  unitFilter,
  unitOptions,
  onSearchChange,
  onClearFilters,
  onStatusChange,
  onTypeChange,
  onUnitChange,
}: AssetFiltersProps) {
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilter !== 'all' || typeFilter !== 'all' || unitFilter !== 'all',
  );

  return (
    <IndiceFilterBar
      className="mb-5"
      gridClassName="lg:grid-cols-4"
      title={copy.filtersPanel.title}
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
        label={copy.filtersPanel.searchLabel}
        value={searchQuery}
        onValueChange={onSearchChange}
        onClear={() => onSearchChange('')}
        placeholder={copy.filtersPanel.searchPlaceholder}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filtersPanel.type}
        value={typeFilter}
        onValueChange={(value) => onTypeChange(value as AssetTypeFilter)}
        options={[
          { value: 'all', label: copy.filters.allTypes },
          ...assetTypeOptions.map((option) => ({ value: option.value, label: copy.addNewAsset.options[option.labelKey] })),
        ]}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filtersPanel.status}
        value={statusFilter}
        onValueChange={(value) => onStatusChange(value as 'all' | HrAssetStatus)}
        options={[
          { value: 'all', label: copy.filters.allStatuses },
          { value: 'available', label: copy.filters.available },
          { value: 'assigned', label: copy.filters.assigned },
          { value: 'maintenance', label: copy.filters.inMaintenance },
          { value: 'custody', label: copy.filters.custody },
          { value: 'inactive', label: copy.filters.inactive },
        ]}
        tone="aqua"
      />
      <IndiceFilterSelect
        label={copy.filtersPanel.unit}
        value={unitFilter}
        onValueChange={onUnitChange}
        options={[
          { value: 'all', label: copy.filters.allUnits },
          ...unitOptions.map((unit) => ({ value: unit.value, label: unit.label })),
        ]}
        tone="aqua"
      />
    </IndiceFilterBar>
  );
}
