import { useMemo, useState } from 'react';
import { Boxes, PackageSearch, Search, Sparkles, X } from 'lucide-react';
import type { Product } from '../../shared/commercial/products';
import { getProductStockState } from '../utils/saleCatalog';

interface QuickProductsPanelProps {
  categories: string[];
  filteredQuickProducts: Product[];
  selectedCategory: string;
  selectedQuickQuantity: number;
  blockSalesWithoutStock: boolean;
  onSelectCategory: (category: string) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  formatCurrency: (amount: number) => string;
}

export function QuickProductsPanel({
  categories,
  filteredQuickProducts,
  selectedCategory,
  selectedQuickQuantity,
  blockSalesWithoutStock,
  onSelectCategory,
  onAddToCart,
  formatCurrency,
}: QuickProductsPanelProps) {
  const [quickSearch, setQuickSearch] = useState('');
  const normalizedQuickSearch = quickSearch.trim().toLowerCase();
  const visibleQuickProducts = useMemo(() => {
    if (!normalizedQuickSearch) {
      return filteredQuickProducts;
    }

    return filteredQuickProducts.filter((product) => {
      const searchableValue = [
        product.name,
        product.sku,
        product.barcode,
        product.department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableValue.includes(normalizedQuickSearch);
    });
  }, [filteredQuickProducts, normalizedQuickSearch]);

  return (
    <div className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border border-[#222831]/10 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-[#222831]/10 bg-[#222831] px-5 py-4 text-white dark:border-gray-700 dark:bg-[#111827]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FF6B5E]/20 text-white dark:bg-[#FF6B5E]/15" aria-hidden="true">
              <Sparkles className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xl font-medium text-white">Productos rapidos</h3>
              <p className="mt-1 text-sm font-medium text-gray-300">
                Toca un producto o usa teclas 1-9 para agregarlo al ticket.
              </p>
            </div>
          </div>
          {selectedQuickQuantity > 1 && (
            <span className="rounded-lg bg-[#F4C84A] px-4 py-2 text-sm font-medium text-[#222831]">
              x{selectedQuickQuantity}
            </span>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 bg-[#F7F8FA] px-5 py-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  aria-pressed={selectedCategory === category}
                  className={`min-h-11 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === category
                      ? 'bg-[#FF6B5E] text-[#222831] shadow-sm'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-[#FF6B5E]/10 hover:text-[#222831] dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-600'
                  }`}
                >
                  {category === 'all' ? 'Todos' : category}
                </button>
              ))}
            </div>
          </div>

          <label className="relative block w-full lg:w-[340px] xl:w-[380px]">
            <span className="sr-only">Buscar producto rapido</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Buscar por nombre, SKU o codigo"
              className="min-h-12 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-11 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FF6B5E] focus:ring-4 focus:ring-[#FF6B5E]/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {quickSearch ? (
              <button
                type="button"
                onClick={() => setQuickSearch('')}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                aria-label="Limpiar busqueda de productos rapidos"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-gray-900/20">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))]">
          {visibleQuickProducts.map((product, index) => {
            const { hasLowStock, isOutOfStock } = getProductStockState(product);
            const statusLabel = isOutOfStock ? 'Agotado' : hasLowStock ? 'Stock bajo' : 'Disponible';

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onAddToCart(product, selectedQuickQuantity)}
                disabled={isOutOfStock && blockSalesWithoutStock}
                className={`group relative min-h-[224px] rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isOutOfStock
                    ? 'border-[#EF4444]/50 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                    : hasLowStock
                    ? 'border-[#F4C84A]/70 bg-[#F4C84A]/10 dark:border-amber-700 dark:bg-amber-900/20'
                    : 'border-gray-200 bg-white hover:border-[#59C3A5]/60 hover:bg-[#59C3A5]/10 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-[#59C3A5]/50 dark:hover:bg-[#59C3A5]/10'
                }`}
              >
                <div className="flex h-full flex-col justify-between gap-3">
                  <div className={`relative h-16 overflow-hidden rounded-lg border border-black/5 ${
                    isOutOfStock
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : hasLowStock
                      ? 'bg-[#F4C84A]/20 dark:bg-amber-900/20'
                      : 'bg-[#59C3A5]/10 dark:bg-[#59C3A5]/10'
                  }`}>
                    <span className={`absolute inset-0 flex items-center justify-center ${
                      isOutOfStock
                        ? 'bg-red-100 text-red-500'
                        : hasLowStock
                        ? 'bg-[#F4C84A]/20 text-amber-600'
                        : 'bg-[#59C3A5]/10 text-[#14745F]'
                    }`} aria-hidden="true">
                      <PackageSearch className="h-8 w-8" />
                    </span>
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                        className="relative z-10 h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute right-2 top-2 z-20 flex flex-col items-end gap-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#222831] text-xs font-medium text-white shadow-sm dark:bg-white dark:text-gray-900">
                        {index + 1}
                      </span>
                      {selectedQuickQuantity > 1 && (
                        <span className="rounded-full bg-[#FF6B5E] px-2 py-0.5 text-[11px] font-medium text-[#222831] shadow-sm">
                          x{selectedQuickQuantity}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[56px]">
                    <p className="line-clamp-2 text-base font-medium leading-tight text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="mt-1 truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
                        {product.sku}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="break-words text-2xl font-medium leading-none text-gray-950 dark:text-white">
                      {formatCurrency(product.salePrice)}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        isOutOfStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        hasLowStock ? 'bg-[#F4C84A]/25 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-[#59C3A5]/15 text-[#14745F] dark:bg-[#59C3A5]/15 dark:text-[#9DE7D3]'
                      }`}>
                        <Boxes className="h-3.5 w-3.5" />
                        Stock {product.currentStock}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-lg bg-[#FF6B5E] opacity-0 transition-opacity group-active:opacity-15" />
              </button>
            );
          })}
        </div>

        {visibleQuickProducts.length === 0 && (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
            <p className="text-sm font-medium">
              {quickSearch ? 'No hay productos para esa busqueda' : 'No hay productos en esta categoria'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
