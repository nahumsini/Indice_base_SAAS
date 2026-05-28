import { Plus } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import type { ProductCategoryConfig } from '../../types/productCategoryTypes';
import type { ProductsTranslations } from '../../translations';
import { productFieldClassName } from './productModalConstants';

export function ProductQuickCategoryInput({
  value,
  categories,
  t,
  onValueChange,
  onCreateCategory,
}: {
  value: string;
  categories: ProductCategoryConfig[];
  t: ProductsTranslations;
  onValueChange: (value: string) => void;
  onCreateCategory: (name: string) => void;
}) {
  const activeCategories = categories.filter((category) => category.isActive);
  const matchingCategory = activeCategories.find(
    (category) => category.value.toLowerCase() === value.trim().toLowerCase() || category.name.toLowerCase() === value.trim().toLowerCase(),
  );
  const canCreate = Boolean(value.trim()) && !matchingCategory;
  const listId = 'product-category-quick-options';

  return (
    <div className="space-y-2 md:col-span-2">
      <label className="text-sm font-bold text-slate-700">{t.form.fields.category}</label>
      <Input
        className={productFieldClassName}
        list={listId}
        value={value}
        placeholder={t.quickCategory.placeholder}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <datalist id={listId}>
        {activeCategories.map((category) => (
          <option key={category.id} value={category.value}>
            {category.name}
          </option>
        ))}
      </datalist>
      {canCreate ? (
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-3 text-sm font-bold text-[#B63B32] hover:bg-[#FF6B5E]/10"
          onClick={() => onCreateCategory(value)}
        >
          <Plus className="h-4 w-4" />
          {t.quickCategory.create(value.trim())}
        </Button>
      ) : activeCategories.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
          {t.quickCategory.empty}
        </p>
      ) : (
        <p className="text-xs font-semibold text-slate-500">{t.quickCategory.helper}</p>
      )}
    </div>
  );
}
