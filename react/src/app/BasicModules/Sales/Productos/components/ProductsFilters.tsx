import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { ProductsTranslations } from '../translations';

type ProductFilterOption = {
  value: string;
  label: string;
};

type ProductsFiltersProps = {
  t: ProductsTranslations;
  search: string;
  categoryFilter: string;
  typeFilter: string;
  statusFilter: string;
  categoryOptions: ProductFilterOption[];
  typeOptions: ProductFilterOption[];
  statusOptions: ProductFilterOption[];
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
};

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ProductFilterOption[];
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

export function ProductsFilters({
  t,
  search,
  categoryFilter,
  typeFilter,
  statusFilter,
  categoryOptions,
  typeOptions,
  statusOptions,
  onSearchChange,
  onCategoryFilterChange,
  onTypeFilterChange,
  onStatusFilterChange,
}: ProductsFiltersProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-white">{t.filters.title}</h3>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.filters.search}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t.filters.searchPlaceholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-11 text-base font-semibold text-slate-950 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
        <FilterSelect
          label={t.filters.category}
          value={categoryFilter}
          onValueChange={onCategoryFilterChange}
          options={categoryOptions}
        />
        <FilterSelect
          label={t.filters.type}
          value={typeFilter}
          onValueChange={onTypeFilterChange}
          options={typeOptions}
        />
        <FilterSelect
          label={t.filters.status}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
          options={statusOptions}
        />
      </div>
    </div>
  );
}

export type { ProductFilterOption };
