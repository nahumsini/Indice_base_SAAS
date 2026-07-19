import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from '../../../../components/frontend-os';
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
    <IndiceFilterBar gridClassName="xl:grid-cols-[minmax(280px,1.4fr)_repeat(4,minmax(0,1fr))]" summary={t.common.results(props.filteredCount)} title={t.filters.title}>
      <IndiceFilterSearch label={t.common.search} onClear={() => props.onSearchChange('')} onValueChange={props.onSearchChange} placeholder={t.providers.filters.searchPlaceholder} tone="green" value={props.searchTerm} />
      <IndiceFilterSelect label={t.providers.filters.type} value={props.typeFilter} options={typeOptions} onValueChange={(value) => props.onTypeChange(value as ProviderType | 'all')} tone="green" />
      <IndiceFilterSelect label={t.filters.unit} value={props.businessUnitFilter} options={props.businessUnitOptions} onValueChange={props.onBusinessUnitChange} tone="green" />
      <IndiceFilterSelect label={t.filters.business} value={props.businessFilter} options={props.businessOptions} onValueChange={props.onBusinessChange} tone="green" />
      <IndiceFilterSelect label={t.filters.status} value={props.statusFilter} options={statusOptions} onValueChange={(value) => props.onStatusChange(value as ProviderStatus | 'all')} tone="green" />
    </IndiceFilterBar>
  );
}
