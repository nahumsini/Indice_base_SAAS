import { useMemo } from 'react';
import { IndiceFilterBar, IndiceFilterSearch, IndiceFilterSelect } from '../../../../components/frontend-os';
import { usePaymentAccountsTranslations } from '../hooks/usePaymentAccountsTranslations';

type PaymentAccountsFiltersProps = {
  filteredCount: number;
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  tone?: 'green' | 'coral';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
};

const paymentTypeValues = ['bank', 'cash', 'credit_card', 'debit_card', 'digital_wallet'];

export function PaymentAccountsFilters({
  filteredCount,
  searchTerm,
  statusFilter,
  typeFilter,
  tone = 'green',
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: PaymentAccountsFiltersProps) {
  const t = usePaymentAccountsTranslations();
  const typeOptions = useMemo(() => [
    { value: 'all', label: t.paymentAccounts.filters.allTypes },
    ...paymentTypeValues.map(value => ({
      value,
      label: t.paymentAccounts.types[value] ?? value,
    })),
  ], [t]);
  const statusOptions = useMemo(() => [
    { value: 'all', label: t.common.all },
    { value: 'active', label: t.common.active },
    { value: 'inactive', label: t.common.inactive },
  ], [t]);

  return (
    <IndiceFilterBar gridClassName="md:grid-cols-[minmax(280px,1.4fr)_repeat(2,minmax(0,1fr))]" summary={t.common.results(filteredCount)} title={t.filters.title}>
      <IndiceFilterSearch label={t.common.search} onClear={() => onSearchChange('')} onValueChange={onSearchChange} placeholder={t.paymentAccounts.filters.searchPlaceholder} tone={tone} value={searchTerm} />
      <IndiceFilterSelect label={t.paymentAccounts.filters.type} value={typeFilter} onValueChange={onTypeChange} options={typeOptions} tone={tone} />
      <IndiceFilterSelect label={t.filters.status} value={statusFilter} onValueChange={onStatusChange} options={statusOptions} tone={tone} />
    </IndiceFilterBar>
  );
}
