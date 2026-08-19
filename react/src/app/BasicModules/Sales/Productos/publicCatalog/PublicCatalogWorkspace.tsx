import { useMemo, useState } from 'react';
import { useIsMobile } from '../../../../components/ui/use-mobile';
import { productTypes } from '../../types';
import { useProductsTranslations } from '../translations';
import type { PublicCatalogCartItem, PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { filterPublicCatalogItems } from './utils/publicCatalogFilters';
import { calculatePublicCatalogCartTotal, getPublicCatalogUnitPrice } from './utils/publicCatalogPricing';
import { applyPublicCatalogPriceVisibility } from './utils/publicCatalogVisibility';
import { publicCatalogApi } from './publicCatalogApi';
import { PublicCatalogCart } from './PublicCatalogCart';
import { PublicCatalogFilters } from './PublicCatalogFilters';
import { PublicCatalogGrid } from './PublicCatalogGrid';
import { PublicCatalogHeader } from './PublicCatalogHeader';
import { PublicCatalogMobileCard } from './PublicCatalogMobileCard';
import { PublicCatalogMobileCart } from './PublicCatalogMobileCart';
import { PublicCatalogMobileFilters } from './PublicCatalogMobileFilters';
import { PublicCatalogRequestModal } from './PublicCatalogRequestModal';
import { calculateAutomaticDiscounts } from '../../../PointOfSale/shared/commercial/discounts';
import { mapDiscountRule, type DiscountRuleWire } from '../../../PointOfSale/shared/commercial/discounts/services/discountRulesApi';

type PublicCatalogWorkspaceProps = {
  config: PublicCatalogConfig;
  items: PublicCatalogItem[];
  embedded: boolean;
  online?: boolean;
  token?: string;
  csrfToken?: string;
  discountRules?: DiscountRuleWire[];
};

export function PublicCatalogWorkspace({
  config,
  items,
  embedded,
  online = true,
  token,
  csrfToken,
  discountRules = [],
}: PublicCatalogWorkspaceProps) {
  const t = useProductsTranslations();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [cartItems, setCartItems] = useState<PublicCatalogCartItem[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const experienceItems = useMemo(() => applyPublicCatalogPriceVisibility(items, config), [config, items]);
  const filteredItems = useMemo(() => filterPublicCatalogItems({
    items: experienceItems,
    search,
    category,
    type,
  }), [category, experienceItems, search, type]);
  const categories = useMemo(
    () => Array.from(new Set(experienceItems.map((item) => item.category).filter(Boolean))) as NonNullable<PublicCatalogItem['category']>[],
    [experienceItems],
  );
  const availableTypes = useMemo(
    () => config.showItemTypeBadges
      ? productTypes.filter((itemType) => experienceItems.some((item) => item.type === itemType))
      : [],
    [config.showItemTypeBadges, experienceItems],
  );
  const subtotal = calculatePublicCatalogCartTotal(experienceItems, cartItems);
  const automaticDiscount = calculateAutomaticDiscounts(
    discountRules.map(mapDiscountRule),
    cartItems.flatMap((cartItem) => {
      const item = experienceItems.find((candidate) => candidate.id === cartItem.itemId);
      return item ? [{
        key: item.id,
        amount: getPublicCatalogUnitPrice(item, cartItem.quantity).unitPrice * cartItem.quantity,
        productId: item.id,
        category: item.category,
      }] : [];
    }),
    'publicCatalog',
  );
  const estimatedTotal = automaticDiscount.total;

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

  const removeCartItem = (itemId: string) => {
    setCartItems((current) => current.filter((item) => item.itemId !== itemId));
  };

  const workspace = isMobile ? (
    <div className={`min-h-full w-full min-w-0 overflow-x-hidden bg-slate-50 dark:bg-slate-950 ${cartItems.length > 0 ? 'pb-28' : 'pb-5'}`}>
      <PublicCatalogMobileFilters
        search={search}
        category={category}
        type={type}
        categories={config.showCategories ? categories : []}
        types={availableTypes}
        resultCount={filteredItems.length}
        t={t}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onTypeChange={setType}
      />
      <div className="w-full min-w-0 space-y-3 px-3 py-3 sm:px-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            {t.publicCatalog.emptyCatalog}
          </div>
        ) : filteredItems.map((item) => (
          <PublicCatalogMobileCard key={item.id} item={item} config={config} t={t} onAddToCart={handleAddToCart} />
        ))}
      </div>
      {config.allowCart ? (
        <PublicCatalogMobileCart
          open={mobileCartOpen}
          items={experienceItems}
          cartItems={cartItems}
          config={config}
          total={estimatedTotal}
          discountAmount={automaticDiscount.discountAmount}
          t={t}
          onOpenChange={setMobileCartOpen}
          onChangeQuantity={handleChangeQuantity}
          onRemoveItem={removeCartItem}
          onRequestPurchase={() => setRequestOpen(true)}
        />
      ) : null}
    </div>
  ) : (
    <div className="bg-slate-50/80 py-5 dark:bg-slate-950">
      <PublicCatalogFilters
        search={search}
        category={category}
        type={type}
        categories={config.showCategories ? categories : []}
        types={availableTypes}
        resultCount={filteredItems.length}
        t={t}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onTypeChange={setType}
      />
      <div className={`mx-auto mt-5 grid max-w-7xl gap-5 px-4 sm:px-6 lg:px-8 ${config.allowCart ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}`}>
        <PublicCatalogGrid items={filteredItems} config={config} t={t} onAddToCart={handleAddToCart} />
        {config.allowCart ? (
          <PublicCatalogCart
            items={experienceItems}
            cartItems={cartItems}
            config={config}
            t={t}
            total={estimatedTotal}
            discountAmount={automaticDiscount.discountAmount}
            onChangeQuantity={handleChangeQuantity}
            onRemoveItem={removeCartItem}
            onRequestPurchase={() => setRequestOpen(true)}
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {embedded ? (
        <main className="min-h-0 bg-slate-50 dark:bg-slate-950">
          <PublicCatalogHeader config={config} itemCount={experienceItems.length} t={t} />
          {workspace}
        </main>
      ) : workspace}
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
}
