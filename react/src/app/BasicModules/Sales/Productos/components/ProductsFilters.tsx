import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
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
    <SalesFilterBar
      title={t.filters.title}
      gridClassName="lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]"
    >
      <SalesFilterSearch
        label={t.filters.search}
        value={search}
        onValueChange={onSearchChange}
        placeholder={t.filters.searchPlaceholder}
      />
      <SalesFilterSelect
        label={t.filters.status}
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={statusOptions}
      />
      <SalesFilterSelect
        label={t.filters.category}
        value={categoryFilter}
        onValueChange={onCategoryFilterChange}
        options={categoryOptions}
      />
      <SalesFilterSelect
        label={t.filters.type}
        value={typeFilter}
        onValueChange={onTypeFilterChange}
        options={typeOptions}
      />
    </SalesFilterBar>
  );
}

export type { ProductFilterOption };
