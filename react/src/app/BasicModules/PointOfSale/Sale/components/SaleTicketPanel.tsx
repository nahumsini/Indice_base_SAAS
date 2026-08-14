import type { FormEvent, RefObject } from 'react';
import { Barcode, Minus, Package, Percent, Plus, ScanLine, ShoppingCart, Trash2, X } from 'lucide-react';
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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[#222831]/10 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div data-pos-ticket-header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222831]/10 bg-[#222831] px-5 py-3 text-white dark:border-gray-700 dark:bg-[#111827]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF6B5E]/20 text-[#FFB0AA] dark:bg-[#FF6B5E]/15" aria-hidden="true">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-medium text-white">Ticket actual</h2>
            <p className="text-sm text-gray-300">
              {itemCount} {itemCount === 1 ? 'articulo' : 'articulos'} en caja
            </p>
          </div>
        </div>

        <button
          onClick={onClearCart}
          disabled={cart.length === 0}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#FF8A80] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white">ESC</span>
        </button>
      </div>

      <div data-pos-ticket-scanner className="border-b border-gray-200 bg-[#F7F8FA] px-5 py-3 dark:border-gray-700 dark:bg-gray-900/50">
        <form onSubmit={onBarcodeSubmit} className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Barcode className="h-5 w-5 text-[#B63B32] dark:text-[#FFB0AA]" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(event) => onBarcodeInputChange(event.target.value)}
            placeholder="Escanea código de barras..."
            className="min-h-14 w-full rounded-xl border-2 border-gray-300 bg-white py-3 pl-12 pr-4 font-mono text-lg transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-[#FF6B5E]/25"
            autoComplete="off"
          />
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>Escaner activo para venta continua</span>
            <span className="hidden rounded bg-white px-2 py-1 font-medium text-[#222831] shadow-sm dark:bg-gray-800 dark:text-gray-300 sm:inline">Enter para agregar</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {cart.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-[#FF6B5E]/35 bg-[#FF6B5E]/[0.05] p-6 text-center text-gray-500 dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/10 dark:text-gray-400">
            <ScanLine className="mb-3 h-10 w-10 text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden="true" />
            <p className="text-xl font-medium text-gray-600 dark:text-gray-300">Escanea o toca un producto</p>
            <p className="mt-1 text-sm">El ticket se arma aqui con cantidades, descuentos y stock visible.</p>
          </div>
        ) : (
          <div data-pos-ticket-items className="space-y-2">
            {cart.map((item) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              const { hasLowStock, isOutOfStock } = getProductStockState(product);

              return (
                <div
                  key={item.id}
                  data-pos-ticket-item
                  className={`group rounded-xl border p-2.5 transition ${
                    lastAddedItem === item.id
                      ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 ring-2 ring-[#FF6B5E]/15 dark:bg-[#FF6B5E]/10 dark:ring-[#FF6B5E]/25'
                      : 'border-gray-200 bg-white hover:bg-[#59C3A5]/10 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:bg-[#59C3A5]/10'
                  }`}
                >
                  <div data-pos-ticket-item-layout className="flex flex-col gap-2 md:flex-row md:items-center">
                    <div data-pos-ticket-item-summary className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div data-pos-ticket-quantity className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F4C84A]/25 text-[#222831] dark:bg-[#F4C84A]/15 dark:text-[#F4C84A]">
                        <span className="text-lg font-medium leading-none">{item.quantity}</span>
                        <span className="text-[10px] font-medium leading-none">uds</span>
                      </div>

                      <div
                        className="-m-1 min-w-0 flex-1 cursor-pointer rounded-lg p-1 transition hover:bg-gray-100 dark:hover:bg-gray-800/70"
                        onClick={() => {
                          if (product) {
                            onOpenProductPanel(product);
                          }
                        }}
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </p>
                          {isOutOfStock && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              SIN STOCK
                            </span>
                          )}
                          {hasLowStock && !isOutOfStock && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              BAJO
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span>{formatCurrency(item.price)} c/u</span>
                          {product?.useInventory && (
                            <>
                              <span className="text-gray-400 dark:text-gray-500">•</span>
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Stock {product.currentStock}
                              </span>
                            </>
                          )}
                        </div>
                        {item.discount > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                            <Percent className="h-3 w-3" />
                            <span>
                              Descuento: {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-20 shrink-0 text-right">
                        {item.discount > 0 && (
                          <p className="text-xs text-gray-400 line-through dark:text-gray-500">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        )}
                        <p className="text-lg font-medium text-gray-950 dark:text-white">
                          {formatCurrency(item.subtotal)}
                        </p>
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">subtotal</p>
                      </div>
                    </div>

                    <div data-pos-ticket-item-actions className="flex shrink-0 items-center justify-end gap-1 rounded-lg bg-[#F7F8FA] p-1 dark:bg-gray-950/30">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/10 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                          aria-label={`Restar ${item.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-white px-2 text-center text-sm font-medium text-[#222831] ring-1 ring-gray-200 dark:bg-gray-800 dark:text-white dark:ring-gray-700">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/10 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                          aria-label={`Sumar ${item.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenItemDiscount(item)}
                          className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-2.5 text-sm font-medium text-[#B63B32] transition hover:bg-[#FF6B5E]/20 active:scale-95 dark:text-[#FFB0AA]"
                          title="Aplicar descuento"
                          aria-label={`Aplicar descuento a ${item.name}`}
                        >
                          <Percent className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-red-50 px-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100 active:scale-95 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                          aria-label={`Quitar ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div data-pos-ticket-local-footer className="border-t border-gray-200 bg-[#222831] px-5 py-3 text-white dark:border-gray-700">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-300">Total a cobrar</p>
            <p className="mt-1 break-words text-3xl font-medium leading-none">
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
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 py-2 text-sm font-medium text-[#222831] transition hover:bg-[#ff5a4b]"
          >
            <Percent className="h-4 w-4" />
            <span>Descuento a toda la venta</span>
          </button>
        )}
      </div>
    </div>
  );
}
