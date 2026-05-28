import { useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Checkbox } from '../../../../components/ui/checkbox';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import type { SalesCatalogItem } from '../../types';
import { productStatuses, productTypes } from '../../types';
import type { ProductsTranslations } from '../translations';
import { getCategoryLabel } from '../utils/productCategories';
import { isProductReadyForPublicCatalog } from './utils/publicCatalogAdapters';

export function PublicCatalogProductSelector({
  products,
  selectedProductIds,
  selectedCategoryIds,
  t,
  onSelectedProductIdsChange,
  onSelectedCategoryIdsChange,
}: {
  products: SalesCatalogItem[];
  selectedProductIds: string[];
  selectedCategoryIds: string[];
  t: ProductsTranslations;
  onSelectedProductIdsChange: (productIds: string[]) => void;
  onSelectedCategoryIdsChange: (categoryIds: string[]) => void;
}) {
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))), [products]);
  const readyProducts = useMemo(() => products.filter(isProductReadyForPublicCatalog), [products]);
  const visibleProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch = !normalizedSearch || [product.name, product.sku, product.category, product.type, product.description]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      const matchesType = typeFilter === 'all' || product.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }, [categoryFilter, productSearch, products, statusFilter, typeFilter]);

  const toggleProduct = (productId: string) => {
    onSelectedProductIdsChange(
      selectedProductIds.includes(productId)
        ? selectedProductIds.filter((id) => id !== productId)
        : [...selectedProductIds, productId],
    );
  };

  const toggleCategory = (category: string) => {
    onSelectedCategoryIdsChange(
      selectedCategoryIds.includes(category)
        ? selectedCategoryIds.filter((id) => id !== category)
        : [...selectedCategoryIds, category],
    );
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">{t.publicCatalog.productSelection}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{t.publicCatalog.selectedProducts(selectedProductIds.length)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-[#FF6B5E]/25 text-[#B63B32]"
          onClick={() => {
            onSelectedProductIdsChange(readyProducts.map((product) => product.id));
            onSelectedCategoryIdsChange(Array.from(new Set(readyProducts.map((product) => product.category))));
          }}
        >
          {t.publicCatalog.selectReadyItems}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`rounded-full border px-3 py-1.5 text-sm font-black ${selectedCategoryIds.includes(category) ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32]' : 'border-slate-200 bg-white text-slate-600'}`}
            onClick={() => toggleCategory(category)}
          >
            {getCategoryLabel(category, t)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
        <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder={t.publicCatalog.productSearchPlaceholder} />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filters.allCategories}</SelectItem>
            {categories.map((category) => <SelectItem key={category} value={category}>{getCategoryLabel(category, t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filters.allTypes}</SelectItem>
            {productTypes.map((type) => <SelectItem key={type} value={type}>{t.typeLabels[type]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filters.allStatuses}</SelectItem>
            {productStatuses.map((status) => <SelectItem key={status} value={status}>{t.statusLabels[status]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {visibleProducts.map((product) => (
          <label key={product.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <Checkbox checked={selectedProductIds.includes(product.id)} onCheckedChange={() => toggleProduct(product.id)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-black text-slate-950">{product.name}</span>
              <span className="block text-xs font-semibold text-slate-500">{product.sku} - {t.typeLabels[product.type]}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
