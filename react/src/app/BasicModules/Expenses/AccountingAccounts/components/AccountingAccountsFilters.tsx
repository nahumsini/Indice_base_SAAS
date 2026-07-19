import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from '../../../../components/frontend-os';
import { typeOptions } from '../accountingAccounts.utils';
import { useAccountingAccountsTranslations } from '../hooks/useAccountingAccountsTranslations';

type AccountingAccountsFiltersProps = {
  filteredCount: number;
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
};

export function AccountingAccountsFilters({
  filteredCount,
  searchTerm,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: AccountingAccountsFiltersProps) {
  const t = useAccountingAccountsTranslations();
  const localizedTypeOptions = typeOptions.map(option => ({
    ...option,
    label: t.accountingAccounts.types[option.value] ?? option.label,
  }));

  return (
    <IndiceFilterBar gridClassName="md:grid-cols-[minmax(280px,1.4fr)_repeat(2,minmax(0,1fr))]" summary={t.common.results(filteredCount)} title={t.filters.title}>
      <IndiceFilterSearch label={t.common.search} onClear={() => onSearchChange('')} onValueChange={onSearchChange} placeholder={t.accountingAccounts.filters.searchPlaceholder} tone="green" value={searchTerm} />
      <IndiceFilterSelect label={t.accountingAccounts.filters.type} value={typeFilter} onValueChange={onTypeChange} options={[{ value: 'all', label: t.accountingAccounts.filters.allTypes }, ...localizedTypeOptions]} tone="green" />
      <IndiceFilterSelect label={t.filters.status} value={statusFilter} onValueChange={onStatusChange} options={[{ value: 'all', label: t.common.all }, { value: 'active', label: t.common.active }, { value: 'inactive', label: t.common.inactive }]} tone="green" />
    </IndiceFilterBar>
  );
}
