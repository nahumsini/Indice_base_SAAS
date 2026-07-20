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
    <label className={`block min-w-0 rounded-lg border px-3 py-2.5 transition ${disabled ? 'border-transparent bg-slate-50 opacity-60' : checked ? 'border-[#FF6B5E]/30 bg-[#FF6B5E]/[0.04]' : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold leading-5 text-slate-900">{category.name}</p>
            {disabled ? (
              <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {t.categoryManager.alreadyInCatalog}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-500">{category.description}</p>
          <div className="mt-1.5 flex min-w-0 flex-wrap gap-1">
            {category.supportedTypes.map((type) => (
              <span key={type} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {t.typeLabels[type]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </label>
  );
}
