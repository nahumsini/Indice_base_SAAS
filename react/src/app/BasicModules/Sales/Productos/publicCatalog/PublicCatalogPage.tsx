import { useEffect, useMemo, useState } from 'react';
import { Globe2, RefreshCw, WifiOff } from 'lucide-react';
import { useParams } from 'react-router';
import { KioskPublicShell } from '../../../../components/kiosk-engine/KioskPublicShell';
import { Button } from '../../../../components/ui/button';
import type { SalesCatalogItem } from '../../types';
import { productTypes } from '../../types';
import { useProductsTranslations } from '../translations';
import { publicCatalogApi, type PublicCatalogBootstrap } from './publicCatalogApi';
import type { PublicCatalogCartItem, PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { createDefaultPublicCatalogConfig, getProductsForPublicCatalog } from './utils/publicCatalogAdapters';
import { filterPublicCatalogItems } from './utils/publicCatalogFilters';
import { calculatePublicCatalogCartTotal, getPublicCatalogUnitPrice } from './utils/publicCatalogPricing';
import { applyPublicCatalogPriceVisibility } from './utils/publicCatalogVisibility';
import { PublicCatalogCart } from './PublicCatalogCart';
import { PublicCatalogFilters } from './PublicCatalogFilters';
import { PublicCatalogGrid } from './PublicCatalogGrid';
import { PublicCatalogHeader } from './PublicCatalogHeader';
import { PublicCatalogRequestModal } from './PublicCatalogRequestModal';

const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);

const configFromBootstrap = (bootstrap: PublicCatalogBootstrap): PublicCatalogConfig => ({
  id: bootstrap.code,
  companyName: bootstrap.companyName,
  unitName: bootstrap.unitName,
  businessName: bootstrap.businessName,
  title: bootstrap.title,
  description: bootstrap.description ?? '',
  coverImageUrl: bootstrap.coverImageUrl ?? '',
  contactCtaLabel: bootstrap.contactCtaLabel,
  contactMethod: bootstrap.contactMethod,
  contactValue: bootstrap.contactValue ?? '',
  showPrices: bootstrap.showPrices,
  showWholesalePrices: bootstrap.showWholesalePrices,
  showStockStatus: bootstrap.showStockStatus,
  showItemTypeBadges: bootstrap.showItemTypeBadges,
  showCategories: bootstrap.showCategories,
  allowCart: bootstrap.allowCart,
  allowPurchaseRequest: bootstrap.allowPurchaseRequest,
  showOnlinePaymentComingSoon: false,
  selectedCategoryIds: [],
  selectedProductIds: bootstrap.items.map((item) => String(item.id)),
  status: 'active',
});

const itemsFromBootstrap = (bootstrap: PublicCatalogBootstrap): PublicCatalogItem[] => bootstrap.items.map((item) => ({
  id: String(item.id),
  name: item.name,
  sku: item.sku ?? undefined,
  type: item.type ?? 'Product',
  category: item.category,
  description: item.description ?? undefined,
  thumbnailUrl: item.thumbnailUrl ?? undefined,
  thumbnailAlt: item.thumbnailAlt ?? undefined,
  publicPrice: item.publicPrice == null ? undefined : numberValue(item.publicPrice),
  wholesalePrice: item.wholesalePrice == null ? undefined : numberValue(item.wholesalePrice),
  wholesaleMinQuantity: item.wholesaleMinQuantity == null ? undefined : numberValue(item.wholesaleMinQuantity),
  currency: item.currency ?? undefined,
  usesInventory: item.usesInventory,
  publicInventoryStatus: item.publicInventoryStatus ?? 'askAvailability',
  readyForSales: item.readyForSales,
}));

type CatalogExperienceProps = {
  config: PublicCatalogConfig;
  items: PublicCatalogItem[];
  embedded: boolean;
  online?: boolean;
  token?: string;
  csrfToken?: string;
};

