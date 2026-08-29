import { useEffect, useState } from 'react';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from '../../../../components/frontend-os';
import {
  providerFilterTypeOptions,
  providerStatusOptions,
  type ProviderStatus,
  type ProviderType,
} from '../useProveedoresLogic';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';

type ProvidersFilterBarProps = {
  businessFilter: string;
  businessOptions: FinanceReferenceOption[];
  businessUnitFilter: string;
  businessUnitOptions: FinanceReferenceOption[];
  filteredCount: number;
  searchTerm: string;
  statusFilter: ProviderStatus | 'all';
  typeFilter: ProviderType | 'all';
  onBusinessChange: (value: string) => void;
  onBusinessUnitChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProviderStatus | 'all') => void;
  onTypeChange: (value: ProviderType | 'all') => void;
};

export function ProvidersFilterBar(props: ProvidersFilterBarProps) {
  const t = useProvidersTranslations();
  const advancedFilterCount = [
    props.businessUnitFilter !== 'all',
    props.businessFilter !== 'all',
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(
    props.searchTerm
    || props.typeFilter !== 'all'
    || props.statusFilter !== 'all'
    || advancedFilterCount > 0,
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(advancedFilterCount > 0);

  useEffect(() => {
    if (advancedFilterCount > 0) setShowAdvancedFilters(true);
  }, [advancedFilterCount]);

  const clearFilters = () => {
    props.onSearchChange('');
    props.onTypeChange('all');
    props.onStatusChange('all');
    props.onBusinessUnitChange('all');
    props.onBusinessChange('all');
    setShowAdvancedFilters(false);
  };
  const typeOptions = providerFilterTypeOptions.map(option => ({
    ...option,
    label: option.value === 'all' ? t.common.all : t.providers.types[option.value] ?? option.label,
  }));
  const statusOptions = [
    { value: 'all', label: t.common.all },
    ...providerStatusOptions.map(option => ({
      ...option,
      label: option.value === 'active' ? t.common.active : t.common.inactive,
    })),
  ];

  return (
    <IndiceFilterBar
      gridClassName="xl:grid-cols-[minmax(280px,1.4fr)_repeat(2,minmax(0,1fr))]"
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={advancedFilterCount}
          advancedLabel={showAdvancedFilters ? t.common.hideMoreFilters : t.common.moreFilters}
          clearLabel={t.common.clearFilters}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={showAdvancedFilters}
          onClear={clearFilters}
          onToggleAdvanced={() => setShowAdvancedFilters(current => !current)}
          resultSummary={t.common.results(props.filteredCount)}
          tone="green"
        />
      )}
      title={t.filters.title}
    >
      <IndiceFilterSearch label={t.common.search} onClear={() => props.onSearchChange('')} onValueChange={props.onSearchChange} placeholder={t.providers.filters.searchPlaceholder} tone="green" value={props.searchTerm} />
      <IndiceFilterSelect label={t.providers.filters.type} value={props.typeFilter} options={typeOptions} onValueChange={(value) => props.onTypeChange(value as ProviderType | 'all')} tone="green" />
      <IndiceFilterSelect label={t.filters.status} value={props.statusFilter} options={statusOptions} onValueChange={(value) => props.onStatusChange(value as ProviderStatus | 'all')} tone="green" />
      {showAdvancedFilters ? (
        <IndiceFilterAdvancedSection className="md:col-span-2 xl:col-span-3" gridClassName="xl:grid-cols-2">
          <IndiceFilterSelect label={t.filters.unit} value={props.businessUnitFilter} options={props.businessUnitOptions} onValueChange={props.onBusinessUnitChange} tone="green" />
          <IndiceFilterSelect label={t.filters.business} value={props.businessFilter} options={props.businessOptions} onValueChange={props.onBusinessChange} tone="green" />
        </IndiceFilterAdvancedSection>
      ) : null}
    </IndiceFilterBar>
  );
}
