import type { FormEvent, RefObject } from 'react';
import { Barcode, Minus, Package, Percent, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import type { Product } from '../../shared/commercial/products';
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
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ticket actual</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {itemCount} {itemCount === 1 ? 'articulo' : 'articulos'} en caja
            </p>
          </div>
        </div>

        <button
          onClick={onClearCart}
          disabled={cart.length === 0}
          className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-900/40 dark:text-red-300">ESC</span>
        </button>
      </div>

      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/50">
        <form onSubmit={onBarcodeSubmit} className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Barcode className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(event) => onBarcodeInputChange(event.target.value)}
            placeholder="Escanea código de barras..."
            className="w-full rounded-lg border-2 border-gray-300 bg-white py-3 pl-12 pr-4 font-mono text-lg transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-orange-900/30"
            autoComplete="off"
          />
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>Escaner activo para venta continua</span>
          <span className="hidden rounded bg-white px-2 py-1 font-semibold text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300 sm:inline">Enter para agregar</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-400 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-500">
            <Barcode className="mb-4 h-20 w-20 opacity-20" />
            <p className="text-xl font-semibold text-gray-600 dark:text-gray-300">Escanea o toca un producto</p>
            <p className="mt-1 text-sm">El ticket se arma aqui con cantidades, descuentos y stock visible.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              const { hasLowStock, isOutOfStock } = getProductStockState(product);

              return (
                <div
                  key={item.id}
                  className={`group flex flex-col gap-2 rounded-lg border p-4 transition ${
                    lastAddedItem === item.id
                      ? 'border-orange-400 bg-orange-50 shadow-md ring-2 ring-orange-100 dark:bg-orange-900/20 dark:ring-orange-900/40'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-lg font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      {item.quantity}
                    </div>

                    <div
                      className="-m-1 min-w-0 flex-1 cursor-pointer rounded-lg p-1 transition hover:bg-gray-100 dark:hover:bg-gray-800/70"
                      onClick={() => {
                        if (product) {
                          onOpenProductPanel(product);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </p>
                        {isOutOfStock && (
                          <span className="rounded px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            SIN STOCK
                          </span>
                        )}
                        {hasLowStock && !isOutOfStock && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
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
                              <Package className="h-3 w-3" />
                              Stock: {product.currentStock}
                            </span>
                          </>
                        )}
                      </div>
                      {item.discount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                          <Percent className="h-3 w-3" />
                          <span>
                            Descuento: {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        aria-label={`Restar ${item.name}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        aria-label={`Sumar ${item.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="w-28 text-right sm:w-32">
                      {item.discount > 0 && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 line-through">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      )}
                      <p className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>

                    <div className="flex gap-1 transition-opacity xl:opacity-0 xl:group-hover:opacity-100">
                      <button
                        onClick={() => onOpenItemDiscount(item)}
                        className="rounded-lg p-2 text-purple-600 transition hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        title="Aplicar descuento"
                        aria-label={`Aplicar descuento a ${item.name}`}
                      >
                        <Percent className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label={`Quitar ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-950 px-5 py-5 text-white dark:border-gray-700">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-300">Total a cobrar</p>
            <p className="mt-1 break-words text-4xl font-black leading-none sm:text-5xl">
              {formatCurrency(totals.total)}
            </p>
          </div>
          <div className="text-right text-xs text-gray-300">
            <p>Subtotal: {formatCurrency(totals.subtotal)}</p>
            <p>IVA: {formatCurrency(totals.tax)}</p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onOpenGlobalDiscount}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-950 shadow-sm transition hover:bg-gray-100"
          >
            <Percent className="h-4 w-4" />
            <span>Descuento a toda la venta</span>
          </button>
        )}
      </div>
    </div>
  );
}
