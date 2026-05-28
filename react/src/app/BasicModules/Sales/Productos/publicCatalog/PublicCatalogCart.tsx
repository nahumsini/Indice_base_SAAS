import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import { formatProductCurrency } from '../utils/productFormatters';
import type { PublicCatalogCartItem, PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';
import { calculatePublicCatalogCartItem, calculatePublicCatalogCartTotal } from './utils/publicCatalogPricing';

export function PublicCatalogCart({
  items,
  cartItems,
  config,
  t,
  onChangeQuantity,
  onRemoveItem,
  onRequestPurchase,
}: {
  items: PublicCatalogItem[];
  cartItems: PublicCatalogCartItem[];
  config: PublicCatalogConfig;
  t: ProductsTranslations;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onRequestPurchase: () => void;
}) {
  const total = calculatePublicCatalogCartTotal(items, cartItems);

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <ShoppingBag className="h-5 w-5 text-[#FF6B5E]" />
        {t.publicCatalog.cart}
      </h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{t.publicCatalog.cartHelper}</p>

      <div className="mt-4 space-y-3">
        {cartItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
            {t.publicCatalog.emptyCart}
          </div>
        ) : cartItems.map((cartItem) => {
          const item = items.find((candidate) => candidate.id === cartItem.itemId);

          if (!item) {
            return null;
          }

          const pricedItem = calculatePublicCatalogCartItem(item, cartItem);

          return (
            <div key={cartItem.itemId} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{item.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {pricedItem.appliedPriceType === 'wholesale' ? t.publicCatalog.wholesalePrice : t.publicCatalog.publicPrice}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#B63B32]" onClick={() => onRemoveItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => onChangeQuantity(item.id, Math.max(1, cartItem.quantity - 1))}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-8 text-center font-black">{cartItem.quantity}</span>
                  <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => onChangeQuantity(item.id, cartItem.quantity + 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="font-black text-slate-950">{formatProductCurrency(pricedItem.lineTotal)}</p>
              </div>

              {item.wholesalePrice !== undefined && item.wholesaleMinQuantity !== undefined ? (
                <p className="mt-2 text-xs font-semibold text-[#8a5f04]">
                  {t.publicCatalog.wholesaleNote(formatProductCurrency(item.wholesalePrice), item.wholesaleMinQuantity)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-3">
        <div className="flex items-center justify-between text-lg">
          <span className="font-black text-slate-950">{t.publicCatalog.estimatedTotal}</span>
          <span className="font-black text-[#B63B32]">{formatProductCurrency(total)}</span>
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{t.publicCatalog.taxAvailabilityNote}</p>
        {config.showOnlinePaymentComingSoon ? (
          <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#B63B32]">{t.publicCatalog.onlinePaymentComingSoon}</p>
        ) : null}
      </div>

      {config.allowPurchaseRequest ? (
        <Button className="mt-4 h-11 w-full rounded-lg bg-[#FF6B5E] font-black text-white hover:bg-[#E85C50]" onClick={onRequestPurchase} disabled={cartItems.length === 0}>
          {t.publicCatalog.requestPurchase}
        </Button>
      ) : null}
    </aside>
  );
}
