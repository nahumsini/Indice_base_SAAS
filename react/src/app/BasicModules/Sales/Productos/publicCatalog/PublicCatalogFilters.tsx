import type { SalesProductCategory, SalesProductType } from '../../types';
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
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
      <SalesFilterBar
        title={t.filters.title}
        gridClassName="md:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.5fr)_minmax(180px,0.5fr)]"
      >
        <SalesFilterSearch
          label={t.filters.search}
          value={search}
          onValueChange={onSearchChange}
          placeholder={t.publicCatalog.searchPlaceholder}
        />
        <SalesFilterSelect
          label={t.filters.category}
          value={category}
          onValueChange={onCategoryChange}
          options={[
            { value: 'all', label: t.filters.allCategories },
            ...categories.map((itemCategory) => ({
              value: itemCategory,
              label: getCategoryLabel(itemCategory, t),
            })),
          ]}
        />
        <SalesFilterSelect
          label={t.filters.type}
          value={type}
          onValueChange={onTypeChange}
          options={[
            { value: 'all', label: t.filters.allTypes },
            ...types.map((itemType) => ({ value: itemType, label: t.typeLabels[itemType] })),
          ]}
        />
      </SalesFilterBar>
    </section>
  );
}
