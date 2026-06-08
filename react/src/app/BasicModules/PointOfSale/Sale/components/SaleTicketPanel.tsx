import type { FormEvent, RefObject } from 'react';
import { Barcode, Package, Percent, Trash2, X } from 'lucide-react';
import type { Product } from '../../Productos/types/product.types';
import type { SaleItem } from '../types/sale.types';
import type { SaleTotals } from '../utils/saleCalculations';
import { getProductStockState } from '../utils/saleCatalog';

interface SaleTicketPanelProps {
  cart: SaleItem[];
  barcodeInput: string;
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  lastAddedItem: string | null;
  totals: SaleTotals;
  products: Product[];
  onBarcodeInputChange: (value: string) => void;
  onBarcodeSubmit: (event: FormEvent) => void;
  onClearCart: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenItemDiscount: (item: SaleItem) => void;
  onOpenGlobalDiscount: () => void;
  onOpenProductPanel: (product: Product) => void;
  formatCurrency: (amount: number) => string;
}

export function SaleTicketPanel({
  cart,
  barcodeInput,
  barcodeInputRef,
  lastAddedItem,
  totals,
  products,
  onBarcodeInputChange,
  onBarcodeSubmit,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem,
  onOpenItemDiscount,
  onOpenGlobalDiscount,
  onOpenProductPanel,
  formatCurrency,
}: SaleTicketPanelProps) {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Venta</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {itemCount} artículos
          </p>
        </div>

        <button
          onClick={onClearCart}
          disabled={cart.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4" />
          Cancelar (ESC)
        </button>
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <form onSubmit={onBarcodeSubmit} className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Barcode className="w-5 h-5 text-gray-400" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(event) => onBarcodeInputChange(event.target.value)}
            placeholder="Escanea código de barras..."
            className="w-full pl-12 pr-4 py-3 text-lg font-mono bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/30 transition-all"
            autoComplete="off"
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <Barcode className="w-24 h-24 mb-4 opacity-20" />
            <p className="text-xl font-medium">Escanea un producto</p>
            <p className="text-sm">Los productos aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              const { hasLowStock, isOutOfStock } = getProductStockState(product);

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2 p-4 rounded-lg transition-all group ${
                    lastAddedItem === item.id
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-lg rounded-lg flex-shrink-0">
                      {item.quantity}
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer rounded-lg p-1 -m-1 transition hover:bg-white/70 dark:hover:bg-gray-800/50"
                      onClick={() => {
                        if (product) {
                          onOpenProductPanel(product);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        {isOutOfStock && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                            SIN STOCK
                          </span>
                        )}
                        {hasLowStock && !isOutOfStock && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                            BAJO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.price)} c/u
                        </span>
                        {product?.useInventory && (
                          <>
                            <span className="text-gray-400 dark:text-gray-500">•</span>
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              Stock: {product.currentStock}
                            </span>
                          </>
                        )}
                      </div>
                      {item.discount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                          <Percent className="w-3 h-3" />
                          <span>
                            Descuento: {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                      >
                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">−</span>
                      </button>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                      >
                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">+</span>
                      </button>
                    </div>

                    <div className="w-32 text-right">
                      {item.discount > 0 && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 line-through">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      )}
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onOpenItemDiscount(item)}
                        className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                        title="Aplicar descuento"
                      >
                        <Percent className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 py-5 border-t-4 border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
        <div className="text-center mb-4">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">
            Total a Cobrar
          </p>
          <p className="text-6xl font-black text-orange-600 dark:text-orange-400 tracking-tight leading-none">
            {formatCurrency(totals.total)}
          </p>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onOpenGlobalDiscount}
            className="w-full mb-3 py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Percent className="w-4 h-4" />
            <span>Descuento a toda la venta</span>
          </button>
        )}

        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 border-t border-orange-200 dark:border-orange-700 pt-3">
          <span>Subtotal: {formatCurrency(totals.subtotal)}</span>
          <span>IVA: {formatCurrency(totals.tax)}</span>
        </div>
      </div>
    </div>
  );
}

