import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, LoaderCircle, Minus, Plus, Search, ShoppingBag, Store, TriangleAlert } from 'lucide-react';
import type { MultiKioskChildWorkspace } from '../api/multiKiosks';
import { multiKioskPublicApi } from '../api/multiKiosks';
import type {
  RestaurantWorkspace,
} from '../BasicModules/PointOfSale/RestaurantKiosk/restaurantKioskApi';
import {
  WaiterStationWorkspace,
  type RestaurantWorkspaceMutation,
} from '../BasicModules/PointOfSale/RestaurantKiosk/WaiterStationWorkspace';
import type {
  SelfServiceBootstrap,
  SelfServicePreticketReceipt,
} from '../BasicModules/PointOfSale/SelfServiceKiosk/selfServiceKioskApi';
import { KioskModalFrame } from '../components/kiosk-engine/KioskModalFrame';
import { Button } from '../components/ui/button';

interface PointOfSaleMultiKioskWorkspaceProps {
  kioskId: number;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  token: string;
  workspace: MultiKioskChildWorkspace;
}

const selfServiceCapabilities = {
  create: 'pos.self-service.preticket.create@1',
};

function csrfFor(token: string) {
  try { return sessionStorage.getItem(`indice.multi-kiosk.${token}.csrf`) ?? ''; } catch { return ''; }
}

function copyFor(locale: string) {
  if (locale.toLowerCase().startsWith('es')) return {
    search: 'Buscar producto', cart: 'Venta actual', empty: 'Agrega productos para continuar.',
    name: 'Nombre del cliente', create: 'Crear pre-ticket',
    all: 'Todos', viewCart: 'Ver pedido', continueShopping: 'Seguir agregando', newPreticket: 'Crear otro pre-ticket',
    itemCount: (count: number) => `${count} ${count === 1 ? 'producto' : 'productos'}`,
    cartDescription: 'Revisa cantidades y completa los datos antes de enviar el pre-ticket.',
    receiptDescription: 'Muestra este código en la caja asignada para recuperar el pedido.',
    unavailable: 'La caja asignada no tiene un turno activo. El pre-ticket no está disponible.',
    unsupported: 'Este acceso POS no está disponible en el Multikiosco móvil.',
    success: 'Pre-ticket creado', code: 'Código de entrega', total: 'Total estimado',
    error: 'No fue posible crear el pre-ticket. Revisa existencias e inténtalo nuevamente.',
    restaurantError: 'No fue posible actualizar la operación del restaurante.',
    updating: 'Actualizando la comanda…',
  };
  return {
    search: 'Search products', cart: 'Current sale', empty: 'Add products to continue.',
    name: 'Customer name', create: 'Create pre-ticket',
    all: 'All', viewCart: 'Review order', continueShopping: 'Keep adding', newPreticket: 'Create another pre-ticket',
    itemCount: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
    cartDescription: 'Review quantities and complete the required details before sending the pre-ticket.',
    receiptDescription: 'Show this code at the assigned register to retrieve the order.',
    unavailable: 'The assigned register has no active shift. Pre-ticket creation is unavailable.',
    unsupported: 'This POS access is not available in the mobile Multi-kiosk.',
    success: 'Pre-ticket created', code: 'Handoff code', total: 'Estimated total',
    error: 'The pre-ticket could not be created. Check stock and try again.',
    restaurantError: 'The restaurant operation could not be refreshed.',
    updating: 'Updating the order…',
  };
}

export function PointOfSaleMultiKioskWorkspace(props: PointOfSaleMultiKioskWorkspaceProps) {
  const kioskType = props.workspace.bootstrap?.kioskType ?? props.workspace.kiosk.kiosk_type;
  if (kioskType === 'waiter_station') {
    return <RestaurantMultiKioskWorkspace {...props} />;
  }
  if (kioskType === 'self_service') {
    return <SelfServiceMultiKioskWorkspace {...props} />;
  }
  return <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{copyFor(props.locale).unsupported}</p>;
}

