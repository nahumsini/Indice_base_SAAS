import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
import type { SalesRecordsTranslations } from '../translations';
import type { SalesFiltersState, SalesFocusFilter } from '../types/salesTypes';

export function SalesFilters({
  filters,
  businessUnits,
  businesses,
  sellers,
  customers,
  t,
  onFiltersChange,
}: {
  filters: SalesFiltersState;
  businessUnits: Array<{ id: string; name: string }>;
  businesses: Array<{ id: string; name: string; businessUnitId: string }>;
  sellers: string[];
  customers: string[];
  t: SalesRecordsTranslations;
  onFiltersChange: (filters: SalesFiltersState) => void;
}) {
  const updateFilter = (key: keyof SalesFiltersState, value: string) => {
    if (key === 'businessUnit') {
      onFiltersChange({ ...filters, businessUnit: value, business: 'all' });
      return;
    }

    onFiltersChange({ ...filters, [key]: value });
  };
  const businessOptions = businesses.filter((business) => filters.businessUnit === 'all' || business.businessUnitId === filters.businessUnit);
  const focusOptions: Array<{ value: SalesFocusFilter; label: string }> = [
    { value: 'all', label: t.filters.focusOptions.all },
    { value: 'open', label: t.filters.focusOptions.open },
    { value: 'pending_finance', label: t.filters.focusOptions.pendingFinance },
    { value: 'pending_inventory', label: t.filters.focusOptions.pendingInventory },
    { value: 'to_deliver', label: t.filters.focusOptions.toDeliver },
    { value: 'delivered', label: t.filters.focusOptions.delivered },
    { value: 'cancelled', label: t.filters.focusOptions.cancelled },
    { value: 'at_risk', label: t.filters.focusOptions.atRisk },
  ];
  const periodOptions = [
    { value: 'all', label: t.common.all },
    { value: 'today', label: t.filters.periodOptions.today },
    { value: 'this_week', label: t.filters.periodOptions.thisWeek },
    { value: 'this_month', label: t.filters.periodOptions.thisMonth },
    { value: 'last_month', label: t.filters.periodOptions.lastMonth },
    { value: 'custom', label: t.filters.periodOptions.custom, disabled: true },
  ];

  return (
    <SalesFilterBar title={t.filters.title} gridClassName="xl:grid-cols-4 2xl:grid-cols-8">
      <SalesFilterSearch
        className="md:col-span-2"
        label={t.filters.search}
        value={filters.search}
        onValueChange={(value) => updateFilter('search', value)}
        placeholder={t.filters.searchPlaceholder}
      />
      <SalesFilterSelect
        label={t.filters.businessUnit}
        value={filters.businessUnit}
        onValueChange={(value) => updateFilter('businessUnit', value)}
        options={[{ value: 'all', label: t.common.all }, ...businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))]}
      />
      <SalesFilterSelect
        label={t.filters.business}
        value={filters.business}
        onValueChange={(value) => updateFilter('business', value)}
        options={[{ value: 'all', label: t.common.all }, ...businessOptions.map((business) => ({ value: business.id, label: business.name }))]}
      />
      <SalesFilterSelect
        label={t.filters.period}
        value={filters.period}
        onValueChange={(value) => updateFilter('period', value)}
        options={periodOptions}
      />
      <SalesFilterSelect
        label={t.filters.focus}
        value={filters.focus}
        onValueChange={(value) => updateFilter('focus', value)}
        options={focusOptions}
      />
      <SalesFilterSelect
        label={t.filters.seller}
        value={filters.seller}
        onValueChange={(value) => updateFilter('seller', value)}
        options={[{ value: 'all', label: t.common.all }, ...sellers.map((seller) => ({ value: seller, label: seller }))]}
      />
      <SalesFilterSelect
        label={t.filters.customer}
        value={filters.customer}
        onValueChange={(value) => updateFilter('customer', value)}
        options={[{ value: 'all', label: t.common.all }, ...customers.map((customer) => ({ value: customer, label: customer }))]}
      />
    </SalesFilterBar>
  );
}
