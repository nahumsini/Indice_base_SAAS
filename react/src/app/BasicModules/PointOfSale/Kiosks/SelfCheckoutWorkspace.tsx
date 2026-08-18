import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  Maximize2,
  Minus,
  Monitor,
  MonitorCog,
  Plus,
  Printer,
  ReceiptText,
  Scale,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Warehouse,
} from 'lucide-react';
import freshSandwichImage from '../../../../assets/pos/self-checkout/fresh-sandwich.png';
import naturalWaterImage from '../../../../assets/pos/self-checkout/natural-water.png';
import orangeJuiceImage from '../../../../assets/pos/self-checkout/orange-juice.png';
import vanillaIceCreamImage from '../../../../assets/pos/self-checkout/vanilla-ice-cream.png';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { readStoredDiscountRules } from '../shared/commercial/discounts';
import { posBackendApi, type PosWarehouseSummary } from '../Sale/services/posBackendApi';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';
import { SelfCheckoutSetupWizard, type SelfCheckoutSetupDraft } from './SelfCheckoutSetupWizard';

type SelfCheckoutOrientation = 'horizontal' | 'vertical';
type SelfCheckoutStep = 'products' | 'cart' | 'payment';

export function SelfCheckoutWorkspace({ startWithSetup = false }: { startWithSetup?: boolean }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const { products } = usePointOfSaleCatalogProducts();
  const [orientation, setOrientation] = useState<SelfCheckoutOrientation>('horizontal');
  const [step, setStep] = useState<SelfCheckoutStep>('products');
  const [quantities, setQuantities] = useState([1, 1, 0, 0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSetup, setShowSetup] = useState(startWithSetup);
  const [preparedDraft, setPreparedDraft] = useState<SelfCheckoutSetupDraft | null>(null);
  const [warehouses, setWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [loadingScope, setLoadingScope] = useState(true);
  const [scopeError, setScopeError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const discounts = useMemo(() => readStoredDiscountRules(), []);

  useEffect(() => {
    let mounted = true;
    setLoadingScope(true);
    void posBackendApi.context()
      .then((context) => {
        if (!mounted) return;
        setWarehouses(context.warehouses.filter((warehouse) => String(warehouse.status || 'active').toLowerCase() === 'active'));
        setScopeError('');
      })
      .catch((error) => {
        if (!mounted) return;
        setScopeError(error instanceof Error ? error.message : copy.selfCheckoutFrame.scopeLoadError);
      })
      .finally(() => mounted && setLoadingScope(false));
    return () => { mounted = false; };
  }, [copy.selfCheckoutFrame.scopeLoadError]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === previewRef.current);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === previewRef.current) {
      await document.exitFullscreen();
      return;
    }
    await previewRef.current?.requestFullscreen();
  };

  const changeQuantity = (index: number, delta: number) => {
    setQuantities((current) => current.map((quantity, productIndex) => (
      productIndex === index ? Math.max(0, quantity + delta) : quantity
    )));
  };

  const flow = [
    { icon: Barcode, title: copy.selfCheckoutFrame.catalogTitle, description: copy.selfCheckoutFrame.catalogDescription },
    { icon: ShoppingCart, title: copy.selfCheckoutFrame.cartTitle, description: copy.selfCheckoutFrame.cartDescription },
    { icon: CreditCard, title: copy.selfCheckoutFrame.paymentTitle, description: copy.selfCheckoutFrame.paymentDescription },
  ];
  const foundations = [
    { icon: Warehouse, title: copy.selfCheckoutFrame.scopeTitle, description: copy.selfCheckoutFrame.scopeDescription },
    { icon: BadgeDollarSign, title: copy.selfCheckoutFrame.methodsTitle, description: copy.selfCheckoutFrame.methodsDescription },
    { icon: Scale, title: copy.selfCheckoutFrame.peripheralsTitle, description: copy.selfCheckoutFrame.peripheralsDescription },
    { icon: ShieldCheck, title: copy.selfCheckoutFrame.securityTitle, description: copy.selfCheckoutFrame.securityDescription },
  ];

  return (
    <section className="space-y-5" aria-labelledby="self-checkout-title">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 p-5 dark:bg-[#FF6B5E]/10">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/15 text-[#B63B32]">
            <CreditCard className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-[#B63B32]">{copy.selfCheckoutFrame.eyebrow}</p>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {copy.selfCheckoutFrame.foundationBadge}
              </span>
            </div>
            <h2 id="self-checkout-title" className="mt-1 text-xl font-medium text-slate-950 dark:text-white">
              {copy.selfCheckoutFrame.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {copy.selfCheckoutFrame.description}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setShowSetup(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#F45D50]">
          <Plus className="h-4 w-4" />{copy.selfCheckoutSetup.openSetup}
        </button>
      </div>

      {preparedDraft ? (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="text-sm font-medium">{copy.selfCheckoutSetup.preparedTitle}</p><p className="mt-1 text-xs leading-5">{copy.selfCheckoutSetup.preparedDescription}</p></div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="text-xs font-medium text-[#B63B32]">{copy.selfCheckoutFrame.flowEyebrow}</p>
          <h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{copy.selfCheckoutFrame.flowTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{copy.selfCheckoutFrame.flowDescription}</p>
        </div>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {flow.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#B63B32] dark:bg-slate-950">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#FF6B5E] text-xs font-medium text-[#222831]">
                    {index + 1}
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-medium text-slate-950 dark:text-white">{step.title}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#B63B32]">{copy.selfCheckoutFrame.previewEyebrow}</p>
            <h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{copy.selfCheckoutFrame.previewTitle}</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-300">{copy.selfCheckoutFrame.previewDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900" role="group" aria-label={copy.selfCheckoutFrame.orientationLabel}>
              <OrientationButton
                active={orientation === 'horizontal'}
                icon={<Monitor className="h-4 w-4" />}
                label={copy.selfCheckoutFrame.horizontal}
                onClick={() => setOrientation('horizontal')}
              />
              <OrientationButton
                active={orientation === 'vertical'}
                icon={<Smartphone className="h-4 w-4" />}
                label={copy.selfCheckoutFrame.vertical}
                onClick={() => setOrientation('vertical')}
              />
            </div>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#FF6B5E] hover:text-[#B63B32] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <Maximize2 className="h-4 w-4" />
              {copy.selfCheckoutFrame.fullscreen}
            </button>
          </div>
        </div>

        <div
          ref={previewRef}
          className={`mt-4 bg-[#222831] ${isFullscreen ? 'h-screen overflow-hidden p-0' : 'rounded-2xl p-3 sm:p-5'}`}
        >
          {orientation === 'horizontal' ? (
            <HorizontalSelfCheckoutPreview
              copy={copy.selfCheckoutFrame}
              step={step}
              quantities={quantities}
              isFullscreen={isFullscreen}
              onStepChange={setStep}
              onQuantityChange={changeQuantity}
              onToggleFullscreen={() => void toggleFullscreen()}
            />
          ) : (
            <VerticalSelfCheckoutPreview
              copy={copy.selfCheckoutFrame}
              step={step}
              quantities={quantities}
              isFullscreen={isFullscreen}
              onStepChange={setStep}
              onQuantityChange={changeQuantity}
              onToggleFullscreen={() => void toggleFullscreen()}
            />
          )}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {orientation === 'horizontal'
            ? copy.selfCheckoutFrame.horizontalHelp
            : copy.selfCheckoutFrame.verticalHelp}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.selfCheckoutFrame.foundationTitle}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{copy.selfCheckoutFrame.foundationDescription}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {foundations.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="flex gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-slate-950 dark:text-white">{item.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#B63B32]">{copy.selfCheckoutFrame.stationsEyebrow}</p>
              <h3 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{copy.selfCheckoutFrame.stationsTitle}</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              {copy.selfCheckoutFrame.zeroStations}
            </span>
          </div>
          <div className="my-auto py-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FF6B5E]/10 text-[#B63B32]">
              <MonitorCog className="h-7 w-7" />
            </span>
            <h4 className="mt-4 text-sm font-medium text-slate-950 dark:text-white">{copy.selfCheckoutFrame.emptyTitle}</h4>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-300">{copy.selfCheckoutFrame.emptyDescription}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{copy.selfCheckoutFrame.nextStep}</span>
            <Printer className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </aside>
      </div>
      {showSetup ? (
        <SelfCheckoutSetupWizard
          warehouses={warehouses}
          products={products}
          discounts={discounts}
          loadingScope={loadingScope}
          scopeError={scopeError}
          onClose={() => setShowSetup(false)}
          onComplete={(draft) => { setPreparedDraft(draft); setShowSetup(false); }}
        />
      ) : null}
    </section>
  );
}

function OrientationButton({ active, icon, label, onClick }: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${active
        ? 'bg-[#FF6B5E] text-[#222831]'
        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'}`}
    >
      {icon}
      {label}
    </button>
  );
}

type SelfCheckoutPreviewCopy = ReturnType<typeof usePointOfSaleKioskTranslations>['copy']['selfCheckoutFrame'];

type PreviewProduct = {
  image: string;
  name: string;
  price: number;
};

type SelfCheckoutPreviewProps = {
  copy: SelfCheckoutPreviewCopy;
  step: SelfCheckoutStep;
  quantities: number[];
  isFullscreen: boolean;
  onStepChange: (step: SelfCheckoutStep) => void;
  onQuantityChange: (index: number, delta: number) => void;
  onToggleFullscreen: () => void;
};

function HorizontalSelfCheckoutPreview(props: SelfCheckoutPreviewProps) {
  return (
    <SelfCheckoutExperiencePreview
      {...props}
      orientation="horizontal"
      className={props.isFullscreen ? 'h-full rounded-none' : 'min-h-[620px] rounded-xl'}
    />
  );
}

function VerticalSelfCheckoutPreview(props: SelfCheckoutPreviewProps) {
  return (
    <SelfCheckoutExperiencePreview
      {...props}
      orientation="vertical"
      className={props.isFullscreen
        ? 'mx-auto h-full w-full max-w-[560px] rounded-none'
        : 'mx-auto min-h-[760px] w-full max-w-[480px] rounded-[1.75rem] border-[6px] border-slate-950'}
    />
  );
}

function SelfCheckoutExperiencePreview({
  copy,
  step,
  quantities,
  isFullscreen,
  orientation,
  className,
  onStepChange,
  onQuantityChange,
  onToggleFullscreen,
}: SelfCheckoutPreviewProps & { orientation: SelfCheckoutOrientation; className: string }) {
  const products = getPreviewProducts(copy);
  const subtotal = products.reduce((total, product, index) => total + product.price * quantities[index], 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const cartCount = quantities.reduce((totalQuantity, quantity) => totalQuantity + quantity, 0);

  return (
    <div className={`flex overflow-hidden bg-slate-100 shadow-xl dark:bg-slate-900 ${className}`}>
      <div className="flex min-h-0 w-full flex-col">
        <SelfCheckoutPreviewHeader
          copy={copy}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
        <PreviewStepBar copy={copy} step={step} cartCount={cartCount} onStepChange={onStepChange} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 dark:bg-slate-900">
          {step === 'products' && (
            <PreviewCatalog
              copy={copy}
              products={products}
              quantities={quantities}
              orientation={orientation}
              onQuantityChange={onQuantityChange}
            />
          )}
          {step === 'cart' && (
            <PreviewCart
              copy={copy}
              products={products}
              quantities={quantities}
              subtotal={subtotal}
              tax={tax}
              total={total}
              onQuantityChange={onQuantityChange}
            />
          )}
          {step === 'payment' && (
            <PreviewPayment copy={copy} subtotal={subtotal} tax={tax} total={total} />
          )}
        </main>
        <PreviewActionBar
          copy={copy}
          step={step}
          cartCount={cartCount}
          total={total}
          onStepChange={onStepChange}
        />
      </div>
    </div>
  );
}

function SelfCheckoutPreviewHeader({
  copy,
  isFullscreen,
  onToggleFullscreen,
}: {
  copy: SelfCheckoutPreviewCopy;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF6B5E] text-[#222831]">
          <ShoppingCart className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{copy.publicTitle}</p>
          <p className="truncate text-[10px] text-slate-500">{copy.stationExample}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="h-11 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          {copy.assistance}
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? copy.exitFullscreen : copy.fullscreen}
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function PreviewStepBar({ copy, step, cartCount, onStepChange }: {
  copy: SelfCheckoutPreviewCopy;
  step: SelfCheckoutStep;
  cartCount: number;
  onStepChange: (step: SelfCheckoutStep) => void;
}) {
  const steps: Array<{ key: SelfCheckoutStep; label: string; icon: typeof Barcode }> = [
    { key: 'products', label: copy.catalogTitle, icon: Barcode },
    { key: 'cart', label: copy.cartTitle, icon: ShoppingCart },
    { key: 'payment', label: copy.paymentTitle, icon: CreditCard },
  ];
  const activeIndex = steps.findIndex((item) => item.key === step);

  return (
    <ol className="grid grid-cols-3 gap-2 border-b border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      {steps.map((item, index) => {
        const Icon = item.icon;
        const active = item.key === step;
        const completed = index < activeIndex;
        const disabled = item.key !== 'products' && cartCount === 0;
        return (
          <li key={item.key}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onStepChange(item.key)}
              aria-current={active ? 'step' : undefined}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors ${active
                ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32]'
                : completed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-current/10">
                {completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="truncate">{index + 1}. {item.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function PreviewCatalog({
  copy,
  products,
  quantities,
  orientation,
  onQuantityChange,
}: {
  copy: SelfCheckoutPreviewCopy;
  products: PreviewProduct[];
  quantities: number[];
  orientation: SelfCheckoutOrientation;
  onQuantityChange: (index: number, delta: number) => void;
}) {
  return (
    <div className="p-3 sm:p-4">
      <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <Search className="h-5 w-5" />
        {copy.searchPlaceholder}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[copy.allProducts, copy.popularProducts, copy.foodProducts].map((category, index) => (
          <button key={category} type="button" className={`h-10 whitespace-nowrap rounded-full px-4 text-xs font-medium ${index === 0 ? 'bg-[#FF6B5E] text-[#222831]' : 'bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300'}`}>
            {category}
          </button>
        ))}
      </div>
      <div className={`mt-3 grid gap-3 ${orientation === 'vertical' ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {products.map((product, index) => (
          <article key={product.name} className="flex min-h-[270px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => onQuantityChange(index, 1)}
              aria-label={`${copy.addProduct}: ${product.name}`}
              className="relative block h-40 w-full overflow-hidden bg-[#FCE9E5]"
            >
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              {quantities[index] > 0 && (
                <span className="absolute right-2 top-2 grid min-h-8 min-w-8 place-items-center rounded-full bg-[#222831] px-2 text-xs font-medium text-white">
                  {quantities[index]}
                </span>
              )}
            </button>
            <div className="flex flex-1 flex-col p-3">
              <p className="min-h-10 text-sm font-medium leading-5 text-slate-950 dark:text-white">{product.name}</p>
              <p className="mt-1 text-[10px] text-emerald-700">{copy.stockAvailable}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="text-lg font-medium text-slate-950 dark:text-white">{formatPreviewCurrency(product.price)}</span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(index, 1)}
                  className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF6B5E] text-[#222831]"
                  aria-label={`${copy.addProduct}: ${product.name}`}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PreviewCart({
  copy,
  products,
  quantities,
  subtotal,
  tax,
  total,
  onQuantityChange,
}: {
  copy: SelfCheckoutPreviewCopy;
  products: PreviewProduct[];
  quantities: number[];
  subtotal: number;
  tax: number;
  total: number;
  onQuantityChange: (index: number, delta: number) => void;
}) {
  const selectedProducts = products
    .map((product, index) => ({ product, index, quantity: quantities[index] }))
    .filter((item) => item.quantity > 0);

  return (
    <div className="mx-auto w-full max-w-4xl p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-medium text-slate-950 dark:text-white">{copy.cartTitle}</p>
          <p className="text-xs text-slate-500">{quantities.reduce((sum, quantity) => sum + quantity, 0)} {copy.units}</p>
        </div>
        <ReceiptText className="h-6 w-6 text-[#B63B32]" />
      </div>
      <div className="mt-4 space-y-2">
        {selectedProducts.map(({ product, index, quantity }) => (
          <PreviewCartLine
            key={product.name}
            product={product}
            quantity={quantity}
            onDecrease={() => onQuantityChange(index, -1)}
            onIncrease={() => onQuantityChange(index, 1)}
          />
        ))}
      </div>
      <PreviewTotals copy={copy} subtotal={subtotal} tax={tax} total={total} />
    </div>
  );
}

function PreviewCartLine({ product, quantity, onDecrease, onIncrease }: {
  product: PreviewProduct;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
      <img src={product.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{product.name}</p>
        <p className="mt-1 text-xs text-slate-500">{formatPreviewCurrency(product.price)} × {quantity}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onDecrease} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Minus className="h-5 w-5" /></button>
        <span className="grid h-11 min-w-11 place-items-center rounded-xl bg-slate-100 px-3 text-sm font-medium dark:bg-slate-900">{quantity}</span>
        <button type="button" onClick={onIncrease} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Plus className="h-5 w-5" /></button>
      </div>
      <p className="w-24 text-right text-sm font-medium text-slate-950 dark:text-white">
        {formatPreviewCurrency(product.price * quantity)}
      </p>
    </article>
  );
}

function PreviewPayment({ copy, subtotal, tax, total }: {
  copy: SelfCheckoutPreviewCopy;
  subtotal: number;
  tax: number;
  total: number;
}) {
  const methods = [
    { icon: CreditCard, label: copy.cardPayment, description: copy.cardPaymentDescription },
    { icon: Banknote, label: copy.cashPayment, description: copy.cashPaymentDescription },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl p-3 sm:p-5">
      <div className="rounded-2xl bg-[#222831] p-5 text-white">
        <p className="text-xs text-slate-300">{copy.amountToPay}</p>
        <p className="mt-1 text-4xl font-medium">{formatPreviewCurrency(total)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-xs text-slate-300">
          <PreviewTotalRow label={copy.subtotal} value={formatPreviewCurrency(subtotal)} />
          <PreviewTotalRow label={copy.tax} value={formatPreviewCurrency(tax)} />
        </div>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-950 dark:text-white">{copy.choosePaymentMethod}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {methods.map(({ icon: Icon, label, description }, index) => (
          <button
            key={label}
            type="button"
            className={`min-h-36 rounded-2xl border p-4 text-left transition-colors ${index === 0
              ? 'border-[#FF6B5E] bg-[#FF6B5E]/10'
              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#B63B32] shadow-sm dark:bg-slate-900">
              <Icon className="h-5 w-5" />
            </span>
            <span className="mt-4 block text-sm font-medium text-slate-950 dark:text-white">{label}</span>
            <span className="mt-1 block text-[10px] leading-4 text-slate-500">{description}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        {copy.securePayment}
      </div>
    </div>
  );
}

function PreviewActionBar({ copy, step, cartCount, total, onStepChange }: {
  copy: SelfCheckoutPreviewCopy;
  step: SelfCheckoutStep;
  cartCount: number;
  total: number;
  onStepChange: (step: SelfCheckoutStep) => void;
}) {
  const previousStep = step === 'payment' ? 'cart' : 'products';
  const nextStep = step === 'products' ? 'cart' : 'payment';
  const nextLabel = step === 'products'
    ? copy.viewCart
    : step === 'cart'
      ? copy.continueToPayment
      : copy.completePayment;

  return (
    <footer className="flex min-h-20 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500">{copy.total}</p>
        <p className="text-xl font-medium text-slate-950 dark:text-white">{formatPreviewCurrency(total)}</p>
      </div>
      <div className="flex items-center gap-2">
        {step !== 'products' && (
          <button
            type="button"
            onClick={() => onStepChange(previousStep)}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </button>
        )}
        <button
          type="button"
          disabled={cartCount === 0}
          onClick={() => step !== 'payment' && onStepChange(nextStep)}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {nextLabel}
          {step !== 'payment' && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </footer>
  );
}

function PreviewTotals({ copy, subtotal, tax, total }: {
  copy: SelfCheckoutPreviewCopy;
  subtotal: number;
  tax: number;
  total: number;
}) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-slate-950">
      <PreviewTotalRow label={copy.subtotal} value={formatPreviewCurrency(subtotal)} />
      <PreviewTotalRow label={copy.tax} value={formatPreviewCurrency(tax)} />
      <div className="mt-3 flex items-end justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.total}</span>
        <span className="text-3xl font-medium text-slate-950 dark:text-white">{formatPreviewCurrency(total)}</span>
      </div>
    </div>
  );
}

function PreviewTotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function getPreviewProducts(copy: SelfCheckoutPreviewCopy): PreviewProduct[] {
  return [
    { name: copy.productOne, price: 35, image: naturalWaterImage },
    { name: copy.productTwo, price: 79, image: vanillaIceCreamImage },
    { name: copy.productThree, price: 60, image: freshSandwichImage },
    { name: copy.productFour, price: 42, image: orangeJuiceImage },
  ];
}

function formatPreviewCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}
