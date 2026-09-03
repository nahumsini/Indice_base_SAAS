import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PackagePlus, Search } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { SalesCatalogItem } from '../../../types';
import type { InventoryStockRow, InventoryWarehouse } from '../../../Inventory/types/inventoryTypes';
import type { QuotesTranslations } from '../../translations';
import { getProductSalesReadiness } from '../../../utils/productSalesReadiness';
import { QuoteCatalogCard } from './QuoteCatalogCard';

export function QuoteCatalogSection({
  products,
  t,
  formatCurrency,
  onAddProduct,
  warehouses,
  stockRows,
  selectedWarehouseId,
  onWarehouseChange,
}: {
  products: SalesCatalogItem[];
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
  onAddProduct: (product: SalesCatalogItem) => void;
  warehouses: InventoryWarehouse[];
  stockRows: InventoryStockRow[];
  selectedWarehouseId: string;
  onWarehouseChange: (warehouseId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const visibleProducts = useMemo(
    () => products.filter((product) => {
      const searchable = `${product.name} ${product.sku} ${product.productCode ?? ''} ${product.category}`.toLowerCase();
      const usesInventory = product.stockPrepared;
      const warehouseDistribution = usesInventory && selectedWarehouseId
        ? stockRows.find((row) => row.productId === product.id)?.distributions
          .find((item) => item.warehouseId === selectedWarehouseId)
        : undefined;
      const availableForSelectedWarehouse = !usesInventory
        || Boolean(selectedWarehouseId && warehouseDistribution && warehouseDistribution.available > 0);
      return getProductSalesReadiness(product).reasons.every((reason) => reason === 'MISSING_PRICE')
        && availableForSelectedWarehouse
        && searchable.includes(query.trim().toLowerCase());
    }),
    [products, query, selectedWarehouseId, stockRows],
  );
  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedProducts = visibleProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => setPage(1), [query, selectedWarehouseId]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-medium text-slate-950">
            <PackagePlus className="h-5 w-5 text-[#B63B32]" />
            {t.sections.catalogTitle}
          </h3>
          <p className="mt-1 text-sm font-normal leading-6 text-slate-500">{t.catalog.description}</p>
        </div>
        <div className="w-full md:w-72">
          <p className="mb-1.5 text-xs font-medium text-slate-600">{t.catalog.selectWarehouse}</p>
          <Select value={selectedWarehouseId || undefined} onValueChange={onWarehouseChange}>
            <SelectTrigger className="min-h-10 w-full bg-white"><SelectValue placeholder={t.catalog.selectWarehouse} /></SelectTrigger>
            <SelectContent>
              {warehouses.filter((warehouse) => warehouse.status === 'active').map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 bg-white pl-9" placeholder={t.catalog.searchPlaceholder} /></div>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
          {t.catalog.empty}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {pagedProducts.map((product) => (
            <QuoteCatalogCard
              key={product.id}
              product={product}
              t={t}
              formatCurrency={formatCurrency}
              onAdd={() => onAddProduct(product)}
              selectedWarehouseId={selectedWarehouseId}
              distribution={stockRows.find((row) => row.productId === product.id)?.distributions.find((item) => item.warehouseId === selectedWarehouseId)}
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"><span>{t.catalog.pageSummary(visibleProducts.length, safePage, pageCount)}</span><span className="flex gap-1"><Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight className="h-4 w-4" /></Button></span></div>
    </section>
  );
}
