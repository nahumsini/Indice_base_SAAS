import { Boxes, Sparkles } from 'lucide-react';
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
  return (
    <div className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">Productos rapidos</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Teclas 1-9 para agregar al ticket</p>
            </div>
          </div>
          {selectedQuickQuantity > 1 && (
            <span className="rounded-md bg-gray-900 px-2 py-1 text-xs font-bold text-white dark:bg-white dark:text-gray-900">
              x{selectedQuickQuantity}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${
                selectedCategory === category
                  ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {category === 'all' ? 'Todos' : category}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
          {filteredQuickProducts.map((product, index) => {
            const { hasLowStock, isOutOfStock } = getProductStockState(product);

            return (
              <button
                key={product.id}
                onClick={() => onAddToCart(product, selectedQuickQuantity)}
                disabled={isOutOfStock && blockSalesWithoutStock}
                className={`group relative min-h-[152px] rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isOutOfStock
                    ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                    : hasLowStock
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                    : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/60 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-orange-600 dark:hover:bg-orange-900/20'
                }`}
              >
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs font-bold text-white shadow-sm dark:bg-white dark:text-gray-900">
                  {index + 1}
                </div>

                {selectedQuickQuantity > 1 && (
                  <div className="absolute bottom-2 right-2 rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    x{selectedQuickQuantity}
                  </div>
                )}

                {isOutOfStock && (
                  <div className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    AGOTADO
                  </div>
                )}
                {hasLowStock && !isOutOfStock && (
                  <div className="absolute left-2 top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    BAJO
                  </div>
                )}

                <div className="mt-6 flex h-full flex-col justify-between gap-3">
                  <p className="min-h-[2.5rem] text-sm font-semibold leading-tight text-gray-900 line-clamp-2 dark:text-white">
                    {product.name}
                  </p>
                  <div>
                    <p className="text-lg font-bold text-gray-950 dark:text-white">
                      {formatCurrency(product.salePrice)}
                    </p>
                    <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                      isOutOfStock ? 'text-red-600 dark:text-red-400' :
                      hasLowStock ? 'text-amber-600 dark:text-amber-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      <Boxes className="h-3 w-3" />
                      Stock: {product.currentStock}
                    </p>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-lg bg-orange-400 opacity-0 transition-opacity group-active:opacity-15" />
              </button>
            );
          })}
        </div>

        {filteredQuickProducts.length === 0 && (
          <div className="flex h-full items-center justify-center p-4 text-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">No hay productos en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}
