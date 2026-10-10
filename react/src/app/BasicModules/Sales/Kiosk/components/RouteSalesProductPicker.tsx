import { useMemo, useState } from 'react';
import { Check, MapPin, Minus, Package, Plus, Search, SlidersHorizontal } from 'lucide-react';
import type { RouteSalesKioskProduct, RouteSalesKioskWarehouse } from '../../../../api/multiKiosks';
import {
  KioskWorkspaceEmptyState,
  KioskWorkspaceFieldStatus,
  KioskWorkspaceSectionHeader,
  KioskWorkspaceSurface,
} from '../../../../components/kiosk-engine/KioskToolWorkspace';
import { resolveSalesStorageUrl } from '../../utils/salesStorageUrls';

type CatalogView = 'available' | 'selected' | 'all';

interface RouteSalesProductPickerProps {
  products: RouteSalesKioskProduct[];
  warehouses: RouteSalesKioskWarehouse[];
  warehouseId: number | null;
  quantities: Record<number, number>;
  selectedCurrency: string;
  query: string;
  locale: string;
  currency: string;
  total: number;
  applyProductTaxes: boolean;
  stockFor: (productId: number) => number;
  onQueryChange: (query: string) => void;
  onWarehouseChange: (warehouseId: number | null) => void;
  onQuantityChange: (product: RouteSalesKioskProduct, quantity: number) => void;
  onApplyProductTaxesChange: (apply: boolean) => void;
}

