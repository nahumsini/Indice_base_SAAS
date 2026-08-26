import { useEffect, useMemo, useState } from 'react';
import { Boxes, PackageSearch, Search, X } from 'lucide-react';
import type { Product } from '../../shared/commercial/products';
import { getProductStockState } from '../utils/saleCatalog';
import { PosModalFrame, posModalSecondaryActionClassName } from './PosModalFrame';

interface QuickProductsPanelProps {
  categories: string[];
  catalogProducts: Product[];
  filteredQuickProducts: Product[];
  selectedCategory: string;
  selectedQuickQuantity: number;
  blockSalesWithoutStock: boolean;
  onSelectCategory: (category: string) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  searchRequestId?: number;
  workspaceMode?: boolean;
  formatCurrency: (amount: number) => string;
}

export function QuickProductsPanel({
  categories,
  catalogProducts,
  filteredQuickProducts,
  selectedCategory,
  selectedQuickQuantity,
  blockSalesWithoutStock,
  onSelectCategory,
  onAddToCart,
  searchRequestId = 0,
  workspaceMode = false,
  formatCurrency,
}: QuickProductsPanelProps) {
  const [quickSearch, setQuickSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const normalizedQuickSearch = quickSearch.trim().toLowerCase();
  const categoryCatalogProducts = useMemo(
    () => selectedCategory === 'all'
      ? catalogProducts
      : catalogProducts.filter((product) => product.department === selectedCategory),
    [catalogProducts, selectedCategory],
  );
  const matchingCatalogProducts = useMemo(() => {
    if (!normalizedQuickSearch) return categoryCatalogProducts;

    return categoryCatalogProducts.filter((product) => {
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
  }, [categoryCatalogProducts, normalizedQuickSearch]);
  const visibleQuickProducts = normalizedQuickSearch
    ? matchingCatalogProducts
    : filteredQuickProducts;

  useEffect(() => {
    if (searchRequestId > 0) {
      setIsSearchOpen(true);
    }
  }, [searchRequestId]);

  return (
    <div className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-medium text-[#222831] dark:text-white">Productos</h3>
            <p className="text-xs font-normal text-gray-500 dark:text-gray-400">Selecciona o usa las teclas 1-9.</p>
          </div>
          <div className="flex items-center gap-2">
            {!workspaceMode ? (
              <button type="button" onClick={() => setIsSearchOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-[#222831] transition hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/10 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
                <Search className="h-4 w-4" /> Buscar producto
              </button>
            ) : null}
            {selectedQuickQuantity > 1 && (
              <span className="rounded-full bg-[#F4C84A] px-4 py-2 text-sm font-medium text-[#222831]">x{selectedQuickQuantity}</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-[#F7F8FA] px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex flex-col gap-2">
          <label data-pos-inline-product-search className={`${workspaceMode ? 'block' : 'hidden'} relative w-full`}>
            <span className="sr-only">Buscar producto rápido</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Buscar por nombre, SKU o código"
              className="min-h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-11 text-sm font-normal text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {quickSearch ? (
              <button type="button" onClick={() => setQuickSearch('')} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Limpiar búsqueda">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  aria-pressed={selectedCategory === category}
                  className={`min-h-9 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedCategory === category
                      ? 'bg-[#FF6B5E] text-[#222831]'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-[#FF6B5E]/10 hover:text-[#222831] dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-600'
                  }`}
                >
                  {category === 'all' ? 'Todos' : category}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4 dark:bg-gray-900/20">
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
          {visibleQuickProducts.map((product, index) => {
            const { hasLowStock, isOutOfStock } = getProductStockState(product);
            const statusLabel = !product.useInventory ? 'Disponible' : isOutOfStock ? 'Agotado' : hasLowStock ? 'Stock bajo' : 'Disponible';

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onAddToCart(product, selectedQuickQuantity)}
                disabled={isOutOfStock && blockSalesWithoutStock}
                className={`group relative ${workspaceMode ? 'h-[208px]' : 'min-h-[188px]'} rounded-xl border p-2.5 text-left transition hover:border-[#FF6B5E]/45 hover:bg-[#FF6B5E]/[0.04] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isOutOfStock
                    ? 'border-[#EF4444]/50 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                    : hasLowStock
                    ? 'border-[#F4C84A]/70 bg-[#F4C84A]/10 dark:border-amber-700 dark:bg-amber-900/20'
                    : 'border-gray-200 bg-white hover:border-[#59C3A5]/60 hover:bg-[#59C3A5]/10 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-[#59C3A5]/50 dark:hover:bg-[#59C3A5]/10'
                }`}
              >
                <div className="flex h-full min-h-0 flex-col gap-2">
                  <div className={`relative ${workspaceMode ? 'h-[40%] shrink-0' : 'h-12'} overflow-hidden rounded-lg border border-black/5 ${
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
                      <PackageSearch className={workspaceMode ? 'h-10 w-10' : 'h-6 w-6'} />
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
                      {!normalizedQuickSearch && index < 9 ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#222831] text-xs font-medium text-white dark:bg-white dark:text-gray-900">
                          {index + 1}
                        </span>
                      ) : null}
                      {selectedQuickQuantity > 1 && (
                        <span className="rounded-full bg-[#FF6B5E] px-2 py-0.5 text-xs font-medium text-[#222831]">
                          x{selectedQuickQuantity}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={workspaceMode ? 'h-[42px] shrink-0 overflow-hidden' : 'min-h-[48px]'}>
                    <p className="line-clamp-2 text-sm font-medium leading-tight text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="mt-1 truncate text-[11px] font-medium text-gray-400 dark:text-gray-500">
                        {product.sku}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto shrink-0 space-y-1.5">
                    <p className="break-words text-lg font-medium leading-none text-gray-950 dark:text-white">
                      {formatCurrency(product.salePrice)}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        isOutOfStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        hasLowStock ? 'bg-[#F4C84A]/25 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-[#59C3A5]/15 text-[#14745F] dark:bg-[#59C3A5]/15 dark:text-[#9DE7D3]'
                      }`}>
                        <Boxes className="h-3.5 w-3.5" />
                        {product.useInventory ? `Stock ${product.currentStock}` : 'Venta libre'}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-xl bg-[#FF6B5E] opacity-0 transition-opacity group-active:opacity-15" />
              </button>
            );
          })}
        </div>

        {visibleQuickProducts.length === 0 && (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
            <p className="text-sm font-medium">
              {quickSearch ? 'No hay productos para esa busqueda' : 'No hay productos en esta categoria'}
            </p>
          </div>
        )}
      </div>

      {isSearchOpen ? (
        <PosModalFrame
          modalType="operational-workspace"
          closeLabel="Cerrar búsqueda"
          eyebrow="Catálogo de venta"
          icon={<Search className="h-6 w-6" />}
          onClose={() => { setIsSearchOpen(false); setQuickSearch(''); }}
          subtitle="Busca por nombre, SKU o código y agrega el producto al ticket."
          title="Buscar producto"
          footerSummary={`${matchingCatalogProducts.length} productos disponibles · se agregan directamente al ticket`}
          footer={(
            <button type="button" onClick={() => { setIsSearchOpen(false); setQuickSearch(''); }} className={posModalSecondaryActionClassName}>
              Cerrar
            </button>
          )}
        >
          <div className="sticky top-0 z-10 -m-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <label className="relative block">
              <span className="sr-only">Buscar producto</span>
              <Search className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="search"
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                placeholder="Nombre, SKU o código de barras"
                className="min-h-16 w-full rounded-lg border-2 border-gray-300 bg-white pl-14 pr-14 text-lg outline-none transition focus:border-[#FF6B5E] focus:ring-4 focus:ring-[#FF6B5E]/15 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              {quickSearch ? (
                <button type="button" onClick={() => setQuickSearch('')} className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Limpiar búsqueda">
                  <X className="h-6 w-6" />
                </button>
              ) : null}
            </label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  className={`min-h-12 shrink-0 rounded-lg px-5 text-sm font-medium ${selectedCategory === category ? 'bg-[#FF6B5E] text-[#222831]' : 'border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}
                >
                  {category === 'all' ? 'Todos' : category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {matchingCatalogProducts.map((product) => {
              const { isOutOfStock } = getProductStockState(product);
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isOutOfStock && blockSalesWithoutStock}
                  onClick={() => {
                    onAddToCart(product, selectedQuickQuantity);
                    setQuickSearch('');
                  }}
                  className="min-h-32 rounded-lg border border-gray-200 bg-white p-5 text-left transition hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
                >
                  <p className="font-medium text-[#222831] dark:text-white">{product.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{product.sku || product.barcode}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-medium">{formatCurrency(product.salePrice)}</span>
                    <span className="text-xs text-[#14745F]">
                      {product.useInventory ? `Stock ${product.currentStock}` : 'Disponible'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {matchingCatalogProducts.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
              No encontramos productos con esa búsqueda.
            </div>
          ) : null}
        </PosModalFrame>
      ) : null}
    </div>
  );
}
