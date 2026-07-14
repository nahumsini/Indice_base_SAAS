import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryOption } from '../utils/productCategories';

const noCategoriesValue = '__no_categories__';

type ProductInlineCategorySelectProps = {
  value: string;
  options: ProductCategoryOption[];
  t: ProductsTranslations;
  onValueChange: (value: string) => void;
};

export function ProductInlineCategorySelect({
  value,
  options,
  t,
  onValueChange,
}: ProductInlineCategorySelectProps) {
  const hasOptions = options.length > 0;
  const currentValueIsAvailable = options.some((option) => option.value === value);
  const fallbackOption = value.trim() ? { value, label: value } : null;
  const resolvedOptions = fallbackOption && !currentValueIsAvailable
    ? [fallbackOption, ...options]
    : options;
  const selectValue = resolvedOptions.some((option) => option.value === value) ? value : noCategoriesValue;

  return (
    <Select
      value={selectValue}
      disabled={!hasOptions && !fallbackOption}
      onValueChange={(nextValue) => {
        if (nextValue !== noCategoriesValue) {
          onValueChange(nextValue);
        }
      }}
    >
      <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-none focus:ring-[#FF6B5E]/20 disabled:opacity-70">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!hasOptions && !fallbackOption ? (
          <SelectItem value={noCategoriesValue} disabled>
            {t.table.selection.noCategories}
          </SelectItem>
        ) : null}
        {resolvedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
