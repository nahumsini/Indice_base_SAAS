import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe2, RefreshCw, WifiOff } from 'lucide-react';
import { useParams } from 'react-router';
import { KioskPublicShell } from '../../../../components/kiosk-engine/KioskPublicShell';
import { Button } from '../../../../components/ui/button';
import { useIsMobile } from '../../../../components/ui/use-mobile';
import type { SalesCatalogItem } from '../../types';
import { resolveSalesStorageUrl } from '../../utils/salesStorageUrls';
import { publicCatalogExperienceFromWire } from './utils/publicCatalogExperience';
import { useProductsTranslations } from '../translations';
import { publicCatalogApi, type PublicCatalogBootstrap } from './publicCatalogApi';
import type { PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { createDefaultPublicCatalogConfig, getProductsForPublicCatalog } from './utils/publicCatalogAdapters';
import { PublicCatalogHeader } from './PublicCatalogHeader';
import { PublicCatalogWorkspace } from './PublicCatalogWorkspace';

const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);
const PUBLIC_CATALOG_MEDIA_REFRESH_MS = 10 * 60 * 1_000;

const configFromBootstrap = (bootstrap: PublicCatalogBootstrap): PublicCatalogConfig => ({
  id: bootstrap.code,
  companyName: bootstrap.companyName,
  companyLogoUrl: resolveSalesStorageUrl(bootstrap.companyLogoUrl),
  unitName: bootstrap.unitName,
  businessName: bootstrap.businessName,
  title: bootstrap.title,
  description: bootstrap.description ?? '',
  coverImageUrl: resolveSalesStorageUrl(bootstrap.coverImageUrl),
  ...publicCatalogExperienceFromWire(bootstrap),
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
  allowImageDownloads: Boolean(bootstrap.allowImageDownloads),
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
  thumbnailUrl: resolveSalesStorageUrl(item.thumbnailUrl) || undefined,
  thumbnailAlt: item.thumbnailAlt ?? undefined,
  images: item.images
    ?.filter((image) => Boolean(image.url))
    .map((image) => ({ url: resolveSalesStorageUrl(image.url), alt: image.alt ?? item.name }))
    .filter((image) => Boolean(image.url)),
  publicPrice: item.publicPrice == null ? undefined : numberValue(item.publicPrice),
  wholesalePrice: item.wholesalePrice == null ? undefined : numberValue(item.wholesalePrice),
  wholesaleMinQuantity: item.wholesaleMinQuantity == null ? undefined : numberValue(item.wholesaleMinQuantity),
  currency: item.currency ?? undefined,
  usesInventory: item.usesInventory,
  publicInventoryStatus: item.publicInventoryStatus ?? 'askAvailability',
  readyForSales: item.readyForSales,
  reservable: item.reservable,
}));

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
  const isMobile = useIsMobile();
  const [loadedBootstrap, setLoadedBootstrap] = useState<PublicCatalogBootstrap | null>(null);
  const [bootstrapToken, setBootstrapToken] = useState(publicAccessToken);
  const [loading, setLoading] = useState(!embedded);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [reloadKey, setReloadKey] = useState(0);
  const bootstrapRequestRef = useRef<{
    token: string;
    request: Promise<PublicCatalogBootstrap>;
  } | null>(null);
  const publicAccessTokenRef = useRef(publicAccessToken);
  publicAccessTokenRef.current = publicAccessToken;
  const bootstrap = bootstrapToken === publicAccessToken ? loadedBootstrap : null;
  const viewLoading = bootstrapToken === publicAccessToken ? loading : true;
  const viewError = bootstrapToken === publicAccessToken ? error : '';

  const fetchLatestBootstrap = useCallback(() => {
    const token = publicAccessToken;
    if (!token) return Promise.reject(new Error('Public catalog token is required.'));
    const inFlight = bootstrapRequestRef.current;
    if (inFlight?.token === token) return inFlight.request;

    const request = publicCatalogApi.bootstrap(token).finally(() => {
      if (bootstrapRequestRef.current?.request === request) {
        bootstrapRequestRef.current = null;
      }
    });
    bootstrapRequestRef.current = { token, request };
    return request;
  }, [publicAccessToken]);

  const applyLatestBootstrap = useCallback((token: string, response: PublicCatalogBootstrap) => {
    if (publicAccessTokenRef.current !== token) return;
    setBootstrapToken(token);
    setLoadedBootstrap(response);
    setError('');
  }, []);

  const refreshCatalogItem = useCallback(async (itemId: string) => {
    const token = publicAccessToken;
    const response = await fetchLatestBootstrap();
    applyLatestBootstrap(token, response);
    return itemsFromBootstrap(response).find((item) => item.id === itemId) ?? null;
  }, [applyLatestBootstrap, fetchLatestBootstrap, publicAccessToken]);

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
    fetchLatestBootstrap()
      .then((response) => {
        if (!cancelled) applyLatestBootstrap(publicAccessToken, response);
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
  }, [applyLatestBootstrap, embedded, fetchLatestBootstrap, publicAccessToken, reloadKey, t.publicCatalog.incompleteLinkError, t.publicCatalog.publicUnavailable]);

  useEffect(() => {
    if (embedded || !publicAccessToken) return undefined;
    const refreshMedia = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const token = publicAccessToken;
      void fetchLatestBootstrap()
        .then((response) => applyLatestBootstrap(token, response))
        .catch(() => undefined);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshMedia();
    };
    const intervalId = window.setInterval(refreshMedia, PUBLIC_CATALOG_MEDIA_REFRESH_MS);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', refreshMedia);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', refreshMedia);
    };
  }, [applyLatestBootstrap, embedded, fetchLatestBootstrap, publicAccessToken]);

  useEffect(() => {
    if (embedded || !bootstrap) return undefined;
    const previousTitle = document.title;
    const companyName = bootstrap.companyName?.trim();
    document.title = companyName
      ? `${companyName} - Catálogo de productos`
      : 'Catálogo de productos';
    return () => {
      document.title = previousTitle;
    };
  }, [bootstrap?.companyName, embedded]);

  if (embedded) {
    const activeConfig = config ?? createDefaultPublicCatalogConfig(products, {
      title: t.publicCatalog.defaultTitle,
      description: t.publicCatalog.defaultDescription,
      contactCta: t.publicCatalog.contactCta,
    });
    return (
      <PublicCatalogWorkspace
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
      minimalContent
      moduleScope="inventory"
      errorMessage={viewError || null}
      banners={!online ? (
        <div role="status" className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          <WifiOff className="h-4 w-4" /> {t.publicCatalog.publicOffline}
        </div>
      ) : null}
      header={activeConfig ? (
        <PublicCatalogHeader config={activeConfig} itemCount={publicItems.length} t={t} compact={isMobile} />
      ) : (
        <header className="border-b border-slate-200 bg-white px-5 py-6 dark:border-slate-800 dark:bg-slate-950 md:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#FF6B5E]/10 text-[#B63B32]"><Globe2 /></span>
            <div>
              <p className="text-xs font-medium text-[#B63B32]">{t.publicCatalog.moduleEyebrow}</p>
              <h1 className="text-xl font-medium text-slate-950 dark:text-white">{viewLoading ? t.publicCatalog.preparingCatalog : t.publicCatalog.catalogUnavailable}</h1>
            </div>
          </div>
        </header>
      )}
    >
      {viewLoading ? (
        <div className="grid flex-1 place-items-center py-24 text-sm font-medium text-slate-500">
          {t.publicCatalog.loadingProducts}
        </div>
      ) : null}
      {!viewLoading && !activeConfig ? (
        <div className="grid flex-1 place-items-center py-16 text-center">
          <div className="max-w-md">
            <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{t.publicCatalog.publicConnectionHelp}</p>
            <Button type="button" variant="outline" className="mt-5 h-11 gap-2" disabled={!online} onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="h-4 w-4" /> {t.publicCatalog.tryAgain}
            </Button>
          </div>
        </div>
      ) : null}
      {!viewLoading && activeConfig && bootstrap ? (
        <PublicCatalogWorkspace
          config={activeConfig}
          items={publicItems}
          embedded={false}
          online={online}
          token={publicAccessToken}
          csrfToken={bootstrap.csrfToken}
          discountRules={bootstrap.discountRules}
          onRefreshCatalogItem={refreshCatalogItem}
        />
      ) : null}
    </KioskPublicShell>
  );
}

export default PublicCatalogPage;
