import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionFiltersState, CommissionOption, CommissionStatus } from '../types/commissions';

export function CommissionFilters({
  filters,
  units,
  businesses,
  salesReps,
  products,
  t,
  onFiltersChange,
}: {
  filters: CommissionFiltersState;
  units: CommissionOption[];
  businesses: CommissionOption[];
  salesReps: string[];
  products: CommissionOption[];
  t: SalesRecordsTranslations;
  onFiltersChange: (filters: CommissionFiltersState) => void;
}) {
  const updateFilter = (key: keyof CommissionFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const statuses: CommissionStatus[] = ['pending', 'approved', 'paid', 'cancelled'];

  return (
    <SalesFilterBar title={t.commissions.filters.title} gridClassName="xl:grid-cols-4 2xl:grid-cols-8">
      <SalesFilterSearch
        className="md:col-span-2"
        label={t.commissions.filters.search}
        value={filters.search}
        onValueChange={(value) => updateFilter('search', value)}
        placeholder={t.commissions.filters.searchPlaceholder}
      />
      <SalesFilterSelect
        label={t.commissions.filters.unit}
        value={filters.unit}
        onValueChange={(value) => updateFilter('unit', value)}
        options={[{ value: 'all', label: t.commissions.filters.allUnits }, ...units.map((unit) => ({ value: unit.id, label: unit.name }))]}
      />
      <SalesFilterSelect
        label={t.commissions.filters.business}
        value={filters.business}
        onValueChange={(value) => updateFilter('business', value)}
        options={[{ value: 'all', label: t.commissions.filters.allBusinesses }, ...businesses.map((business) => ({ value: business.id, label: business.name }))]}
      />
      <SalesFilterSelect
        label={t.commissions.filters.period}
        value={filters.period}
        onValueChange={(value) => updateFilter('period', value)}
        options={[
          { value: 'all', label: t.common.all },
          { value: 'today', label: t.filters.periodOptions.today },
          { value: 'this_week', label: t.filters.periodOptions.thisWeek },
          { value: 'this_month', label: t.filters.periodOptions.thisMonth },
          { value: 'last_month', label: t.filters.periodOptions.lastMonth },
        ]}
      />
      <SalesFilterSelect
        label={t.commissions.filters.status}
        value={filters.status}
        onValueChange={(value) => updateFilter('status', value)}
        options={[{ value: 'all', label: t.commissions.filters.allStatuses }, ...statuses.map((status) => ({ value: status, label: t.commissions.statuses[status] }))]}
      />
      <SalesFilterSelect
        label={t.commissions.filters.salesRep}
        value={filters.salesRep}
        onValueChange={(value) => updateFilter('salesRep', value)}
        options={[{ value: 'all', label: t.commissions.filters.allSalesReps }, ...salesReps.map((seller) => ({ value: seller, label: seller }))]}
      />
      <SalesFilterSelect
        label={t.commissions.filters.product}
        value={filters.product}
        onValueChange={(value) => updateFilter('product', value)}
        options={[{ value: 'all', label: t.commissions.filters.allProducts }, ...products.map((product) => ({ value: product.id, label: product.name }))]}
      />
    </SalesFilterBar>
  );
}
