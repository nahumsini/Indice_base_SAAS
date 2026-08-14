import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  WifiOff,
} from 'lucide-react';
import { useParams } from 'react-router';
import freshSandwichImage from '../../../../assets/pos/self-checkout/fresh-sandwich.png';
import naturalWaterImage from '../../../../assets/pos/self-checkout/natural-water.png';
import orangeJuiceImage from '../../../../assets/pos/self-checkout/orange-juice.png';
import vanillaIceCreamImage from '../../../../assets/pos/self-checkout/vanilla-ice-cream.png';
import { usePointOfSaleKioskTranslations } from '../Kiosks/kioskTranslations';
import {
  selfServiceKioskApi,
  type SelfServiceBootstrap,
  type SelfServiceCatalogItem,
} from '../SelfServiceKiosk/selfServiceKioskApi';

type SelfCheckoutStep = 'products' | 'cart' | 'payment';
type PaymentMethod = 'card' | 'cash' | 'transfer';

const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'MXN',
  }).format(amount);
}

function productImage(item: SelfServiceCatalogItem, index: number) {
  const searchable = `${item.name} ${item.category ?? ''}`.toLocaleLowerCase();
  if (/agua|water/.test(searchable)) return naturalWaterImage;
  if (/helado|ice cream/.test(searchable)) return vanillaIceCreamImage;
  if (/jugo|naranja|juice|orange/.test(searchable)) return orangeJuiceImage;
  if (/sandwich|sándwich|pan|bread/.test(searchable)) return freshSandwichImage;
  return [naturalWaterImage, vanillaIceCreamImage, freshSandwichImage, orangeJuiceImage][index % 4];
}

