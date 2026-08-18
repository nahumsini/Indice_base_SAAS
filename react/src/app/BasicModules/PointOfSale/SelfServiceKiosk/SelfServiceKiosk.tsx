import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Maximize2, Minimize2, Minus, Plus, RefreshCw, Search, ShoppingBasket, Store, Trash2, WifiOff, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import freshSandwichImage from '../../../../assets/pos/self-checkout/fresh-sandwich.png';
import naturalWaterImage from '../../../../assets/pos/self-checkout/natural-water.png';
import orangeJuiceImage from '../../../../assets/pos/self-checkout/orange-juice.png';
import vanillaIceCreamImage from '../../../../assets/pos/self-checkout/vanilla-ice-cream.png';
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
import { SourceRegisterClosedState } from './SourceRegisterClosedState';

const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);
const preticketOperation = 'pos-self-service-preticket';
type SelfServiceError = null
  | { code: 'offline' | 'unavailable' | 'nameRequired' | 'submitError' }
  | { code: 'maxItemsReached'; limit: number };

const formatCurrency = (amount: number | string, currency: string, locale: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: currency || 'MXN',
}).format(numberValue(amount));

function productImage(item: SelfServiceCatalogItem, index: number) {
  const searchable = `${item.name} ${item.category ?? ''}`.toLocaleLowerCase();
  if (/agua|water|refresco|cola|soda/.test(searchable)) return naturalWaterImage;
  if (/helado|ice cream|chocolate|galleta|cookie/.test(searchable)) return vanillaIceCreamImage;
  if (/jugo|naranja|juice|orange/.test(searchable)) return orangeJuiceImage;
  if (/sandwich|sándwich|pan|bread/.test(searchable)) return freshSandwichImage;
  return [freshSandwichImage, naturalWaterImage, orangeJuiceImage, vanillaIceCreamImage][index % 4];
}

