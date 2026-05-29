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
import type { SalesFiltersState } from '../types/salesTypes';

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
  const periodOptions = [
    { value: 'all', label: t.common.all },
    { value: 'today', label: t.filters.periodOptions.today },
    { value: 'this_week', label: t.filters.periodOptions.thisWeek },
    { value: 'this_month', label: t.filters.periodOptions.thisMonth },
    { value: 'last_month', label: t.filters.periodOptions.lastMonth },
    { value: 'custom', label: t.filters.periodOptions.custom, disabled: true },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-white">{t.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2 xl:col-span-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.filters.search}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder={t.filters.searchPlaceholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-slate-900 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <FilterSelect label={t.filters.businessUnit} value={filters.businessUnit} onValueChange={(value) => updateFilter('businessUnit', value)} options={[{ value: 'all', label: t.common.all }, ...businessUnits.map((unit) => ({ value: unit.id, label: unit.name }))]} />
        <FilterSelect label={t.filters.business} value={filters.business} onValueChange={(value) => updateFilter('business', value)} options={[{ value: 'all', label: t.common.all }, ...businessOptions.map((business) => ({ value: business.id, label: business.name }))]} />
        <FilterSelect label={t.filters.period} value={filters.period} onValueChange={(value) => updateFilter('period', value)} options={periodOptions} />
        <FilterSelect label={t.filters.seller} value={filters.seller} onValueChange={(value) => updateFilter('seller', value)} options={[{ value: 'all', label: t.common.all }, ...sellers.map((seller) => ({ value: seller, label: seller }))]} />
        <FilterSelect label={t.filters.customer} value={filters.customer} onValueChange={(value) => updateFilter('customer', value)} options={[{ value: 'all', label: t.common.all }, ...customers.map((customer) => ({ value: customer, label: customer }))]} />
      </div>
    </section>
  );
}