function money(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale || 'es-MX', {
    currency: currency || 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

export function RouteSalesProductPicker({
  products,
  warehouses,
  warehouseId,
  quantities,
  selectedCurrency,
  query,
  locale,
  currency,
  total,
  applyProductTaxes,
  stockFor,
  onQueryChange,
  onWarehouseChange,
  onQuantityChange,
  onApplyProductTaxesChange,
}: RouteSalesProductPickerProps) {
  const [catalogView, setCatalogView] = useState<CatalogView>('available');
  const [category, setCategory] = useState('all');
  const selectedLines = Object.values(quantities).filter(quantity => quantity > 0).length;
  const categories = useMemo(() => Array.from(new Set(products
    .map(product => product.category?.trim())
    .filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right, locale || 'es-MX')), [locale, products]);

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return products
      .filter(product => {
        const quantity = quantities[product.id] ?? 0;
        const service = (product.type || '').toUpperCase() === 'SERVICE';
        const available = service || stockFor(product.id) > 0;
        const matchesSearch = !needle || [product.name, product.sku, product.code, product.category, product.description]
          .some(value => value?.toLocaleLowerCase().includes(needle));
        const matchesCategory = category === 'all' || product.category === category;
        const matchesView = catalogView === 'all'
          || (catalogView === 'selected' ? quantity > 0 : available || quantity > 0);
        return matchesSearch && matchesCategory && matchesView;
      })
      .sort((left, right) => {
        const selectedDifference = Number((quantities[right.id] ?? 0) > 0)
          - Number((quantities[left.id] ?? 0) > 0);
        return selectedDifference || left.name.localeCompare(right.name, locale || 'es-MX');
      });
  }, [catalogView, category, locale, products, quantities, query, stockFor]);

  return (
    <KioskWorkspaceSurface className="space-y-2.5">
      <KioskWorkspaceSectionHeader
        action={(
          <div className="shrink-0 rounded-xl bg-rose-50 px-2.5 py-1.5 text-right dark:bg-rose-950/30">
            <p className="text-xs leading-4 text-slate-600">{selectedLines} elegidos</p>
            <p className="text-sm font-medium text-[#B63B32] dark:text-rose-200">{money(total, currency, locale)}</p>
          </div>
        )}
        description={<span className="hidden min-[430px]:inline">Busca, filtra y agrega sin salir del catálogo.</span>}
        icon={<span aria-hidden="true" className="text-2xl">📦</span>}
        title="Arma la venta"
        tone="coral"
      />

      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Almacén de salida</span>
        <select
          value={warehouseId ?? ''}
          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#E85D52] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          onChange={event => onWarehouseChange(Number(event.target.value) || null)}
        >
          <option value="">Selecciona un almacén</option>
          {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </select>
      </label>

      {!warehouses.length ? (
        <KioskWorkspaceFieldStatus kind="warning">
          No hay almacenes activos disponibles. Configura uno en Inventarios → Almacenes para poder terminar ventas.
        </KioskWorkspaceFieldStatus>
      ) : null}

      <label
        className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${applyProductTaxes ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/25' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}
        data-route-sales-tax-control
      >
        <input
          type="checkbox"
          aria-label="Agregar impuesto a la venta"
          checked={applyProductTaxes}
          className="h-5 w-5 shrink-0 accent-[#E85D52]"
          onChange={event => onApplyProductTaxesChange(event.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-950 dark:text-white">Agregar impuesto a la venta</span>
          <span className="block text-xs leading-4 text-slate-600">
            {applyProductTaxes
              ? 'Se sumará la tasa fiscal configurada en cada producto.'
              : 'Venta sin impuesto: el total no sumará IVA.'}
          </span>
        </span>
      </label>

      <div className="sticky top-0 z-10 -mx-1 space-y-1.5 rounded-xl border border-slate-100 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95" data-route-sales-catalog-controls>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
          <input
            value={query}
            aria-label="Buscar producto, SKU o categoría"
            disabled={!warehouseId}
            placeholder={warehouseId ? 'Buscar producto, SKU o categoría' : 'Selecciona un almacén para ver existencias'}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#E85D52] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            onChange={event => onQueryChange(event.target.value)}
          />
        </label>
        <div className="flex gap-1.5 overflow-x-auto" aria-label="Filtrar productos">
          {([
            ['available', 'Disponibles'],
            ['selected', `Elegidos ${selectedLines || ''}`.trim()],
            ['all', 'Todos'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={catalogView === id}
              className={`min-h-11 shrink-0 rounded-full border px-2.5 text-xs font-medium ${catalogView === id ? 'border-[#E85D52] bg-rose-50 text-[#B63B32] dark:text-rose-200 dark:bg-rose-950/30 dark:text-rose-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
              onClick={() => setCatalogView(id)}
            >
              {catalogView === id ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{label}
            </button>
          ))}
          {categories.length ? (
            <label className="relative shrink-0">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-600" />
              <select
                aria-label="Filtrar por categoría"
                value={category}
                className="h-12 max-w-44 rounded-full border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-600 outline-none focus:border-[#E85D52] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                onChange={event => setCategory(event.target.value)}
              >
                <option value="all">Todas las categorías</option>
                {categories.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className={`grid gap-2 sm:grid-cols-2 ${warehouseId ? '' : 'pointer-events-none opacity-60'}`}>
        {visibleProducts.map(product => {
          const quantity = quantities[product.id] ?? 0;
          const service = (product.type || '').toUpperCase() === 'SERVICE';
          const available = stockFor(product.id);
          const incompatibleCurrency = Boolean(selectedCurrency && selectedCurrency !== product.currency && quantity === 0);
          const imageUrl = resolveSalesStorageUrl(product.image_url);
          const lineTotal = quantity * Number(product.price || 0)
            * (applyProductTaxes ? 1 + Number(product.tax_percent || 0) / 100 : 1);
          return (
            <article key={product.id} className={`rounded-[1.5rem] border p-4 transition ${quantity ? 'border-rose-300 bg-rose-50/50 shadow-sm dark:border-rose-900 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
                <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800">
                  <span aria-hidden="true" className="text-2xl">📦</span>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.image_alt || product.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      onError={event => { event.currentTarget.style.display = 'none'; }}
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-base font-medium leading-6 text-slate-950 dark:text-white">{product.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-600">{product.sku || product.code || 'Sin clave'}{product.category ? ` · ${product.category}` : ''}</p>
                </div>
                <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{money(product.price, product.currency, locale)}</p>
                  <p className="mt-1 text-xs text-slate-600">{applyProductTaxes ? `Imp. ${product.tax_percent}%` : 'Sin impuesto'}</p>
                </div>
              </div>
              {product.description ? <p className="mt-1.5 line-clamp-1 text-xs leading-4 text-slate-600">{product.description}</p> : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-xs ${warehouseId && !service && available <= 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {!warehouseId ? 'Elige almacén' : service ? 'Servicio disponible' : available > 0 ? `${available} disponibles` : 'Sin existencia'}
                  </p>
                  {quantity ? <p className="mt-0.5 truncate text-xs font-medium text-[#B63B32] dark:text-rose-200">Importe {money(lineTotal, product.currency, locale)}</p> : null}
                </div>
                <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                  <button type="button" aria-label={`Quitar ${product.name}`} className="grid h-12 w-12 place-items-center disabled:opacity-30" disabled={!warehouseId || quantity <= 0} onClick={() => onQuantityChange(product, quantity - 1)}><Minus className="h-4 w-4" /></button>
                  <input
                    aria-label={`Cantidad de ${product.name}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={service ? undefined : available}
                    value={quantity}
                    className="h-12 w-12 border-x border-slate-200 bg-transparent text-center text-sm font-medium outline-none [appearance:textfield] dark:border-slate-700 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onChange={event => onQuantityChange(product, Number(event.target.value) || 0)}
                  />
                  <button type="button" aria-label={`Agregar ${product.name}`} className="grid h-12 w-12 place-items-center text-[#B63B32] dark:text-rose-200 disabled:opacity-30" disabled={!warehouseId || incompatibleCurrency || (!service && quantity >= available)} onClick={() => onQuantityChange(product, quantity + 1)}><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!visibleProducts.length ? (
        <KioskWorkspaceEmptyState
          action={<button type="button" className="min-h-11 rounded-xl px-3 text-xs font-medium text-[#B63B32] dark:text-rose-200" onClick={() => { setCatalogView('all'); setCategory('all'); onQueryChange(''); }}>Mostrar todos</button>}
          description="Prueba otra búsqueda o muestra todo el catálogo."
          icon={<Package className="h-6 w-6" />}
          title="No hay productos en esta vista"
          tone="coral"
        />
      ) : null}

    </KioskWorkspaceSurface>
  );
}
