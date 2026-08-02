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

const inlineStatusValues: SalesCatalogItem['status'][] = ['Active', 'Inactive', 'Draft'];

type ProductInlineStatusSelectProps = {
  value: SalesCatalogItem['status'];
  t: ProductsTranslations;
  onValueChange: (value: SalesCatalogItem['status']) => void;
};

export function ProductInlineStatusSelect({
  value,
  t,
  onValueChange,
}: ProductInlineStatusSelectProps) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as SalesCatalogItem['status'])}>
      <SelectTrigger
        className={cn(
          'h-10 w-full rounded-lg border px-3 text-sm font-medium shadow-none focus:ring-[#FF6B5E]/20',
          productStatusClasses[value],
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {inlineStatusValues.map((status) => (
          <SelectItem key={status} value={status}>
            {t.statusLabels[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
