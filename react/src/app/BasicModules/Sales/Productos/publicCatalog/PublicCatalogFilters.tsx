import { Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import type { SalesProductCategory, SalesProductType } from '../../types';
import type { ProductsTranslations } from '../translations';
import { getCategoryLabel } from '../utils/productCategories';

export function PublicCatalogFilters({
  search,
  category,
  type,
  categories,
  types,
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
  t: ProductsTranslations;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.5fr)_minmax(180px,0.5fr)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t.publicCatalog.searchPlaceholder}
              className="h-11 rounded-lg border-slate-200 bg-white pl-11 text-base font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
            />
          </div>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.filters.allCategories}</SelectItem>
              {categories.map((itemCategory) => (
                <SelectItem key={itemCategory} value={itemCategory}>{getCategoryLabel(itemCategory, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.filters.allTypes}</SelectItem>
              {types.map((itemType) => (
                <SelectItem key={itemType} value={itemType}>{t.typeLabels[itemType]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
