import {
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
  useIndiceFilterDisclosureCopy,
} from '../../../../components/frontend-os';
import type { AnnouncementFiltersCopy } from '../translations';

interface AnnouncementFiltersProps {
  copy: AnnouncementFiltersCopy;
  audienceOptions: ReadonlyArray<{ value: string; label: string }>;
  searchQuery: string;
  selectedAudience: string;
  selectedStatus: string;
  selectedType: string;
  statusOptions: ReadonlyArray<{ value: string; label: string }>;
  typeOptions: ReadonlyArray<{ value: string; label: string }>;
  onAudienceChange: (value: string) => void;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

export function AnnouncementFilters({
  copy,
  audienceOptions,
  searchQuery,
  selectedAudience,
  selectedStatus,
  selectedType,
  statusOptions,
  typeOptions,
  onAudienceChange,
  onClearFilters,
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: AnnouncementFiltersProps) {
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const hasActiveFilters = Boolean(
    searchQuery.trim()
      || selectedAudience !== 'all'
      || selectedStatus !== 'all'
      || selectedType !== 'all',
  );

  return (
    <IndiceFilterBar
      className="mb-6"
      gridClassName="lg:grid-cols-4"
      title={copy.title}
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
        label={copy.searchLabel}
        value={searchQuery}
        onValueChange={onSearchChange}
        onClear={() => onSearchChange('')}
        placeholder={copy.searchPlaceholder}
        tone="aqua"
      />
      <IndiceFilterSelect label={copy.type} value={selectedType} options={[...typeOptions]} onValueChange={onTypeChange} tone="aqua" />
      <IndiceFilterSelect label={copy.status} value={selectedStatus} options={[...statusOptions]} onValueChange={onStatusChange} tone="aqua" />
      <IndiceFilterSelect label={copy.audience} value={selectedAudience} options={[...audienceOptions]} onValueChange={onAudienceChange} tone="aqua" />
    </IndiceFilterBar>
  );
}
