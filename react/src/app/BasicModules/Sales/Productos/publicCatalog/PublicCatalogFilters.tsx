import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import type { SalesProductCategory, SalesProductType } from '../../types';
import type { ProductsTranslations } from '../translations';
import { getCategoryLabel } from '../utils/productCategories';

export function PublicCatalogFilters({
  search,
  category,
  type,
  categories,
  types,
  resultCount,
  t,
  onSearchChange,
  onCategoryChange,
  onTypeChange,
}: {
  search: string;
  category: string;
  type: string;
  categories: SalesProductCategory[];
  types: SalesProductType[];
  resultCount: number;
  t: ProductsTranslations;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}) {
  const selectClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[var(--catalog-accent)] dark:border-slate-700 dark:bg-slate-950 dark:text-white';

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="relative min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{t.filters.search}</span>
          <Search className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t.publicCatalog.searchPlaceholder}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-base dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        {categories.length > 0 ? (
          <label className="w-52 shrink-0">
            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{t.filters.category}</span>
            <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className={selectClassName}>
              <option value="all">{t.filters.allCategories}</option>
              {categories.map((itemCategory) => <option key={itemCategory} value={itemCategory}>{getCategoryLabel(itemCategory, t)}</option>)}
            </select>
          </label>
        ) : null}
        {types.length > 0 ? (
          <label className="w-48 shrink-0">
            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{t.filters.type}</span>
            <select value={type} onChange={(event) => onTypeChange(event.target.value)} className={selectClassName}>
              <option value="all">{t.filters.allTypes}</option>
              {types.map((itemType) => <option key={itemType} value={itemType}>{t.typeLabels[itemType]}</option>)}
            </select>
          </label>
        ) : null}
        <div className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--catalog-accent-soft)] px-3 text-xs font-medium text-[var(--catalog-accent-ink)]">
          <SlidersHorizontal className="h-4 w-4" />
          {t.publicCatalog.productsFound(resultCount)}
        </div>
      </div>
    </section>
  );
}
