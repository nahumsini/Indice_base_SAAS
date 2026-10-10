import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { KioskModalFrame } from '../../../components/kiosk-engine/KioskModalFrame';
import type { RestaurantCatalogItem, RestaurantOrder } from './restaurantKioskApi';
import type { RestaurantWorkspaceMutation } from './WaiterStationWorkspace';

export function RestaurantProductModal({
  personal = false,
  mutate,
  onClose,
  order,
  products,
  sourceRegisterOpen,
}: {
  personal?: boolean;
  mutate: RestaurantWorkspaceMutation;
  onClose: () => void;
  order: RestaurantOrder;
  products: RestaurantCatalogItem[];
  sourceRegisterOpen: boolean;
}) {
  const [guestNumber, setGuestNumber] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [lastAddedProductId, setLastAddedProductId] = useState<number | null>(null);
  const sellableProducts = useMemo(
    () => products.filter(product => !product.stockTracked || Number(product.availableQuantity || 0) > 0),
    [products],
  );
  const categories = useMemo(
    () => [...new Set(sellableProducts
      .map(product => product.category?.trim())
      .filter((value): value is string => Boolean(value)))],
    [sellableProducts],
  );
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es-MX');
    return sellableProducts.filter(product => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesSearch = !normalizedSearch
        || `${product.name} ${product.sku} ${product.category ?? ''}`
          .toLocaleLowerCase('es-MX')
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [category, search, sellableProducts]);

  useEffect(() => {
    if (category !== 'all' && !categories.includes(category)) setCategory('all');
  }, [categories, category]);

  useEffect(() => {
    setGuestNumber(current => Math.min(Math.max(1, current), order.guestCount));
  }, [order.guestCount]);

  const addProduct = async (product: RestaurantCatalogItem) => {
    if (!sourceRegisterOpen || addingProductId != null) return;
    const available = Number(product.availableQuantity || 0);
    if (product.stockTracked && quantity > available) return;
    setAddingProductId(product.id);
    const saved = await mutate(
      'pos.restaurant.item.add',
      {
        orderId: order.id,
        productId: product.id,
        quantity,
        guestNumber,
        kitchenStationCode: 'GENERAL',
      },
      `${product.name} se agregó al comensal ${guestNumber}.`,
    );
    if (saved) setLastAddedProductId(product.id);
    setAddingProductId(null);
  };

  return (
    <KioskModalFrame
      open
      onOpenChange={open => { if (!open) onClose(); }}
      busy={addingProductId != null}
      surface="public"
      size="workspace"
      bodyClassName={personal ? "overflow-y-auto p-0 sm:p-0" : "overflow-hidden p-0 sm:p-0"}
      closeLabel="Cerrar catálogo"
      contentClassName={personal ? "kiosk-personal-workspace kiosk-personal-coral-modal kiosk-personal-product-modal sm:!h-[92dvh]" : "sm:!h-[92dvh]"}
      eyebrow="Estación de mesero"
      footer={(
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#B63B32] shadow-sm" onClick={onClose} type="button">
          <Check aria-hidden="true" className="h-5 w-5" />Terminar captura
        </button>
      )}
      footerSummary={`Comensal ${guestNumber} · cantidad ${quantity} · ${filteredProducts.length} productos disponibles`}
      icon={personal ? <span aria-hidden="true" className="text-2xl">🍽️</span> : <ShoppingBag className="h-6 w-6" />}
      description={personal ? order.tableName : 'Elige al comensal y toca un producto para agregarlo directamente a su comanda.'}
      title={personal ? 'Agregar productos' : `Agregar productos · ${order.tableName}`}
      tone="coral"
    >
      <div className={`flex min-h-0 flex-col bg-[#F7F8FA] dark:bg-slate-900 ${personal ? 'min-h-full' : 'h-full'}`}>
        <div className="shrink-0 border-b border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 sm:p-4">
          <div className={personal ? 'grid grid-cols-2 items-end gap-3' : 'grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]'}>
            {personal ? <label className="min-w-0">
              <span className="mb-2 block text-sm font-medium"><span aria-hidden="true">👤</span> Comensal</span>
              <select aria-label="Seleccionar comensal" value={guestNumber} onChange={event => setGuestNumber(Number(event.target.value))} disabled={addingProductId != null} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
                {Array.from({ length: order.guestCount }, (_, index) => index + 1).map(guest => <option key={guest} value={guest}>{guest}</option>)}
              </select>
            </label> : <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-medium">
                  <UserRound aria-hidden="true" className="h-4 w-4 text-[#B63B32]" />¿Para quién es?
                </p>
                <span className="text-xs text-slate-500">{order.guestCount} personas en la mesa</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Seleccionar comensal">
                {Array.from({ length: order.guestCount }, (_, index) => index + 1).map(guest => (
                  <button
                    aria-pressed={guestNumber === guest}
                    className={`min-h-14 min-w-[7.25rem] shrink-0 rounded-xl border px-4 text-sm font-medium transition active:scale-[0.98] ${guestNumber === guest ? 'border-[#FF6B5E] bg-[#FF6B5E] text-[#222831] shadow-sm' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
                    key={guest}
                    onClick={() => setGuestNumber(guest)}
                    type="button"
                  >
                    Comensal {guest}
                  </button>
                ))}
              </div>
            </div>}

            <div>
              <p className="mb-2 text-sm font-medium">Cantidad por toque</p>
              <div data-personal-product-quantity={personal || undefined} className="grid grid-cols-[3.5rem_4.25rem_3.5rem] items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <button aria-label="Reducir cantidad" className="grid h-14 place-items-center disabled:opacity-35" disabled={quantity <= 1} onClick={() => setQuantity(current => Math.max(1, current - 1))} type="button">
                  <Minus aria-hidden="true" className="h-5 w-5" />
                </button>
                <output aria-label={`Cantidad ${quantity}`} className="grid h-14 place-items-center border-x border-slate-200 text-xl font-medium dark:border-slate-700">{quantity}</output>
                <button aria-label="Aumentar cantidad" className="grid h-14 place-items-center disabled:opacity-35" disabled={quantity >= 100} onClick={() => setQuantity(current => Math.min(100, current + 1))} type="button">
                  <Plus aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <label className="relative mt-3 block">
            <span className="sr-only">Buscar producto</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
            <input
              className="min-h-16 w-full rounded-xl border-2 border-slate-300 bg-white pl-14 pr-14 text-lg outline-none transition focus:border-[#FF6B5E] focus:ring-4 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              onChange={event => setSearch(event.target.value)}
              placeholder={personal ? 'Buscar producto' : 'Buscar por nombre, código o categoría'}
              type="search"
              value={search}
            />
            {search ? (
              <button aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setSearch('')} type="button">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            ) : null}
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Categorías de productos">
            <CategoryButton active={category === 'all'} label="Todos" onClick={() => setCategory('all')} />
            {categories.map(item => <CategoryButton active={category === item} key={item} label={item} onClick={() => setCategory(item)} />)}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
              <div><ShoppingBag className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-lg font-medium">No encontramos productos disponibles</p><p className="mt-1 text-sm text-slate-500">Prueba con otro nombre, código o categoría.</p></div>
            </div>
          ) : (
            <div className={personal ? "grid grid-cols-1 gap-3" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"}>
              {filteredProducts.map(product => {
                const available = Number(product.availableQuantity || 0);
                const unavailableForQuantity = product.stockTracked && quantity > available;
                const added = lastAddedProductId === product.id;
                return (
                  <button
                    data-personal-product-card={personal || undefined}
                    aria-label={`Agregar ${quantity} ${product.name} al comensal ${guestNumber}`}
                    className={`group flex min-h-40 flex-col rounded-xl border bg-white p-4 text-left shadow-sm outline-none transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-950 ${added ? 'border-emerald-400 ring-4 ring-emerald-500/10' : 'border-slate-200 hover:border-[#FF6B5E] focus-visible:ring-4 focus-visible:ring-[#FF6B5E]/20 dark:border-slate-700'}`}
                    disabled={!sourceRegisterOpen || addingProductId != null || unavailableForQuantity}
                    key={product.id}
                    onClick={() => void addProduct(product)}
                    type="button"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <span className={`grid h-12 w-12 place-items-center rounded-xl ${added ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]'}`}>
                        {added ? <Check className="h-6 w-6" /> : personal ? <span aria-hidden="true" className="text-2xl">🍽️</span> : <ShoppingBag className="h-5 w-5" />}
                      </span>
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#222831] text-white transition group-hover:bg-[#FF6B5E] group-hover:text-[#222831]">
                        <Plus aria-hidden="true" className="h-5 w-5" />
                      </span>
                    </div>
                    <h3 className={`mt-3 text-base font-medium leading-6 ${personal ? '' : 'line-clamp-2'}`}>{product.name}</h3>
                    <p className="mt-1 truncate text-xs text-slate-400">{product.sku}</p>
                    <div data-personal-product-price={personal || undefined} className="mt-auto flex w-full items-end justify-between gap-3 pt-3">
                      <div><p className="text-lg font-medium text-[#B63B32] dark:text-[#FFB0AA]">{money(Number(product.price) * quantity)}</p>{quantity > 1 ? <p className="text-[11px] text-slate-400">{quantity} × {money(product.price)}</p> : null}</div>
                      <span className={`text-xs ${unavailableForQuantity ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {product.stockTracked ? unavailableForQuantity ? `Solo ${available}` : `${available} disp.` : 'Disponible'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </KioskModalFrame>
  );
}

function CategoryButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`min-h-12 shrink-0 rounded-xl border px-5 text-sm font-medium transition active:scale-[0.98] ${active ? 'border-[#222831] bg-[#222831] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#FF6B5E] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function money(value?: number | string) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
}