function SelfServiceMultiKioskWorkspace({
  token, kioskId, workspace, locale, onAuthorizationFailure,
}: PointOfSaleMultiKioskWorkspaceProps) {
  const copy = copyFor(locale);
  const bootstrap = workspace.bootstrap as SelfServiceBootstrap | undefined;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [customerName, setCustomerName] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [receipt, setReceipt] = useState<SelfServicePreticketReceipt | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const createInFlightRef = useRef(false);

  useEffect(() => {
    setSearch(''); setCategory('all'); setCustomerName(''); setQuantities({}); setReceipt(null); setCartOpen(false); setError('');
  }, [workspace.session.id]);

  const categories = useMemo(() => [...new Set((bootstrap?.items ?? [])
    .map(item => item.category?.trim())
    .filter((value): value is string => Boolean(value)))], [bootstrap?.items]);
  const visibleItems = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return (bootstrap?.items ?? []).filter(item => (
      category === 'all' || item.category === category
    ) && (!normalized || [item.name, item.sku, item.category]
      .some(value => value?.toLocaleLowerCase().includes(normalized))));
  }, [bootstrap?.items, category, search]);
  const selectedItems = (bootstrap?.items ?? []).filter(item => (quantities[item.productId] ?? 0) > 0);
  const count = selectedItems.reduce((sum, item) => sum + (quantities[item.productId] ?? 0), 0);
  const total = selectedItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * (quantities[item.productId] ?? 0), 0);
  const currency = bootstrap?.currencyCode ?? 'MXN';
  const requiredNameMissing = Boolean(bootstrap?.customerNameRequired && !customerName.trim());
  const canCreate = workspace.session.capabilities.includes(selfServiceCapabilities.create)
    && count > 0 && !requiredNameMissing && !busy && bootstrap?.sourceRegisterOpen !== false;
  const changeQuantity = (productId: number, delta: number) => setQuantities(current => {
    const next = Math.max(0, (current[productId] ?? 0) + delta);
    return { ...current, [productId]: next };
  });

  const create = async () => {
    if (!canCreate || createInFlightRef.current) return;
    createInFlightRef.current = true;
    setBusy(true); setError(''); setReceipt(null);
    try {
      const result = await multiKioskPublicApi.action<SelfServicePreticketReceipt>(
        token, kioskId, selfServiceCapabilities.create, {
          customerName: customerName.trim() || null,
          items: selectedItems.map(item => ({ productId: item.productId, quantity: quantities[item.productId] })),
        }, csrfFor(token));
      setReceipt(result); setQuantities({}); setCustomerName(''); setCartOpen(false);
    } catch (failure) {
      if (!onAuthorizationFailure(failure)) setError(copy.error);
    } finally {
      createInFlightRef.current = false;
      setBusy(false);
    }
  };

  if (!bootstrap) return null;
  if (!bootstrap.sourceRegisterOpen) return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900" data-multi-kiosk-pos>
      <TriangleAlert className="mx-auto h-7 w-7" /><p className="mt-3 text-sm leading-6">{copy.unavailable}</p>
    </section>
  );

  const formattedTotal = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(total);
  const resetPreticket = () => {
    setReceipt(null);
    setSearch('');
    setCategory('all');
  };

  if (receipt) return (
    <section className="mx-auto flex min-h-[calc(100dvh-12rem)] w-full max-w-[31rem] items-center justify-center py-4" data-multi-kiosk-pos data-preticket-result>
      <div className="w-full rounded-3xl border border-emerald-200 bg-white p-5 text-center shadow-sm dark:border-emerald-900/70 dark:bg-slate-950 sm:p-7">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-2xl font-medium text-slate-950 dark:text-white">{copy.success}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.receiptDescription}</p>
        <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">{copy.code}</p>
          <p className="mt-2 break-all text-3xl font-medium tracking-[.16em] text-emerald-950 dark:text-emerald-50">{receipt.claimCode}</p>
          <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-200">{receipt.preticketNumber}</p>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left dark:bg-slate-900">
          <span className="text-sm text-slate-500 dark:text-slate-400">{copy.total}</span>
          <span className="text-xl font-medium text-slate-950 dark:text-white">{new Intl.NumberFormat(locale, { style: 'currency', currency: receipt.currencyCode }).format(Number(receipt.totalAmount))}</span>
        </div>
        <Button type="button" onClick={resetPreticket} className="mt-5 min-h-14 w-full rounded-2xl bg-rose-600 text-base text-white hover:bg-rose-700">
          <Plus className="h-5 w-5" aria-hidden="true" />{copy.newPreticket}
        </Button>
      </div>
    </section>
  );

  return (
    <div className="relative grid gap-4 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0" data-multi-kiosk-pos>
      <section className="min-w-0 bg-white p-3 dark:bg-slate-950 sm:rounded-2xl sm:border sm:border-slate-200 sm:p-4 sm:shadow-sm sm:dark:border-slate-700 sm:dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-700"><Store className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><h3 className="truncate text-base font-medium text-slate-950 dark:text-white">{bootstrap.name}</h3><p className="truncate text-xs text-slate-500">{bootstrap.warehouseName} · {bootstrap.cashRegisterName}</p></div>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">{currency}</span>
        </div>
        <div className="sticky top-0 z-10 -mx-3 mt-3 border-y border-slate-100 bg-white/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <span className="sr-only">{copy.search}</span>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.search} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          {categories.length ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label={copy.search}>
              {[copy.all, ...categories].map((label, index) => {
                const value = index === 0 ? 'all' : label;
                const selected = category === value;
                return (
                  <button
                    key={value}
                    aria-pressed={selected}
                    type="button"
                    onClick={() => setCategory(value)}
                    className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-medium ${selected ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {visibleItems.map(item => {
            const quantity = quantities[item.productId] ?? 0;
            return (
              <article key={item.productId} className={`flex min-h-40 flex-col rounded-2xl border bg-white p-3 transition-colors dark:bg-slate-950 ${quantity > 0 ? 'border-rose-400 ring-2 ring-rose-500/10 dark:border-rose-700' : 'border-slate-200 dark:border-slate-700'}`}>
                <p className="line-clamp-2 text-sm font-medium text-slate-950 dark:text-white">{item.name}</p>
                <p className="mt-1 truncate text-[11px] text-slate-500">{item.sku || item.category}</p>
                <p className="mt-2 text-sm font-medium text-rose-700 dark:text-rose-300">{new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(item.unitPrice))}</p>
                <div className="mt-auto flex items-center justify-between gap-1 pt-3">
                  <button aria-label={`${copy.cart}: ${item.name} -`} type="button" disabled={quantity === 0} onClick={() => changeQuantity(item.productId, -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 disabled:opacity-30 dark:border-slate-700"><Minus className="h-4 w-4" /></button>
                  <span className="min-w-6 text-center text-base font-medium">{quantity}</span>
                  <button aria-label={`${copy.cart}: ${item.name} +`} type="button" disabled={!item.available} onClick={() => changeQuantity(item.productId, 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-rose-600 text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                </div>
              </article>
            );
          })}
        </div>
        {visibleItems.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">{copy.empty}</div> : null}
      </section>
      <aside className="hidden h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:sticky lg:top-3 lg:block">
        <div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-rose-700" /><h3 className="text-base font-medium text-slate-950 dark:text-white">{copy.cart}</h3><span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs">{count}</span></div>
        {selectedItems.length ? <ul className="mt-3 divide-y divide-slate-100">{selectedItems.map(item => <li key={item.productId} className="flex gap-3 py-3 text-sm"><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="font-medium">× {quantities[item.productId]}</span></li>)}</ul> : <p className="my-6 text-center text-sm text-slate-500">{copy.empty}</p>}
        {bootstrap.customerNameRequired ? <label className="mt-3 block"><span className="mb-2 block text-xs font-medium text-slate-600">{copy.name} *</span><input value={customerName} onChange={event => setCustomerName(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-base outline-none focus:border-rose-400" /></label> : null}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm text-slate-500">{copy.total}</span><span className="text-lg font-medium text-slate-950 dark:text-white">{formattedTotal}</span></div>
        <Button type="button" disabled={!canCreate} onClick={() => void create()} className="mt-4 min-h-12 w-full rounded-2xl bg-rose-600 text-base text-white hover:bg-rose-700">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}{copy.create}</Button>
        {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden" data-preticket-cart-bar>
        <button type="button" disabled={count === 0} onClick={() => setCartOpen(true)} className="mx-auto flex min-h-14 w-full max-w-[31rem] items-center gap-3 rounded-2xl bg-[#222831] px-4 text-left text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-45">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {count > 0 ? <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#FF6B5E] px-1 text-[10px] font-medium text-[#222831]">{count}</span> : null}
          </span>
          <span className="min-w-0 flex-1"><span className="block text-xs text-slate-300">{copy.itemCount(count)}</span><span className="block text-sm font-medium">{copy.viewCart}</span></span>
          <span className="text-lg font-medium">{formattedTotal}</span>
        </button>
      </div>
      <KioskModalFrame
        open={cartOpen}
        onOpenChange={setCartOpen}
        busy={busy}
        surface="public"
        size="form"
        tone="coral"
        icon={<ShoppingBag className="h-5 w-5" />}
        eyebrow={copy.itemCount(count)}
        title={copy.cart}
        description={copy.cartDescription}
        footerSummary={`${copy.total}: ${formattedTotal}`}
        footer={(
          <>
            <Button variant="outline" type="button" onClick={() => setCartOpen(false)} disabled={busy} className="min-h-12">{copy.continueShopping}</Button>
            <Button type="button" disabled={!canCreate} onClick={() => void create()} className="min-h-12 bg-[#222831] text-white hover:bg-slate-800">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}{copy.create}</Button>
          </>
        )}
      >
        {selectedItems.length ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {selectedItems.map(item => (
              <li key={item.productId} className="flex items-center gap-2 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-950 dark:text-white">{item.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(item.unitPrice))}</span>
                </span>
                <button aria-label={`${item.name} -`} type="button" onClick={() => changeQuantity(item.productId, -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Minus className="h-4 w-4" /></button>
                <span className="min-w-6 text-center text-base font-medium">{quantities[item.productId]}</span>
                <button aria-label={`${item.name} +`} type="button" onClick={() => changeQuantity(item.productId, 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-rose-600 text-white"><Plus className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        ) : <p className="py-8 text-center text-sm text-slate-500">{copy.empty}</p>}
        {bootstrap.customerNameRequired ? <label className="mt-4 block"><span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{copy.name} *</span><input value={customerName} onChange={event => setCustomerName(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-slate-700 dark:bg-slate-900" /></label> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </KioskModalFrame>
    </div>
  );
}

function RestaurantMultiKioskWorkspace({
  token, kioskId, workspace, locale, onAuthorizationFailure, onRefresh,
}: PointOfSaleMultiKioskWorkspaceProps) {
  const copy = copyFor(locale);
  const [current, setCurrent] = useState<RestaurantWorkspace>(workspace.bootstrap as RestaurantWorkspace);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mutationInFlightRef = useRef(false);

  useEffect(() => setCurrent(workspace.bootstrap as RestaurantWorkspace), [workspace.bootstrap]);
  useEffect(() => {
    const interval = window.setInterval(() => void onRefresh().catch(() => undefined), 5_000);
    return () => window.clearInterval(interval);
  }, [onRefresh]);

  const mutate: RestaurantWorkspaceMutation = async (capability, payload) => {
    if (mutationInFlightRef.current) return false;
    mutationInFlightRef.current = true;
    setBusy(true); setError('');
    try {
      const next = await multiKioskPublicApi.action<RestaurantWorkspace>(
        token, kioskId, `${capability}@1`, payload, csrfFor(token));
      setCurrent(next);
      return true;
    } catch (failure) {
      if (!onAuthorizationFailure(failure)) setError(copy.restaurantError);
      return false;
    } finally {
      mutationInFlightRef.current = false;
      setBusy(false);
    }
  };

  if (!current) return null;
  return <section className="relative bg-slate-100 dark:bg-slate-950 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-slate-700" aria-busy={busy || undefined} data-multi-kiosk-pos data-pos-restaurant-workspace>
    {busy ? <p role="status" className="sticky top-0 z-40 flex min-h-12 items-center justify-center gap-2 border-b border-rose-200 bg-rose-50/95 px-3 text-sm font-medium text-rose-800 backdrop-blur dark:border-rose-900 dark:bg-rose-950/90 dark:text-rose-200"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{copy.updating}</p> : null}
    {error ? <p role="alert" className="m-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {!current.sourceRegisterOpen ? <p className="m-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{copy.unavailable}</p> : null}
    <WaiterStationWorkspace workspace={current} mutate={mutate} />
  </section>;
}
