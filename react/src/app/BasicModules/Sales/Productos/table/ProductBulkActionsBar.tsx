import { CheckCircle2, EyeOff, Loader2, Power, Tags, X } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
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

type ProductBulkActionsBarProps = {
  selectedCount: number;
  categoryOptions: ProductCategoryOption[];
  selectedCategory: string;
  isApplyingCategory: boolean;
  categoryError: string | null;
  t: ProductsTranslations;
  onCategoryChange: (category: string) => void;
  onApplyCategory: () => void;
  onSetActive: () => void;
  onSetInactive: () => void;
  onMarkAvailableForSales: () => void;
  onRemoveFromPublicCatalog: () => void;
  onClearSelection: () => void;
};

export function ProductBulkActionsBar({
  selectedCount,
  categoryOptions,
  selectedCategory,
  isApplyingCategory,
  categoryError,
  t,
  onCategoryChange,
  onApplyCategory,
  onSetActive,
  onSetInactive,
  onMarkAvailableForSales,
  onRemoveFromPublicCatalog,
  onClearSelection,
}: ProductBulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
          <Badge variant="outline" className="rounded-full border-[#F4C84A]/40 bg-white px-3 py-1 text-[#9A6B05]">
            {t.table.selection.selected(selectedCount)}
          </Badge>
          <span className="text-slate-500">{t.table.selection.bulkActions}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#F4C84A]/40 bg-white p-1">
            <Tags className="ml-1 h-4 w-4 text-[#9A6B05]" aria-hidden="true" />
            <Select
              value={selectedCategory || undefined}
              disabled={isApplyingCategory || categoryOptions.length === 0}
              onValueChange={(value) => {
                if (value !== noCategoriesValue) {
                  onCategoryChange(value);
                }
              }}
            >
              <SelectTrigger
                aria-label={t.table.columns.category}
                className="h-8 w-[210px] rounded-md border-0 bg-transparent text-sm font-medium text-slate-800 shadow-none focus:ring-[#F4C84A]/30"
              >
                <SelectValue placeholder={t.table.columns.category} />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.length === 0 ? (
                  <SelectItem value={noCategoriesValue} disabled>
                    {t.table.selection.noCategories}
                  </SelectItem>
                ) : null}
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md border-[#F4C84A]/50 bg-[#FFF8DF] px-3 text-sm font-medium text-[#7A5707] shadow-none hover:bg-[#FCECB1]"
              disabled={!selectedCategory || isApplyingCategory || categoryOptions.length === 0}
              onClick={onApplyCategory}
            >
              {isApplyingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.columnsModal.apply}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 shadow-none hover:bg-emerald-100"
            disabled={isApplyingCategory}
            onClick={onSetActive}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t.table.selection.setActive}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-100"
            disabled={isApplyingCategory}
            onClick={onSetInactive}
          >
            <Power className="h-4 w-4" />
            {t.table.selection.setInactive}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-[#FF6B5E]/25 bg-white px-3 text-sm font-medium text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10"
            disabled={isApplyingCategory}
            onClick={onMarkAvailableForSales}
          >
            {t.table.selection.markAvailableForSales}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-100"
            disabled={isApplyingCategory}
            onClick={onRemoveFromPublicCatalog}
          >
            <EyeOff className="h-4 w-4" />
            {t.table.selection.removeFromPublicCatalog}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-100"
            disabled={isApplyingCategory}
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
            {t.table.selection.clearSelection}
          </Button>
        </div>
      </div>
      {categoryError ? (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {categoryError}
        </p>
      ) : null}
    </section>
  );
}
