import { Search, ShoppingBasket, Sparkles } from 'lucide-react';
import { pointOfSaleCatalogProducts } from '../shared/commercial/products';
import type { SelfServiceKioskCatalogItem } from './types';

const kioskItems: SelfServiceKioskCatalogItem[] = pointOfSaleCatalogProducts
  .filter((product) => product.status === 'active')
  .slice(0, 8)
  .map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    category: product.department,
    price: product.salePrice,
    availableStock: product.currentStock,
  }));

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(amount);

export default function SelfServiceKiosk() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold uppercase text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            <Sparkles className="h-3.5 w-3.5" />
            Kiosco autoservicio
          </div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">Catalogo de autoservicio</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Base frontend para explorar productos y preparar seleccion sin mezclar cobro de caja.
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar producto por nombre o codigo"
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </label>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
          <ShoppingBasket className="h-4 w-4" />
          Crear pre-ticket
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kioskItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{item.category}</p>
            <h3 className="mt-2 min-h-12 text-base font-black text-gray-950 dark:text-white">{item.name}</h3>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{item.barcode}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <span className="text-lg font-black text-teal-700 dark:text-teal-300">{formatCurrency(item.price)}</span>
              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {item.availableStock} disp.
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
