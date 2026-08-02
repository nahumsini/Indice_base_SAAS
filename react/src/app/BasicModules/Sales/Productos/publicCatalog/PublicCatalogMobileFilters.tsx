import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import type { SalesProductCategory, SalesProductType } from '../../types';
import type { ProductsTranslations } from '../translations';
import { getCategoryLabel } from '../utils/productCategories';

export function PublicCatalogMobileFilters({
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
  const chipClassName = (active: boolean) => (
    `h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition ${active
      ? 'border-[#FF6B5E] bg-[#FF6B5E] text-[#222831] shadow-sm'
      : 'border-slate-200 bg-white text-slate-600 hover:border-[#FF6B5E]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`
  );

  return (
    <section className="sticky top-0 z-20 w-full min-w-0 overflow-hidden border-b border-slate-200 bg-white/95 px-3 pb-3 pt-3 shadow-[0_8px_24px_rgba(15,23,42,.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-4">
      <label className="relative block">
        <span className="sr-only">{t.filters.search}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t.publicCatalog.searchPlaceholder}
          className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-base shadow-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      {categories.length > 0 ? (
        <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-4 sm:px-4">
          <button type="button" className={chipClassName(category === 'all')} onClick={() => onCategoryChange('all')}>
            {t.filters.allCategories}
          </button>
          {categories.map((itemCategory) => (
            <button key={itemCategory} type="button" className={chipClassName(category === itemCategory)} onClick={() => onCategoryChange(itemCategory)}>
              {getCategoryLabel(itemCategory, t)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t.publicCatalog.productsFound(resultCount)}
        </p>
        {types.length > 1 ? (
          <select
            aria-label={t.filters.type}
            value={type}
            onChange={(event) => onTypeChange(event.target.value)}
            className="h-9 max-w-[170px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">{t.filters.allTypes}</option>
            {types.map((itemType) => <option key={itemType} value={itemType}>{t.typeLabels[itemType]}</option>)}
          </select>
        ) : null}
      </div>
    </section>
  );
}
