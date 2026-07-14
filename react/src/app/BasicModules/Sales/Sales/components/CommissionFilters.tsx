import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionFiltersState, CommissionOption, CommissionStatus } from '../types/commissions';

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-white">{t.commissions.filters.title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 xl:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.commissions.filters.search}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder={t.commissions.filters.searchPlaceholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-11 text-base font-semibold text-slate-950 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
        <FilterSelect label={t.commissions.filters.unit} value={filters.unit} onValueChange={(value) => updateFilter('unit', value)} options={[{ value: 'all', label: t.commissions.filters.allUnits }, ...units.map((unit) => ({ value: unit.id, label: unit.name }))]} />
        <FilterSelect label={t.commissions.filters.business} value={filters.business} onValueChange={(value) => updateFilter('business', value)} options={[{ value: 'all', label: t.commissions.filters.allBusinesses }, ...businesses.map((business) => ({ value: business.id, label: business.name }))]} />
        <FilterSelect label={t.commissions.filters.period} value={filters.period} onValueChange={(value) => updateFilter('period', value)} options={[
          { value: 'all', label: t.common.all },
          { value: 'today', label: t.filters.periodOptions.today },
          { value: 'this_week', label: t.filters.periodOptions.thisWeek },
          { value: 'this_month', label: t.filters.periodOptions.thisMonth },
          { value: 'last_month', label: t.filters.periodOptions.lastMonth },
        ]} />
        <FilterSelect label={t.commissions.filters.salesRep} value={filters.salesRep} onValueChange={(value) => updateFilter('salesRep', value)} options={[{ value: 'all', label: t.commissions.filters.allSalesReps }, ...salesReps.map((seller) => ({ value: seller, label: seller }))]} />
        <FilterSelect label={t.commissions.filters.product} value={filters.product} onValueChange={(value) => updateFilter('product', value)} options={[{ value: 'all', label: t.commissions.filters.allProducts }, ...products.map((product) => ({ value: product.id, label: product.name }))]} />
        <FilterSelect label={t.commissions.filters.status} value={filters.status} onValueChange={(value) => updateFilter('status', value)} options={[{ value: 'all', label: t.commissions.filters.allStatuses }, ...statuses.map((status) => ({ value: status, label: t.commissions.statuses[status] }))]} />
      </div>
    </section>
  );
}