export default function SelfCheckoutKiosk() {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const { publicAccessToken = '' } = useParams();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [bootstrap, setBootstrap] = useState<SelfServiceBootstrap | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [step, setStep] = useState<SelfCheckoutStep>('products');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === terminalRef.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    setBootstrap(null);
    setCart({});
    setStep('products');
    setPaymentMethod(null);
    if (!publicAccessToken || !navigator.onLine) {
      setUnavailable(true);
      setLoading(false);
      return () => { cancelled = true; };
    }
    selfServiceKioskApi.bootstrap(publicAccessToken)
      .then((response) => {
        if (!cancelled) setBootstrap(response);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [publicAccessToken, reloadKey]);

  const categories = useMemo(() => Array.from(new Set(
    (bootstrap?.items ?? [])
      .map((item) => item.category)
      .filter((value): value is string => Boolean(value)),
  )).sort(), [bootstrap?.items]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    return (bootstrap?.items ?? []).filter((item) => (
      (category === 'all' || item.category === category)
      && (!query || `${item.name} ${item.sku ?? ''} ${item.category ?? ''}`
        .toLocaleLowerCase(locale)
        .includes(query))
    ));
  }, [bootstrap?.items, category, locale, search]);

  const cartLines = useMemo(() => Object.entries(cart).flatMap(([productId, quantity]) => {
    const product = bootstrap?.items.find((item) => item.productId === Number(productId));
    return product && quantity > 0 ? [{ product, quantity }] : [];
  }), [bootstrap?.items, cart]);

  const itemCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cartLines.reduce(
    (total, line) => total + numberValue(line.product.unitPrice) * line.quantity,
    0,
  );
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const changeQuantity = (item: SelfServiceCatalogItem, delta: number) => {
    setCart((current) => {
      const requested = Math.max(0, (current[item.productId] ?? 0) + delta);
      const available = item.stockTracked && bootstrap?.showStock
        ? Math.max(0, Math.floor(numberValue(item.availableQuantity)))
        : Number.MAX_SAFE_INTEGER;
      const nextQuantity = Math.min(requested, available);
      if (nextQuantity === 0) {
        const next = { ...current };
        delete next[item.productId];
        return next;
      }
      return { ...current, [item.productId]: nextQuantity };
    });
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === terminalRef.current) {
      await document.exitFullscreen();
      return;
    }
    await terminalRef.current?.requestFullscreen();
  };

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-100 px-6 text-slate-600">
        <div className="text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-[#B63B32]" />
          <p className="mt-3 text-base font-medium">{copy.selfServicePublic.loading}</p>
        </div>
      </main>
    );
  }

  if (unavailable || !bootstrap) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-100 px-6">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center">
          {online ? <Store className="mx-auto h-10 w-10 text-[#B63B32]" /> : <WifiOff className="mx-auto h-10 w-10 text-amber-600" />}
          <h1 className="mt-4 text-xl font-medium text-slate-950">
            {online ? copy.selfServicePublic.unavailable : copy.selfServicePublic.offline}
          </h1>
          <button
            type="button"
            disabled={!online}
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] disabled:opacity-50"
          >
            <RefreshCw className="h-5 w-5" />
            {copy.selfServicePublic.retry}
          </button>
        </section>
      </main>
    );
  }

  const steps: Array<{ key: SelfCheckoutStep; label: string; icon: typeof Barcode }> = [
    { key: 'products', label: copy.selfCheckoutFrame.catalogTitle, icon: Barcode },
    { key: 'cart', label: copy.selfCheckoutFrame.cartTitle, icon: ShoppingCart },
    { key: 'payment', label: copy.selfCheckoutFrame.paymentTitle, icon: CreditCard },
  ];

  return (
    <div ref={terminalRef} className="flex min-h-dvh flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FF6B5E] text-[#222831]">
            <ShoppingCart className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-medium">{bootstrap.name}</p>
            <p className="truncate text-xs text-slate-500">
              {bootstrap.companyName} · {bootstrap.warehouseName} · {bootstrap.cashRegisterName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
        >
          <Maximize2 className="h-5 w-5" />
          <span className="hidden sm:inline">
            {isFullscreen ? copy.selfCheckoutFrame.exitFullscreen : copy.selfCheckoutFrame.fullscreen}
          </span>
        </button>
      </header>

      {!online ? (
        <div role="status" className="flex shrink-0 items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          <WifiOff className="h-4 w-4" /> {copy.selfServicePublic.offline}
        </div>
      ) : null}

      <ol className="grid shrink-0 grid-cols-3 gap-2 border-b border-slate-200 bg-white p-3 sm:px-6">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const active = item.key === step;
          const completed = steps.findIndex((candidate) => candidate.key === step) > index;
          const disabled = item.key !== 'products' && itemCount === 0;
          return (
            <li key={item.key}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setStep(item.key)}
                aria-current={active ? 'step' : undefined}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-3 text-xs font-medium ${active
                  ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32]'
                  : completed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 disabled:opacity-45'}`}
              >
                {completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                <span>{index + 1}. {item.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
        {step === 'products' ? (
          <CatalogStep
            bootstrap={bootstrap}
            products={visibleProducts}
            categories={categories}
            category={category}
            search={search}
            cart={cart}
            locale={locale}
            onCategoryChange={setCategory}
            onSearchChange={setSearch}
            onQuantityChange={changeQuantity}
          />
        ) : null}
        {step === 'cart' ? (
          <CartStep
            bootstrap={bootstrap}
            lines={cartLines}
            locale={locale}
            subtotal={subtotal}
            tax={tax}
            total={total}
            onQuantityChange={changeQuantity}
          />
        ) : null}
        {step === 'payment' ? (
          <PaymentStep
            copy={copy.selfCheckoutFrame}
            currency={bootstrap.currencyCode}
            locale={locale}
            paymentMethod={paymentMethod}
            total={total}
            onPaymentMethodChange={setPaymentMethod}
          />
        ) : null}
      </main>

      <footer className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-slate-200 bg-[#222831] px-4 py-3 text-white sm:grid-cols-[1fr_auto_1fr] sm:px-6">
        <div>
          <p className="text-[11px] text-slate-300">{itemCount} {copy.selfCheckoutFrame.units}</p>
          <p className="text-xl font-medium sm:text-2xl">{formatCurrency(total, bootstrap.currencyCode, locale)}</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {step !== 'products' ? (
            <button type="button" onClick={() => setStep(step === 'payment' ? 'cart' : 'products')} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-[#222831]">
              <ArrowLeft className="h-5 w-5" /> {copy.selfCheckoutFrame.back}
            </button>
          ) : null}
        </div>
        <div className="flex justify-end">
          {step !== 'payment' ? (
            <button
              type="button"
              disabled={itemCount === 0}
              onClick={() => setStep(step === 'products' ? 'cart' : 'payment')}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] disabled:opacity-45"
            >
              {step === 'products' ? copy.selfCheckoutFrame.viewCart : copy.selfCheckoutFrame.continueToPayment}
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              title={copy.selfCheckoutFrame.securePayment}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] opacity-50"
            >
              <CreditCard className="h-5 w-5" /> {copy.selfCheckoutFrame.completePayment}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function CatalogStep({
  bootstrap,
  products,
  categories,
  category,
  search,
  cart,
  locale,
  onCategoryChange,
  onSearchChange,
  onQuantityChange,
}: {
  bootstrap: SelfServiceBootstrap;
  products: SelfServiceCatalogItem[];
  categories: string[];
  category: string;
  search: string;
  cart: Record<number, number>;
  locale: string;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onQuantityChange: (item: SelfServiceCatalogItem, delta: number) => void;
}) {
  const { copy } = usePointOfSaleKioskTranslations();
  return (
    <section className="mx-auto w-full max-w-[1680px]">
      <div className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-white p-3">
        <label className="relative block">
          <span className="sr-only">{copy.selfServicePublic.searchLabel}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={copy.selfCheckoutFrame.searchPlaceholder}
            className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <CategoryButton active={category === 'all'} onClick={() => onCategoryChange('all')} label={copy.selfCheckoutFrame.allProducts} />
          {categories.map((value) => <CategoryButton key={value} active={category === value} onClick={() => onCategoryChange(value)} label={value} />)}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm font-medium text-slate-500">
          {copy.selfServicePublic.emptyResults}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {products.map((item, index) => {
            const quantity = cart[item.productId] ?? 0;
            const available = item.available && (!item.stockTracked || numberValue(item.availableQuantity) > 0);
            return (
              <article key={item.productId} className="flex min-h-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="relative h-[42%] min-h-32 overflow-hidden bg-slate-100">
                  <img src={productImage(item, index)} alt="" className="h-full w-full object-cover" />
                  {quantity > 0 ? <span className="absolute right-3 top-3 grid h-9 min-w-9 place-items-center rounded-full bg-[#222831] px-2 text-sm font-medium text-white">{quantity}</span> : null}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="text-[11px] font-medium text-[#B63B32]">{item.category || copy.selfServicePublic.product}</p>
                  <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium">{item.name}</h2>
                  <p className="mt-1 truncate text-[11px] text-slate-400">{item.sku || copy.selfServicePublic.noCode}</p>
                  <div className="mt-auto pt-3">
                    <div className="flex items-end justify-between gap-2">
                      <strong className="text-xl">{formatCurrency(numberValue(item.unitPrice), item.currencyCode, locale)}</strong>
                      {bootstrap.showStock && item.stockTracked ? <span className="text-[10px] text-slate-500">{numberValue(item.availableQuantity)} disp.</span> : null}
                    </div>
                    {quantity === 0 ? (
                      <button type="button" disabled={!available} onClick={() => onQuantityChange(item, 1)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] text-sm font-medium text-[#222831] disabled:bg-slate-200 disabled:text-slate-400">
                        <Plus className="h-5 w-5" /> {available ? copy.selfCheckoutFrame.addProduct : copy.selfServicePublic.unavailableItem}
                      </button>
                    ) : (
                      <div className="mt-3 grid grid-cols-[48px_1fr_48px] overflow-hidden rounded-xl border border-slate-200">
                        <button type="button" onClick={() => onQuantityChange(item, -1)} className="grid h-12 place-items-center"><Minus className="h-5 w-5" /></button>
                        <span className="grid h-12 place-items-center border-x border-slate-200 text-sm font-medium">{quantity}</span>
                        <button type="button" onClick={() => onQuantityChange(item, 1)} className="grid h-12 place-items-center bg-[#FF6B5E]"><Plus className="h-5 w-5" /></button>
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
  );
}

function CategoryButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium ${active ? 'bg-[#FF6B5E] text-[#222831]' : 'bg-slate-100 text-slate-600'}`}>
      {label}
    </button>
  );
}

function CartStep({ bootstrap, lines, locale, subtotal, tax, total, onQuantityChange }: {
  bootstrap: SelfServiceBootstrap;
  lines: Array<{ product: SelfServiceCatalogItem; quantity: number }>;
  locale: string;
  subtotal: number;
  tax: number;
  total: number;
  onQuantityChange: (item: SelfServiceCatalogItem, delta: number) => void;
}) {
  const { copy } = usePointOfSaleKioskTranslations();
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        {lines.map(({ product, quantity }, index) => (
          <article key={product.productId} className="grid min-h-24 grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <img src={productImage(product, index)} alt="" className="h-20 w-20 rounded-xl object-cover" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium">{product.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{formatCurrency(numberValue(product.unitPrice), product.currencyCode, locale)} c/u</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => onQuantityChange(product, -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200"><Minus className="h-5 w-5" /></button>
                <span className="grid h-11 min-w-12 place-items-center rounded-xl bg-slate-100 px-3 text-sm font-medium">{quantity}</span>
                <button type="button" onClick={() => onQuantityChange(product, 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200"><Plus className="h-5 w-5" /></button>
              </div>
            </div>
            <strong className="self-start pt-2 text-lg">{formatCurrency(numberValue(product.unitPrice) * quantity, product.currencyCode, locale)}</strong>
          </article>
        ))}
      </div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-0">
        <h2 className="text-lg font-medium">{copy.selfCheckoutFrame.cartTitle}</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">{copy.selfCheckoutFrame.subtotal}</dt><dd>{formatCurrency(subtotal, bootstrap.currencyCode, locale)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">{copy.selfCheckoutFrame.tax}</dt><dd>{formatCurrency(tax, bootstrap.currencyCode, locale)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg"><dt>{copy.selfCheckoutFrame.total}</dt><dd className="font-medium">{formatCurrency(total, bootstrap.currencyCode, locale)}</dd></div>
        </dl>
      </aside>
    </section>
  );
}

function PaymentStep({ copy, currency, locale, paymentMethod, total, onPaymentMethodChange }: {
  copy: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']['selfCheckoutFrame'];
  currency: string;
  locale: string;
  paymentMethod: PaymentMethod | null;
  total: number;
  onPaymentMethodChange: (value: PaymentMethod) => void;
}) {
  const methods: Array<{ key: PaymentMethod; icon: typeof CreditCard; title: string; description: string }> = [
    { key: 'card', icon: CreditCard, title: copy.cardPayment, description: copy.cardPaymentDescription },
    { key: 'cash', icon: Banknote, title: copy.cashPayment, description: copy.cashPaymentDescription },
    { key: 'transfer', icon: Barcode, title: copy.transferPayment, description: copy.transferPaymentDescription },
  ];
  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="text-center">
        <p className="text-sm text-slate-500">{copy.amountToPay}</p>
        <p className="mt-1 text-4xl font-medium text-[#B63B32] sm:text-5xl">{formatCurrency(total, currency, locale)}</p>
        <h2 className="mt-6 text-xl font-medium">{copy.choosePaymentMethod}</h2>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {methods.map((method) => {
          const Icon = method.icon;
          const selected = paymentMethod === method.key;
          return (
            <button type="button" key={method.key} onClick={() => onPaymentMethodChange(method.key)} className={`min-h-36 rounded-2xl border p-4 text-left ${selected ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 bg-white'}`}>
              <Icon className="h-7 w-7 text-[#B63B32]" />
              <span className="mt-3 block text-base font-medium">{method.title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{method.description}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs font-medium text-amber-800">
        {copy.securePayment}
      </p>
    </section>
  );
}
