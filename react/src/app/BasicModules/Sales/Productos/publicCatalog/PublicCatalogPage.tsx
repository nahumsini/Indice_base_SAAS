import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import type { SalesCatalogItem } from '../../types';
import { useSalesCrm } from '../../salesCrmContext';
import { productTypes } from '../../types';
import { useProductsTranslations } from '../translations';
import type { PublicCatalogCartItem, PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { createDefaultPublicCatalogConfig, getProductsForPublicCatalog } from './utils/publicCatalogAdapters';
import { filterPublicCatalogItems } from './utils/publicCatalogFilters';
import { calculatePublicCatalogCartTotal, getPublicCatalogUnitPrice } from './utils/publicCatalogPricing';
import { PublicCatalogCart } from './PublicCatalogCart';
import { PublicCatalogFilters } from './PublicCatalogFilters';
import { PublicCatalogGrid } from './PublicCatalogGrid';
import { PublicCatalogHeader } from './PublicCatalogHeader';
import { PublicCatalogRequestModal } from './PublicCatalogRequestModal';

export function PublicCatalogPage({
  config,
  products: providedProducts,
  embedded = false,
}: {
  config?: PublicCatalogConfig;
  products?: SalesCatalogItem[];
  embedded?: boolean;
}) {
  const params = useParams();
  const t = useProductsTranslations();
  const salesCrm = useSalesCrm();
  const products = providedProducts ?? salesCrm.products;
  const activeConfig = config ?? createDefaultPublicCatalogConfig(products, {
    title: t.publicCatalog.defaultTitle,
    description: t.publicCatalog.defaultDescription,
    contactCta: t.publicCatalog.contactCta,
  });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [cartItems, setCartItems] = useState<PublicCatalogCartItem[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);

  const catalogItems = useMemo(() => getProductsForPublicCatalog(products, activeConfig), [activeConfig, products]);
  const filteredItems = useMemo(() => filterPublicCatalogItems({
    items: catalogItems,
    search,
    category,
    type,
  }), [catalogItems, category, search, type]);
  const categories = useMemo(() => Array.from(new Set(catalogItems.map((item) => item.category).filter(Boolean))) as NonNullable<PublicCatalogItem['category']>[], [catalogItems]);
  const availableTypes = useMemo(() => productTypes.filter((itemType) => catalogItems.some((item) => item.type === itemType)), [catalogItems]);
  const estimatedTotal = calculatePublicCatalogCartTotal(catalogItems, cartItems);

  const handleAddToCart = (item: PublicCatalogItem) => {
    const existingItem = cartItems.find((cartItem) => cartItem.itemId === item.id);
    const nextQuantity = existingItem ? existingItem.quantity + 1 : 1;
    const pricing = getPublicCatalogUnitPrice(item, nextQuantity);

    if (!activeConfig.allowCart) {
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
    const item = catalogItems.find((candidate) => candidate.id === itemId);
    if (!item) {
      return;
    }

    const pricing = getPublicCatalogUnitPrice(item, quantity);
    setCartItems((current) => current.map((cartItem) => (
      cartItem.itemId === itemId ? { ...cartItem, quantity, ...pricing } : cartItem
    )));
  };

  return (
    <main className={embedded ? 'min-h-0 bg-slate-50' : 'min-h-screen bg-slate-50'}>
      {!embedded ? (
        <div className="border-b border-[#FF6B5E]/20 bg-[#FF6B5E]/10 px-5 py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-[#B63B32]">
          {t.publicCatalog.demoLinkLabel}: {params.publicAccessToken ?? activeConfig.publicAccessToken}
        </div>
      ) : null}

      <PublicCatalogHeader config={activeConfig} t={t} />

      <div className="space-y-6 py-6">
        <PublicCatalogFilters
          search={search}
          category={category}
          type={type}
          categories={categories}
          types={availableTypes}
          t={t}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onTypeChange={setType}
        />

        <div className="mx-auto grid max-w-7xl gap-6 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="-mx-5 md:-mx-8 lg:mx-0">
            <PublicCatalogGrid items={filteredItems} config={activeConfig} t={t} onAddToCart={handleAddToCart} />
          </div>
          {activeConfig.allowCart ? (
            <PublicCatalogCart
              items={catalogItems}
              cartItems={cartItems}
              config={activeConfig}
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
        onOpenChange={setRequestOpen}
      />
    </main>
  );
}

export default PublicCatalogPage;
