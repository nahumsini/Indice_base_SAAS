import type { ReactNode } from 'react';
import { Copy, Images, PencilLine, Power, Trash2 } from 'lucide-react';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  TableCell,
  TableRow,
} from '../../../../components/ui/table';
import { cn } from '../../../../components/ui/utils';
import type { SalesCatalogItem } from '../../types';
import { ProductHealthIndicators } from '../components/ProductHealthIndicators';
import { ProductOperationalChips } from '../components/ProductOperationalChips';
import { ProductThumbnail } from '../components/ProductThumbnail';
import { ProductVisibilityBadge } from '../components/ProductVisibilityBadge';
import type { ProductsTranslations } from '../translations';
import type { ProductTableColumnId } from './ProductsColumnsModal';
import { formatProductCurrency, getProductMargin } from '../utils/productFormatters';
import { getProductProfit } from '../utils/productOperationalStatus';
import type { ProductCategoryOption } from '../utils/productCategories';
import { ProductInlineCategorySelect } from './ProductInlineCategorySelect';
import { ProductInlineStatusSelect } from './ProductInlineStatusSelect';

type ProductTableRowProps = {
  product: SalesCatalogItem;
  selected: boolean;
  visibleColumns: ProductTableColumnId[];
  categoryOptions: ProductCategoryOption[];
  t: ProductsTranslations;
  onSelectionChange: (checked: boolean) => void;
  onViewProduct: (product: SalesCatalogItem) => void;
  onEditProduct: (product: SalesCatalogItem) => void;
  onDuplicateProduct: (product: SalesCatalogItem) => void;
  onDeleteProduct: (product: SalesCatalogItem) => void;
  onToggleProductStatus: (product: SalesCatalogItem) => void;
  onUpdateProductCategory: (product: SalesCatalogItem, category: string) => void;
  onUpdateProductStatus: (product: SalesCatalogItem, status: SalesCatalogItem['status']) => void;
};

function CatalogAction({
  label,
  icon,
  className,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/20',
        className,
      )}
    >
      {icon}
    </button>
  );
}

export function ProductTableRow({
  product,
  selected,
  visibleColumns,
  categoryOptions,
  t,
  onSelectionChange,
  onViewProduct,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onToggleProductStatus,
  onUpdateProductCategory,
  onUpdateProductStatus,
}: ProductTableRowProps) {
  return (
    <TableRow
      className={cn(
        'border-slate-200 align-middle transition-colors hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-700/40',
        selected && 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/20',
      )}
    >
      <TableCell className="w-[56px] px-5 py-4 align-middle">
        <Checkbox
          aria-label={t.table.selection.selectRow(product.name)}
          checked={selected}
          className="border-slate-300 data-[state=checked]:border-[#FF6B5E] data-[state=checked]:bg-[#FF6B5E]"
          onCheckedChange={(checked) => onSelectionChange(checked === true)}
        />
      </TableCell>
      <TableCell className="w-[88px] px-5 py-4 align-middle">
        <ProductThumbnail product={product} size="md" />
      </TableCell>
      <TableCell className="px-5 py-4 align-middle">
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950 dark:text-white">{product.name}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{product.sku}</p>
          <p className="mt-1 line-clamp-2 max-w-[320px] text-sm leading-5 text-slate-500">{product.description}</p>
          <div className="mt-2">
            <ProductHealthIndicators product={product} t={t} limit={2} />
          </div>
        </div>
      </TableCell>
      {visibleColumns.includes('sku') ? (
        <TableCell className="truncate px-5 py-4 align-middle font-semibold text-slate-700 dark:text-slate-300">{product.sku}</TableCell>
      ) : null}
      {visibleColumns.includes('category') ? (
        <TableCell className="px-5 py-4 align-middle">
          <ProductInlineCategorySelect
            value={product.category}
            options={categoryOptions}
            t={t}
            onValueChange={(category) => onUpdateProductCategory(product, category)}
          />
        </TableCell>
      ) : null}
      {visibleColumns.includes('type') ? (
        <TableCell className="truncate px-5 py-4 align-middle font-semibold text-slate-700 dark:text-slate-300">{t.typeLabels[product.type]}</TableCell>
      ) : null}
      {visibleColumns.includes('price') ? (
        <TableCell className="truncate px-5 py-4 align-middle font-black text-slate-950 dark:text-white">{formatProductCurrency(product.price, product.currency)}</TableCell>
      ) : null}
      {visibleColumns.includes('cost') ? (
        <TableCell className="truncate px-5 py-4 align-middle font-semibold text-slate-600 dark:text-slate-300">{formatProductCurrency(product.cost, product.currency)}</TableCell>
      ) : null}
      {visibleColumns.includes('profit') ? (
        <TableCell className="px-5 py-4 align-middle">
          <p className="font-black text-[#177d66]">{formatProductCurrency(getProductProfit(product), product.currency)}</p>
          <p className="mt-1 text-xs font-bold text-[#B63B32]">{getProductMargin(product)}%</p>
        </TableCell>
      ) : null}
      {visibleColumns.includes('status') ? (
        <TableCell className="px-5 py-4 align-middle">
          <ProductInlineStatusSelect
            value={product.status}
            t={t}
            onValueChange={(status) => onUpdateProductStatus(product, status)}
          />
        </TableCell>
      ) : null}
      {visibleColumns.includes('visibility') ? (
        <TableCell className="px-5 py-4 align-middle">
          <ProductVisibilityBadge visibility={product.visibility} t={t} compact />
        </TableCell>
      ) : null}
      {visibleColumns.includes('availableIn') ? (
        <TableCell className="px-5 py-4 align-middle">
          <ProductOperationalChips product={product} t={t} compact />
        </TableCell>
      ) : null}
      {visibleColumns.includes('lastUpdated') ? (
        <TableCell className="truncate px-5 py-4 align-middle font-semibold text-slate-600 dark:text-slate-300">{product.lastUpdated}</TableCell>
      ) : null}
      <TableCell className="px-5 py-4 align-middle">
        <div className="flex items-center justify-end gap-2">
          <CatalogAction label={t.actions.viewImages} icon={<Images className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15" onClick={() => onViewProduct(product)} />
          <CatalogAction label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => onEditProduct(product)} />
          <CatalogAction label={t.actions.duplicate} icon={<Copy className="h-4 w-4" />} className="border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05] hover:bg-[#F4C84A]/20" onClick={() => onDuplicateProduct(product)} />
          <CatalogAction label={product.status === 'Active' ? t.actions.deactivate : t.actions.activate} icon={<Power className="h-4 w-4" />} className="border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/15" onClick={() => onToggleProductStatus(product)} />
          <CatalogAction label={t.actions.delete} icon={<Trash2 className="h-4 w-4" />} className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100" onClick={() => onDeleteProduct(product)} />
        </div>
      </TableCell>
    </TableRow>
  );
}