export default function SelfServiceKiosk() {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const { publicAccessToken = '' } = useParams();
  const navigate = useNavigate();
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
  const [cartPanelOpen, setCartPanelOpen] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const kioskWorkspaceRef = useRef<HTMLDivElement>(null);
  const cartDialogCloseRef = useRef<HTMLButtonElement>(null);
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
    if (!cartPanelOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cartDialogCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCartPanelOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [cartPanelOpen]);

  useEffect(() => {
    const updateFullscreenState = () => setFullscreenActive(document.fullscreenElement === kioskWorkspaceRef.current);
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await kioskWorkspaceRef.current?.requestFullscreen();
  };

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
        if (cancelled) return;
        if (response.kioskType === 'self_checkout') {
          navigate(`/pos-self-checkout/${encodeURIComponent(publicAccessToken)}`, { replace: true });
          return;
        }
        setLoadedBootstrap(response);
      })
      .catch(() => {
        if (!cancelled) setError({ code: 'unavailable' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [navigate, publicAccessToken, reloadKey]);

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
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

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
      setCartPanelOpen(false);
    } catch {
      setError({ code: 'submitError' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!viewLoading && bootstrap && !bootstrap.sourceRegisterOpen) {
    return (
      <SourceRegisterClosedState
        registerName={bootstrap.cashRegisterName}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  return (
    <div ref={kioskWorkspaceRef} className="min-h-dvh bg-slate-100 dark:bg-slate-950">
    <KioskPublicShell
      maxWidthClassName="max-w-[1680px]"
      minimalContent
      lockDesktopViewport
      immersive={fullscreenActive}
      errorMessage={viewError || null}
      banners={!online ? (
        <div role="status" className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          <WifiOff className="h-4 w-4" /> {copy.selfServicePublic.offline}
        </div>
      ) : null}
      header={(
        <header className="border-b border-teal-800/20 bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#14B8A6] px-4 py-4 text-white sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/25 backdrop-blur"><Store /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-teal-50/85">{copy.selfServicePublic.eyebrow}</p>
              <h1 className="truncate text-xl font-medium sm:text-2xl">
                {bootstrap?.name ?? copy.selfServicePublic.preparingCatalog}
              </h1>
              {bootstrap ? (
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-teal-50/90 sm:text-sm">
                  <span className="truncate font-medium">{bootstrap.companyName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{bootstrap.warehouseName}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium">{copy.selfServicePublic.pickupAt(bootstrap.cashRegisterName)}</span>
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => void toggleFullscreen()} className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20" aria-label={copy.selfCheckoutFrame.fullscreen} aria-pressed={fullscreenActive} title={copy.selfCheckoutFrame.fullscreen}>{fullscreenActive ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}</button>
          </div>
        </header>
      )}
    >
      {viewLoading ? (
        <div className="grid flex-1 place-items-center py-20 text-sm font-medium text-slate-500">{copy.selfServicePublic.loading}</div>
      ) : null}

      {!viewLoading && !bootstrap ? (
        <div className="grid flex-1 place-items-center px-4 py-20 text-center">
          <button
            type="button"
            disabled={!online}
            onClick={() => setReloadKey((current) => current + 1)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <RefreshCw className="h-4 w-4" /> {copy.selfServicePublic.retry}
          </button>
        </div>
      ) : null}

      {!viewLoading && bootstrap && preticket ? (
        <PreticketSuccess
          preticket={preticket}
          bootstrap={bootstrap}
          onNew={() => {
            setPreticket(null);
            setSearch('');
            setCategory('all');
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
          }}
        />
      ) : null}

      {!viewLoading && bootstrap && !preticket ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="z-10 shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <label className="relative block">
                <span className="sr-only">{copy.selfServicePublic.searchLabel}</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.selfServicePublic.searchPlaceholder}
                  className="h-13 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={copy.selfServicePublic.categoryFilterLabel}>
                {[copy.selfServicePublic.allCategories, ...categories].map((label, index) => {
                  const value = index === 0 ? 'all' : label;
                  return <button type="button" key={value} onClick={() => setCategory(value)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium transition ${category === value ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200'}`}>{label}</button>;
                })}
              </div>
          </div>

          <section className={`min-w-0 pb-24 ${fullscreenActive ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1' : 'xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1'}`}>
            {visibleItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center text-sm font-medium text-slate-500">
                {copy.selfServicePublic.emptyResults}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">
                {visibleItems.map((item, index) => {
                  const quantity = cart[item.productId] ?? 0;
                  return (
                    <article key={item.productId} className="group flex min-h-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        <img src={productImage(item, index)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-teal-800 shadow-sm backdrop-blur">{item.category || copy.selfServicePublic.product}</span>
                        {quantity > 0 ? <span className="absolute right-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-[#222831] px-2 text-xs font-medium text-white shadow">{quantity}</span> : null}
                      </div>
                      <div className="flex flex-1 flex-col p-3 sm:p-4">
                      <h2 className="line-clamp-2 min-h-10 text-sm font-medium text-slate-950 dark:text-white sm:text-base">{item.name}</h2>
                      <p className="mt-1 truncate text-[11px] text-slate-400">{item.sku || copy.selfServicePublic.noCode}</p>
                      {item.description ? <p className="mt-2 hidden line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300 sm:block">{item.description}</p> : null}
                      <div className="mt-auto pt-3">
                        <div className="flex items-end justify-between gap-2">
                          <strong className="text-lg text-teal-700 sm:text-xl">{formatCurrency(item.unitPrice, item.currencyCode, locale)}</strong>
                          {bootstrap.showStock && item.stockTracked ? (
                            <span className="hidden text-[11px] font-medium text-slate-500 sm:inline">{numberValue(item.availableQuantity)} {copy.selfServicePublic.available}</span>
                          ) : null}
                        </div>
                        {quantity === 0 ? (
                          <button
                            type="button"
                            disabled={!item.available}
                            onClick={() => changeQuantity(item, 1)}
                            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Plus className="h-4 w-4" /> {item.available ? copy.selfServicePublic.add : copy.selfServicePublic.unavailableItem}
                          </button>
                        ) : (
                          <div className="mt-3 grid grid-cols-[48px_1fr_48px] items-center overflow-hidden rounded-xl border border-teal-200">
                            <button type="button" onClick={() => changeQuantity(item, -1)} className="grid h-12 place-items-center text-teal-700" aria-label={copy.selfServicePublic.removeItem(item.name)}><Minus className="h-4 w-4" /></button>
                            <span className="text-center text-sm font-medium">{quantity}</span>
                            <button type="button" onClick={() => changeQuantity(item, 1)} className="grid h-12 place-items-center bg-teal-600 text-white" aria-label={copy.selfServicePublic.addItem(item.name)}><Plus className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-700/80 bg-[#222831]/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-12px_30px_rgba(15,23,42,0.22)] backdrop-blur">
            <div className="mx-auto flex max-w-[1680px] items-center gap-3">
              <div className="min-w-0 flex-1"><p className="text-[11px] text-slate-300">{itemCount} {copy.selfServicePublic.items}</p><p className="truncate text-xl font-medium">{formatCurrency(total, bootstrap.currencyCode, locale)}</p></div>
              <button type="button" onClick={() => setCartPanelOpen(true)} className="inline-flex h-13 items-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#ff7c71] sm:px-7"><ShoppingBasket className="h-5 w-5" />{copy.selfServicePublic.selection}<span className="rounded-full bg-[#222831] px-2 py-0.5 text-xs text-white">{itemCount}</span></button>
            </div>
          </div>
        </div>
      ) : null}

      {!viewLoading && bootstrap && !preticket && cartPanelOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-6 xl:p-10">
          <button type="button" className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[2px]" onClick={() => setCartPanelOpen(false)} aria-label={copy.common.cancel} />
          <section role="dialog" aria-modal="true" aria-labelledby="self-service-cart-title" className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/50 bg-slate-50 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-h-[calc(100dvh-3rem)]">
            <header className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-4 py-4 text-white sm:px-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><ShoppingBasket className="h-6 w-6" /></span>
              <div className="min-w-0"><h2 id="self-service-cart-title" className="text-xl font-medium sm:text-2xl">{copy.selfServicePublic.selection}</h2><p className="text-xs text-teal-50/85 sm:text-sm">{itemCount} {copy.selfServicePublic.items}</p></div>
              <span className="ml-auto rounded-full bg-white/15 px-3 py-1 text-sm font-medium">{itemCount}</span>
              <button ref={cartDialogCloseRef} type="button" onClick={() => setCartPanelOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20" aria-label={copy.common.cancel}><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
              <CartPanel hideHeading bootstrap={bootstrap} cartLines={cartLines} total={total} customerName={customerName} customerEmail={customerEmail} customerPhone={customerPhone} online={online} submitting={submitting} onNameChange={setCustomerName} onEmailChange={setCustomerEmail} onPhoneChange={setCustomerPhone} onRemove={(productId) => setCart((current) => { const next = { ...current }; delete next[productId]; return next; })} onSubmit={() => void submit()} />
            </div>
          </section>
        </div>
      ) : null}
    </KioskPublicShell>
    </div>
  );
}

function CartPanel({ bootstrap, cartLines, total, customerName, customerEmail, customerPhone, online, submitting, hideHeading = false, onNameChange, onEmailChange, onPhoneChange, onRemove, onSubmit }: {
  bootstrap: SelfServiceBootstrap;
  cartLines: Array<{ product: SelfServiceCatalogItem; quantity: number }>;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  online: boolean;
  submitting: boolean;
  hideHeading?: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onRemove: (productId: number) => void;
  onSubmit: () => void;
}) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  return <div>
    {!hideHeading ? <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 text-teal-700"><ShoppingBasket className="h-5 w-5" /></span><div><h2 className="text-lg font-medium">{copy.selfServicePublic.selection}</h2><p className="text-xs text-slate-500">{itemCount} {copy.selfServicePublic.items}</p></div><span className="ml-auto rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800">{itemCount}</span></div> : null}
    <div className={`${hideHeading ? '' : 'mt-4'} max-h-64 space-y-2 overflow-y-auto pr-1`}>
      {cartLines.length === 0 ? <p className="rounded-xl bg-white px-3 py-10 text-center text-sm font-medium text-slate-500 dark:bg-slate-950">{copy.selfServicePublic.emptyCart}</p> : null}
      {cartLines.map(({ product, quantity }) => <div key={product.productId} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-950"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-xs text-slate-500">{quantity} × {formatCurrency(product.unitPrice, product.currencyCode, locale)}</p></div><strong className="text-sm">{formatCurrency(numberValue(product.unitPrice) * quantity, product.currencyCode, locale)}</strong><button type="button" onClick={() => onRemove(product.productId)} aria-label={copy.selfServicePublic.deleteItem(product.name)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}
    </div>
    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700"><span className="font-medium">{copy.selfServicePublic.estimatedTotal}</span><strong className="text-2xl text-teal-700">{formatCurrency(total, bootstrap.currencyCode, locale)}</strong></div>
    <div className="mt-4 grid gap-3">
      <KioskCustomerField label={`${copy.selfServicePublic.name}${bootstrap.customerNameRequired ? ' *' : ` (${copy.selfServicePublic.optional})`}`} value={customerName} onChange={onNameChange} autoComplete="name" />
      <KioskCustomerField label={`${copy.selfServicePublic.email} (${copy.selfServicePublic.optional})`} value={customerEmail} onChange={onEmailChange} autoComplete="email" type="email" />
      <KioskCustomerField label={`${copy.selfServicePublic.phone} (${copy.selfServicePublic.optional})`} value={customerPhone} onChange={onPhoneChange} autoComplete="tel" type="tel" maxLength={40} />
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">{copy.selfServicePublic.disclaimer}</p>
    <button type="button" disabled={!online || submitting || cartLines.length === 0} onClick={onSubmit} className="mt-4 inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#ff7c71] disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBasket className="h-5 w-5" />{submitting ? copy.selfServicePublic.creating : copy.selfServicePublic.createPreticket}</button>
  </div>;
}

function KioskCustomerField({ label, value, onChange, autoComplete, type = 'text', maxLength = 180 }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; type?: string; maxLength?: number }) {
  return <label className="grid gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} type={type} maxLength={maxLength} className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>;
}

function PreticketSuccess({ preticket, bootstrap, onNew }: { preticket: SelfServicePreticketReceipt; bootstrap: SelfServiceBootstrap; onNew: () => void }) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const [savingImage, setSavingImage] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(5);

  useEffect(() => {
    if (savingImage) return;
    setSecondsRemaining(5);
    let remaining = 5;
    const intervalId = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(intervalId);
        onNew();
        return;
      }
      setSecondsRemaining(remaining);
    }, 1_000);
    return () => window.clearInterval(intervalId);
  }, [onNew, savingImage]);

  const saveImage = async () => {
    setSavingImage(true);
    try {
      const blob = await createPreticketImage({ preticket, bootstrap, locale, copy: copy.selfServicePublic });
      const filename = `pre-ticket-${preticket.claimCode}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const canShareFile = typeof navigator.share === 'function'
        && (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));
      if (canShareFile) {
        await navigator.share({ files: [file], title: copy.selfServicePublic.ready });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        window.alert(copy.selfServicePublic.imageError);
      }
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-1 py-6 text-center sm:py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60 dark:bg-emerald-950/40 dark:ring-emerald-950/20"><CheckCircle2 className="h-12 w-12 text-emerald-600" /></span>
        <p className="mt-5 text-sm font-medium text-emerald-700">{copy.selfServicePublic.ready}</p>
        <h2 className="mt-2 text-2xl font-medium sm:text-3xl">{copy.selfServicePublic.showCode}</h2>
        <div className="mt-6 w-full overflow-hidden rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 px-3 py-6 sm:px-10 sm:py-8 dark:bg-teal-950/30">
          <p className="font-mono text-[clamp(4rem,14vw,8rem)] font-medium leading-none text-teal-800 tabular-nums dark:text-teal-200">{preticket.claimCode}</p>
        </div>
        <dl className="mt-5 grid w-full grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-900"><dt className="text-xs font-medium text-slate-500">{copy.selfServicePublic.items}</dt><dd className="mt-1 text-lg font-medium">{preticket.itemCount}</dd></div>
          <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-900"><dt className="text-xs font-medium text-slate-500">{copy.selfServicePublic.estimatedTotal}</dt><dd className="mt-1 text-lg font-medium">{formatCurrency(preticket.totalAmount, preticket.currencyCode, locale)}</dd></div>
        </dl>
        <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.selfServicePublic.expires(new Date(preticket.expiresAt).toLocaleString(locale))}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={savingImage} onClick={() => void saveImage()} className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"><Download className="h-5 w-5" />{savingImage ? copy.selfServicePublic.preparingImage : copy.selfServicePublic.saveImage}</button>
          <button type="button" onClick={onNew} className="h-13 rounded-xl border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{copy.selfServicePublic.createAnother}</button>
        </div>
        <div className="mt-5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 bg-teal-500 transition-[width] duration-300" style={{ width: `${(secondsRemaining / 5) * 100}%` }} /></div>
        <p className="mt-2 text-xs font-medium text-slate-500">{copy.selfServicePublic.returningIn(secondsRemaining)}</p>
      </div>
    </div>
  );
}

async function createPreticketImage({ preticket, bootstrap, locale, copy }: {
  preticket: SelfServicePreticketReceipt;
  bootstrap: SelfServiceBootstrap;
  locale: string;
  copy: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']['selfServicePublic'];
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');

  context.fillStyle = '#F8FAFC';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const header = context.createLinearGradient(0, 0, canvas.width, 0);
  header.addColorStop(0, '#0F766E');
  header.addColorStop(1, '#14B8A6');
  context.fillStyle = header;
  context.fillRect(0, 0, canvas.width, 300);

  context.fillStyle = '#FFFFFF';
  context.font = '500 34px system-ui, sans-serif';
  context.fillText(copy.eyebrow, 80, 90);
  context.font = '700 62px system-ui, sans-serif';
  context.fillText(bootstrap.name, 80, 175, 1040);
  context.font = '500 30px system-ui, sans-serif';
  context.fillText(copy.pickupAt(bootstrap.cashRegisterName), 80, 245, 1040);

  context.textAlign = 'center';
  context.fillStyle = '#047857';
  context.font = '600 34px system-ui, sans-serif';
  context.fillText(copy.ready, 600, 410);
  context.fillStyle = '#0F172A';
  context.font = '700 52px system-ui, sans-serif';
  context.fillText(copy.showCode, 600, 490, 1040);

  context.fillStyle = '#ECFDF5';
  roundCanvasRect(context, 90, 560, 1020, 330, 32);
  context.fill();
  context.strokeStyle = '#2DD4BF';
  context.lineWidth = 5;
  context.setLineDash([18, 12]);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = '#115E59';
  context.font = '700 180px ui-monospace, monospace';
  context.fillText(preticket.claimCode, 600, 735, 930);
  context.font = '500 30px system-ui, sans-serif';
  context.fillText(preticket.preticketNumber, 600, 820, 930);

  context.textAlign = 'left';
  context.fillStyle = '#E2E8F0';
  roundCanvasRect(context, 90, 950, 490, 170, 24);
  context.fill();
  roundCanvasRect(context, 620, 950, 490, 170, 24);
  context.fill();
  context.fillStyle = '#64748B';
  context.font = '500 28px system-ui, sans-serif';
  context.fillText(copy.items, 130, 1010);
  context.fillText(copy.estimatedTotal, 660, 1010);
  context.fillStyle = '#0F172A';
  context.font = '700 48px system-ui, sans-serif';
  context.fillText(String(preticket.itemCount), 130, 1080);
  context.fillText(formatCurrency(preticket.totalAmount, preticket.currencyCode, locale), 660, 1080, 400);

  context.textAlign = 'center';
  context.fillStyle = '#475569';
  context.font = '400 28px system-ui, sans-serif';
  wrapCanvasText(context, copy.expires(new Date(preticket.expiresAt).toLocaleString(locale)), 600, 1210, 1000, 42);
  context.fillStyle = '#94A3B8';
  context.font = '400 24px system-ui, sans-serif';
  wrapCanvasText(context, copy.disclaimer, 600, 1350, 1000, 36);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image unavailable')), 'image/png'));
}

function roundCanvasRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = '';
  let lineY = y;
  words.forEach((word) => {
    const candidate = `${line}${line ? ' ' : ''}${word}`;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = candidate;
    }
  });
  if (line) context.fillText(line, x, lineY);
}
