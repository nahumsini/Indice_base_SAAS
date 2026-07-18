import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus, RefreshCw, Search, ShoppingBasket, Store, Trash2, WifiOff } from 'lucide-react';
import { useParams } from 'react-router';
import { KioskPublicShell } from '../../../components/kiosk-engine/KioskPublicShell';
import {
  completeKioskIdempotentOperation,
  kioskIdempotencyKeyFor,
} from '../../../components/kiosk-engine/kioskIdempotency';
import { usePointOfSaleKioskTranslations } from '../Kiosks/kioskTranslations';
import {
  selfServiceKioskApi,
  type SelfServiceBootstrap,
  type SelfServiceCatalogItem,
  type SelfServicePreticketReceipt,
} from './selfServiceKioskApi';

const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);
const preticketOperation = 'pos-self-service-preticket';
type SelfServiceError = null
  | { code: 'offline' | 'unavailable' | 'nameRequired' | 'submitError' }
  | { code: 'maxItemsReached'; limit: number };

const formatCurrency = (amount: number | string, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: currency || 'MXN',
}).format(numberValue(amount));

export default function SelfServiceKiosk() {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const { publicAccessToken = '' } = useParams();
  const [loadedBootstrap, setLoadedBootstrap] = useState<SelfServiceBootstrap | null>(null);
  const [bootstrapToken, setBootstrapToken] = useState(publicAccessToken);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SelfServiceError>(null);
  const [preticket, setPreticket] = useState<SelfServicePreticketReceipt | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [reloadKey, setReloadKey] = useState(0);
  const bootstrap = bootstrapToken === publicAccessToken ? loadedBootstrap : null;
  const viewLoading = bootstrapToken === publicAccessToken ? loading : true;
  const viewError = bootstrapToken !== publicAccessToken || !error
    ? ''
    : error.code === 'maxItemsReached'
      ? copy.selfServicePublic.maxItemsReached(error.limit)
      : copy.selfServicePublic[error.code];

  useEffect(() => {
    const updateNetworkState = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        setError((current) => current?.code === 'offline' ? null : current);
      }
    };
    window.addEventListener('online', updateNetworkState);
    window.addEventListener('offline', updateNetworkState);
    return () => {
      window.removeEventListener('online', updateNetworkState);
      window.removeEventListener('offline', updateNetworkState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBootstrapToken(publicAccessToken);
    setLoadedBootstrap(null);
    setCart({});
    setSearch('');
    setCategory('all');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setPreticket(null);
    setError(null);
    setLoading(true);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError({ code: 'offline' });
      setLoading(false);
      return () => { cancelled = true; };
    }
    selfServiceKioskApi.bootstrap(publicAccessToken)
      .then((response) => {
        if (!cancelled) setLoadedBootstrap(response);
      })
      .catch(() => {
        if (!cancelled) setError({ code: 'unavailable' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [publicAccessToken, reloadKey]);

  const categories = useMemo(() => Array.from(new Set(
    (bootstrap?.items ?? []).map((item) => item.category).filter((value): value is string => Boolean(value)),
  )).sort(), [bootstrap?.items]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    return (bootstrap?.items ?? []).filter((item) => (
      (category === 'all' || item.category === category)
      && (!query || `${item.name} ${item.sku ?? ''} ${item.category ?? ''}`.toLocaleLowerCase(locale).includes(query))
    ));
  }, [bootstrap?.items, category, locale, search]);

  const cartLines = useMemo(() => Object.entries(cart).flatMap(([productId, quantity]) => {
    const product = bootstrap?.items.find((item) => item.productId === Number(productId));
    return product && quantity > 0 ? [{ product, quantity }] : [];
  }), [bootstrap?.items, cart]);

  const total = cartLines.reduce(
    (sum, line) => sum + numberValue(line.product.unitPrice) * line.quantity,
    0,
  );

  const changeQuantity = (item: SelfServiceCatalogItem, delta: number) => {
    setPreticket(null);
    if (delta > 0
        && !cart[item.productId]
        && bootstrap
        && Object.keys(cart).length >= bootstrap.maxItemsPerTicket) {
      setError({ code: 'maxItemsReached', limit: bootstrap.maxItemsPerTicket });
      return;
    }
    setError(null);
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[item.productId] ?? 0) + delta);
      const maxStock = item.stockTracked && bootstrap?.showStock
        ? Math.floor(numberValue(item.availableQuantity))
        : Number.MAX_SAFE_INTEGER;
      const bounded = Math.min(nextQuantity, maxStock);
      if (bounded === 0) {
        const next = { ...current };
        delete next[item.productId];
        return next;
      }
      return { ...current, [item.productId]: bounded };
    });
  };

  const submit = async () => {
    if (!bootstrap || cartLines.length === 0) return;
    if (!online) {
      setError({ code: 'offline' });
      return;
    }
    if (bootstrap.customerNameRequired && !customerName.trim()) {
      setError({ code: 'nameRequired' });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cartLines.map((line) => ({ productId: line.product.productId, quantity: line.quantity })),
      };
      const result = await selfServiceKioskApi.createPreticket(
        publicAccessToken,
        bootstrap.csrfToken,
        payload,
        kioskIdempotencyKeyFor(preticketOperation, payload),
      );
      completeKioskIdempotentOperation(preticketOperation);
      setPreticket(result);
      setCart({});
    } catch {
      setError({ code: 'submitError' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KioskPublicShell
      maxWidthClassName="max-w-[1500px]"
      errorMessage={viewError || null}
      banners={!online ? (
        <div role="status" className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-800">
          <WifiOff className="h-4 w-4" /> {copy.selfServicePublic.offline}
        </div>
      ) : null}
      header={(
        <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-600 text-white"><Store /></span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{copy.selfServicePublic.eyebrow}</p>
              <h1 className="truncate text-xl font-black text-slate-950 dark:text-white">
                {bootstrap?.name ?? copy.selfServicePublic.preparingCatalog}
              </h1>
              {bootstrap ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <p className="truncate font-semibold">{bootstrap.companyName}</p>
                  <p className="truncate">{bootstrap.unitName} · {bootstrap.businessName} · {bootstrap.warehouseName}</p>
                  <p className="truncate">{copy.selfServicePublic.pickupAt(bootstrap.cashRegisterName)}</p>
                </div>
              ) : null}
            </div>
          </div>
        </header>
      )}
    >
      {viewLoading ? (
        <div className="grid flex-1 place-items-center py-20 text-sm font-bold text-slate-500">{copy.selfServicePublic.loading}</div>
      ) : null}

      {!viewLoading && !bootstrap ? (
        <div className="grid flex-1 place-items-center px-4 py-20 text-center">
          <button
            type="button"
            disabled={!online}
            onClick={() => setReloadKey((current) => current + 1)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <RefreshCw className="h-4 w-4" /> {copy.selfServicePublic.retry}
          </button>
        </div>
      ) : null}

      {!viewLoading && bootstrap && preticket ? (
        <PreticketSuccess
          preticket={preticket}
          onNew={() => {
            setPreticket(null);
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
          }}
        />
      ) : null}

      {!viewLoading && bootstrap && !preticket ? (
        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <span className="sr-only">{copy.selfServicePublic.searchLabel}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.selfServicePublic.searchPlaceholder}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label={copy.selfServicePublic.categoryFilterLabel}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="all">{copy.selfServicePublic.allCategories}</option>
                {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>

            {visibleItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center text-sm font-semibold text-slate-500">
                {copy.selfServicePublic.emptyResults}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleItems.map((item) => {
                  const quantity = cart[item.productId] ?? 0;
                  return (
                    <article key={item.productId} className="flex min-h-56 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{item.category || copy.selfServicePublic.product}</p>
                      <h2 className="mt-2 text-base font-black text-slate-950 dark:text-white">{item.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">{item.sku || copy.selfServicePublic.noCode}</p>
                      {item.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p> : null}
                      <div className="mt-auto pt-4">
                        <div className="flex items-end justify-between gap-2">
                          <strong className="text-xl text-teal-700">{formatCurrency(item.unitPrice, item.currencyCode, locale)}</strong>
                          {bootstrap.showStock && item.stockTracked ? (
                            <span className="text-xs font-bold text-slate-500">{numberValue(item.availableQuantity)} {copy.selfServicePublic.available}</span>
                          ) : null}
                        </div>
                        {quantity === 0 ? (
                          <button
                            type="button"
                            disabled={!item.available}
                            onClick={() => changeQuantity(item, 1)}
                            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Plus className="h-4 w-4" /> {item.available ? copy.selfServicePublic.add : copy.selfServicePublic.unavailableItem}
                          </button>
                        ) : (
                          <div className="mt-3 grid grid-cols-[44px_1fr_44px] items-center overflow-hidden rounded-lg border border-teal-200">
                            <button type="button" onClick={() => changeQuantity(item, -1)} className="grid h-11 place-items-center text-teal-700" aria-label={copy.selfServicePublic.removeItem(item.name)}><Minus className="h-4 w-4" /></button>
                            <span className="text-center text-sm font-black">{quantity}</span>
                            <button type="button" onClick={() => changeQuantity(item, 1)} className="grid h-11 place-items-center bg-teal-600 text-white" aria-label={copy.selfServicePublic.addItem(item.name)}><Plus className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-4">
            <div className="flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-black">{copy.selfServicePublic.selection}</h2>
              <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-xs font-black text-teal-800">{cartLines.length}</span>
            </div>
            <div className="mt-4 space-y-2">
              {cartLines.length === 0 ? <p className="rounded-lg bg-white px-3 py-8 text-center text-sm font-semibold text-slate-500 dark:bg-slate-950">{copy.selfServicePublic.emptyCart}</p> : null}
              {cartLines.map(({ product, quantity }) => (
                <div key={product.productId} className="flex items-center gap-3 rounded-lg bg-white p-3 dark:bg-slate-950">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{product.name}</p>
                    <p className="text-xs text-slate-500">{quantity} × {formatCurrency(product.unitPrice, product.currencyCode, locale)}</p>
                  </div>
                  <strong className="text-sm">{formatCurrency(numberValue(product.unitPrice) * quantity, product.currencyCode, locale)}</strong>
                  <button type="button" onClick={() => { setCart((current) => { const next = { ...current }; delete next[product.productId]; return next; }); }} aria-label={copy.selfServicePublic.deleteItem(product.name)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
              <span className="font-bold">{copy.selfServicePublic.estimatedTotal}</span>
              <strong className="text-2xl text-teal-700">{formatCurrency(total, bootstrap.currencyCode, locale)}</strong>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{copy.selfServicePublic.name}{bootstrap.customerNameRequired ? ' *' : ` (${copy.selfServicePublic.optional})`}</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" maxLength={180} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{copy.selfServicePublic.email} ({copy.selfServicePublic.optional})</span>
                <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} autoComplete="email" type="email" maxLength={180} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{copy.selfServicePublic.phone} ({copy.selfServicePublic.optional})</span>
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" type="tel" maxLength={40} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{copy.selfServicePublic.disclaimer}</p>
            <button type="button" disabled={!online || submitting || cartLines.length === 0} onClick={() => void submit()} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
              <ShoppingBasket className="h-5 w-5" /> {submitting ? copy.selfServicePublic.creating : copy.selfServicePublic.createPreticket}
            </button>
          </aside>
        </div>
      ) : null}
    </KioskPublicShell>
  );
}

function PreticketSuccess({ preticket, onNew }: { preticket: SelfServicePreticketReceipt; onNew: () => void }) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-10 text-center">
      <CheckCircle2 className="h-20 w-20 text-emerald-600" />
      <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-emerald-700">{copy.selfServicePublic.ready}</p>
      <h2 className="mt-2 text-3xl font-black">{copy.selfServicePublic.showCode}</h2>
      <div className="mt-6 w-full max-w-full overflow-hidden rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 px-4 py-6 sm:px-10 dark:bg-teal-950/30">
        <p className="break-all font-mono text-3xl font-black tracking-[0.1em] text-teal-800 sm:text-5xl sm:tracking-[0.16em] dark:text-teal-200">{preticket.claimCode}</p>
        <p className="mt-2 text-xs font-bold text-teal-700">{preticket.preticketNumber}</p>
      </div>
      <dl className="mt-6 grid w-full grid-cols-2 gap-3 text-left">
        <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900"><dt className="text-xs font-bold text-slate-500">{copy.selfServicePublic.items}</dt><dd className="mt-1 text-lg font-black">{preticket.itemCount}</dd></div>
        <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900"><dt className="text-xs font-bold text-slate-500">{copy.selfServicePublic.estimatedTotal}</dt><dd className="mt-1 text-lg font-black">{formatCurrency(preticket.totalAmount, preticket.currencyCode, locale)}</dd></div>
      </dl>
      <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">{copy.selfServicePublic.expires(new Date(preticket.expiresAt).toLocaleString(locale))}</p>
      <button type="button" onClick={onNew} className="mt-7 h-11 rounded-lg border border-slate-300 bg-white px-6 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{copy.selfServicePublic.createAnother}</button>
    </div>
  );
}
