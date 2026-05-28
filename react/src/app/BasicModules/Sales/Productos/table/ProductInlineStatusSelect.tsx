import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { productStatusClasses } from '../utils/productStyles';

type InlineStatusValue = 'Active' | 'Inactive';

type ProductInlineStatusSelectProps = {
  value: SalesCatalogItem['status'];
  t: ProductsTranslations;
  onValueChange: (value: InlineStatusValue) => void;
};

export function ProductInlineStatusSelect({
  value,
  t,
  onValueChange,
}: ProductInlineStatusSelectProps) {
  const selectValue: InlineStatusValue = value === 'Active' ? 'Active' : 'Inactive';

  return (
    <Select value={selectValue} onValueChange={(nextValue) => onValueChange(nextValue as InlineStatusValue)}>
      <SelectTrigger
        className={cn(
          'h-10 w-full rounded-xl border px-3 text-sm font-bold shadow-none focus:ring-[#FF6B5E]/20',
          productStatusClasses[selectValue],
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(['Active', 'Inactive'] as InlineStatusValue[]).map((status) => (
          <SelectItem key={status} value={status}>
            {t.statusLabels[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
