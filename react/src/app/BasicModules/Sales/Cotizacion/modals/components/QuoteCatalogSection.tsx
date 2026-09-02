import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PackagePlus, Search } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import type { SalesCatalogItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import { getProductSalesReadiness } from '../../../utils/productSalesReadiness';
import { QuoteCatalogCard } from './QuoteCatalogCard';

export function QuoteCatalogSection({
  products,
  t,
  formatCurrency,
  onAddProduct,
}: {
  products: SalesCatalogItem[];
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
  onAddProduct: (product: SalesCatalogItem) => void;
}) {
  const [readinessFilter, setReadinessFilter] = useState('READY');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const visibleProducts = useMemo(
    () => products.filter((product) => {
      const searchable = `${product.name} ${product.sku} ${product.productCode ?? ''} ${product.category}`.toLowerCase();
      return (readinessFilter === 'all' || getProductSalesReadiness(product).status === readinessFilter)
        && (category === 'all' || product.category === category)
        && searchable.includes(query.trim().toLowerCase());
    }),
    [category, products, query, readinessFilter],
  );
  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedProducts = visibleProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => setPage(1), [category, query, readinessFilter]);

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
        <Select value={readinessFilter} onValueChange={setReadinessFilter}>
          <SelectTrigger className="min-h-10 w-full bg-white md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.catalog.readinessFilters.all}</SelectItem>
            <SelectItem value="READY">{t.catalog.readinessFilters.READY}</SelectItem>
            <SelectItem value="REQUIRES_REVIEW">{t.catalog.readinessFilters.REQUIRES_REVIEW}</SelectItem>
            <SelectItem value="NOT_READY">{t.catalog.readinessFilters.NOT_READY}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 bg-white pl-9" placeholder={t.catalog.searchPlaceholder} /></div>
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="min-h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t.catalog.allCategories}</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
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
            />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"><span>{t.catalog.pageSummary(visibleProducts.length, safePage, pageCount)}</span><span className="flex gap-1"><Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight className="h-4 w-4" /></Button></span></div>
    </section>
  );
}
