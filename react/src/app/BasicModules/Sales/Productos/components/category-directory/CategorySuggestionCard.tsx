import { Checkbox } from '../../../../../components/ui/checkbox';
import type { ProductsTranslations } from '../../translations';
import type { ProductCategoryLibrary } from '../../types/productCategoryTypes';

type CategorySuggestion = ProductCategoryLibrary['categories'][number];

type CategorySuggestionCardProps = {
  category: CategorySuggestion;
  checked: boolean;
  disabled: boolean;
  t: ProductsTranslations;
  onCheckedChange: (checked: boolean) => void;
};

export function CategorySuggestionCard({
  category,
  checked,
  disabled,
  t,
  onCheckedChange,
}: CategorySuggestionCardProps) {
  return (
    <label className={`block rounded-lg border bg-white p-3 transition ${disabled ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/[0.03]'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-5 text-slate-950">{category.name}</p>
            {disabled ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                {t.categoryManager.alreadyInCatalog}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-600">{category.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {category.supportedTypes.map((type) => (
              <span key={type} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {t.typeLabels[type]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </label>
  );
}