function CatalogExperience({ config, items, embedded, online = true, token, csrfToken }: CatalogExperienceProps) {
  const t = useProductsTranslations();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [cartItems, setCartItems] = useState<PublicCatalogCartItem[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const experienceItems = useMemo(() => applyPublicCatalogPriceVisibility(items, config), [config, items]);

  const filteredItems = useMemo(() => filterPublicCatalogItems({
    items: experienceItems,
    search,
    category,
    type,
  }), [category, experienceItems, search, type]);
  const categories = useMemo(() => Array.from(new Set(experienceItems.map((item) => item.category).filter(Boolean))) as NonNullable<PublicCatalogItem['category']>[], [experienceItems]);
  const availableTypes = useMemo(
    () => config.showItemTypeBadges
      ? productTypes.filter((itemType) => experienceItems.some((item) => item.type === itemType))
      : [],
    [config.showItemTypeBadges, experienceItems],
  );
  const estimatedTotal = calculatePublicCatalogCartTotal(experienceItems, cartItems);

  const handleAddToCart = (item: PublicCatalogItem) => {
    if (!config.allowCart && !config.allowPurchaseRequest) return;
    const existingItem = cartItems.find((cartItem) => cartItem.itemId === item.id);
    const nextQuantity = existingItem ? existingItem.quantity + 1 : 1;
    const pricing = getPublicCatalogUnitPrice(item, nextQuantity);

    if (!config.allowCart) {
      setCartItems([{ itemId: item.id, quantity: 1, ...pricing }]);
      setRequestOpen(true);
      return;
    }

    setCartItems((current) => (
      existingItem
        ? current.map((cartItem) => (
            cartItem.itemId === item.id
              ? { ...cartItem, quantity: nextQuantity, ...pricing }
              : cartItem
          ))
        : [...current, { itemId: item.id, quantity: 1, ...pricing }]
    ));
  };

  const handleChangeQuantity = (itemId: string, quantity: number) => {
    const item = experienceItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const pricing = getPublicCatalogUnitPrice(item, quantity);
    setCartItems((current) => current.map((cartItem) => (
      cartItem.itemId === itemId ? { ...cartItem, quantity, ...pricing } : cartItem
    )));
  };

  const content = (
    <>
      <div className="space-y-6 bg-slate-50 py-6 dark:bg-slate-950">
        <PublicCatalogFilters
          search={search}
          category={category}
          type={type}
          categories={config.showCategories ? categories : []}
          types={availableTypes}
          t={t}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onTypeChange={setType}
        />

        <div className="mx-auto grid max-w-7xl gap-6 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="-mx-5 md:-mx-8 lg:mx-0">
            <PublicCatalogGrid items={filteredItems} config={config} t={t} onAddToCart={handleAddToCart} />
          </div>
          {config.allowCart ? (
            <PublicCatalogCart
              items={experienceItems}
              cartItems={cartItems}
              config={config}
              t={t}
              onChangeQuantity={handleChangeQuantity}
              onRemoveItem={(itemId) => setCartItems((current) => current.filter((item) => item.itemId !== itemId))}
              onRequestPurchase={() => setRequestOpen(true)}
            />
          ) : null}
        </div>
      </div>

      <PublicCatalogRequestModal
        open={requestOpen}
        cartItems={cartItems}
        estimatedTotal={estimatedTotal}
        t={t}
        showPrices={config.showPrices}
        online={online}
        onOpenChange={setRequestOpen}
        onSubmit={token && csrfToken ? async (request, idempotencyKey) => {
          const result = await publicCatalogApi.submitRequest(token, csrfToken, {
            ...request,
            items: cartItems.map((item) => ({ productId: Number(item.itemId), quantity: item.quantity })),
          }, idempotencyKey);
          setCartItems([]);
          return { requestNumber: result.requestNumber };
        } : undefined}
      />
    </>
  );

  if (embedded) {
    return (
      <main className="min-h-0 bg-slate-50 dark:bg-slate-950">
        <PublicCatalogHeader config={config} t={t} />
        {content}
      </main>
    );
  }

  return content;
}

export function PublicCatalogPage({
  config,
  products = [],
  embedded = false,
}: {
  config?: PublicCatalogConfig;
  products?: SalesCatalogItem[];
  embedded?: boolean;
}) {
  const { publicAccessToken = '' } = useParams();
  const t = useProductsTranslations();
  const [loadedBootstrap, setLoadedBootstrap] = useState<PublicCatalogBootstrap | null>(null);
  const [bootstrapToken, setBootstrapToken] = useState(publicAccessToken);
  const [loading, setLoading] = useState(!embedded);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [reloadKey, setReloadKey] = useState(0);
  const bootstrap = bootstrapToken === publicAccessToken ? loadedBootstrap : null;
  const viewLoading = bootstrapToken === publicAccessToken ? loading : true;
  const viewError = bootstrapToken === publicAccessToken ? error : '';

  useEffect(() => {
    if (embedded) return undefined;
    const updateNetworkState = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateNetworkState);
    window.addEventListener('offline', updateNetworkState);
    return () => {
      window.removeEventListener('online', updateNetworkState);
      window.removeEventListener('offline', updateNetworkState);
    };
  }, [embedded]);

  useEffect(() => {
    if (embedded) return undefined;
    let cancelled = false;
    setBootstrapToken(publicAccessToken);
    setLoadedBootstrap(null);
    if (!publicAccessToken) {
      setLoading(false);
      setError(t.publicCatalog.incompleteLinkError);
      return undefined;
    }
    setLoading(true);
    setError('');
    publicCatalogApi.bootstrap(publicAccessToken)
      .then((response) => {
        if (!cancelled) setLoadedBootstrap(response);
      })
      .catch(() => {
        if (!cancelled) {
          setError(t.publicCatalog.publicUnavailable);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [embedded, publicAccessToken, reloadKey]);

  if (embedded) {
    const activeConfig = config ?? createDefaultPublicCatalogConfig(products, {
      title: t.publicCatalog.defaultTitle,
      description: t.publicCatalog.defaultDescription,
      contactCta: t.publicCatalog.contactCta,
    });
    return (
      <CatalogExperience
        config={activeConfig}
        items={getProductsForPublicCatalog(products, activeConfig)}
        embedded
      />
    );
  }

  const activeConfig = bootstrap ? configFromBootstrap(bootstrap) : null;
  const publicItems = bootstrap ? itemsFromBootstrap(bootstrap) : [];

  return (
    <KioskPublicShell
      maxWidthClassName="max-w-[1500px]"
      errorMessage={viewError || null}
      banners={!online ? (
        <div role="status" className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-800">
          <WifiOff className="h-4 w-4" /> {t.publicCatalog.publicOffline}
        </div>
      ) : null}
      header={activeConfig ? (
        <PublicCatalogHeader config={activeConfig} t={t} />
      ) : (
        <header className="border-b border-slate-200 bg-white px-5 py-6 dark:border-slate-800 dark:bg-slate-950 md:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#FF6B5E]/10 text-[#B63B32]"><Globe2 /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#B63B32]">{t.publicCatalog.moduleEyebrow}</p>
              <h1 className="text-xl font-black text-slate-950 dark:text-white">{viewLoading ? t.publicCatalog.preparingCatalog : t.publicCatalog.catalogUnavailable}</h1>
            </div>
          </div>
        </header>
      )}
    >
      {viewLoading ? (
        <div className="grid flex-1 place-items-center py-24 text-sm font-bold text-slate-500">
          {t.publicCatalog.loadingProducts}
        </div>
      ) : null}
      {!viewLoading && !activeConfig ? (
        <div className="grid flex-1 place-items-center py-16 text-center">
          <div className="max-w-md">
            <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{t.publicCatalog.publicConnectionHelp}</p>
            <Button type="button" variant="outline" className="mt-5 h-11 gap-2" disabled={!online} onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="h-4 w-4" /> {t.publicCatalog.tryAgain}
            </Button>
          </div>
        </div>
      ) : null}
      {!viewLoading && activeConfig && bootstrap ? (
        <CatalogExperience
          config={activeConfig}
          items={publicItems}
          embedded={false}
          online={online}
          token={publicAccessToken}
          csrfToken={bootstrap.csrfToken}
        />
      ) : null}
    </KioskPublicShell>
  );
}

export default PublicCatalogPage;
