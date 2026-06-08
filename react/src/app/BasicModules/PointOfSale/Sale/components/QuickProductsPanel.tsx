import { Sparkles } from 'lucide-react';
import type { Product } from '../../Productos/types/product.types';
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
    <div className="w-80 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">Productos Rápidos</h3>
        </div>
        <p className="text-xs text-orange-100 mt-1">Presiona 1-9 para agregar</p>
      </div>

      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex gap-2">
          {categories.slice(0, 3).map((category) => (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category === 'all' ? 'Todos' : category}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredQuickProducts.map((product, index) => {
            const { hasLowStock, isOutOfStock } = getProductStockState(product);

            return (
              <button
                key={product.id}
                onClick={() => onAddToCart(product, selectedQuickQuantity)}
                disabled={isOutOfStock && blockSalesWithoutStock}
                className={`relative group p-4 rounded-xl border-2 transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isOutOfStock
                    ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-300 dark:border-red-700'
                    : hasLowStock
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700 hover:border-yellow-400'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30 border-gray-200 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-500'
                }`}
              >
                <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                  {index + 1}
                </div>

                {selectedQuickQuantity > 1 && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm dark:bg-white dark:text-gray-900">
                    x{selectedQuickQuantity}
                  </div>
                )}

                {isOutOfStock && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                    AGOTADO
                  </div>
                )}
                {hasLowStock && !isOutOfStock && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                    BAJO
                  </div>
                )}

                <div className="text-left space-y-1 mt-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight min-h-[2.5rem]">
                    {product.name}
                  </p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(product.salePrice)}
                  </p>
                  <p className={`text-xs font-medium ${
                    isOutOfStock ? 'text-red-600 dark:text-red-400' :
                    hasLowStock ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    Stock: {product.currentStock}
                  </p>
                </div>

                <div className="absolute inset-0 bg-orange-400 opacity-0 group-active:opacity-20 rounded-xl transition-opacity pointer-events-none" />
              </button>
            );
          })}
        </div>

        {filteredQuickProducts.length === 0 && (
          <div className="h-full flex items-center justify-center text-center text-gray-400 dark:text-gray-500 p-4">
            <p className="text-sm">No hay productos en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}

