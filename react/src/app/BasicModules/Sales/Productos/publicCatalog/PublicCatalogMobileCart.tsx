import { ShoppingBag } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '../../../../components/ui/drawer';
import type { ProductsTranslations } from '../translations';
import { formatProductCurrency } from '../utils/productFormatters';
import { PublicCatalogCart } from './PublicCatalogCart';
import type { PublicCatalogCartItem, PublicCatalogConfig, PublicCatalogItem } from './types/publicCatalogTypes';

export function PublicCatalogMobileCart({
  open,
  items,
  cartItems,
  config,
  total,
  t,
  onOpenChange,
  onChangeQuantity,
  onRemoveItem,
  onRequestPurchase,
}: {
  open: boolean;
  items: PublicCatalogItem[];
  cartItems: PublicCatalogCartItem[];
  config: PublicCatalogConfig;
  total: number;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onRequestPurchase: () => void;
}) {
  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const currency = cartItems.map((cartItem) => items.find((item) => item.id === cartItem.itemId)?.currency).find(Boolean);

  if (quantity === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,.12)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.publicCatalog.cartItems(quantity)}</p>
            <p className="truncate text-lg font-medium text-slate-950 dark:text-white">
              {config.showPrices ? formatProductCurrency(total, currency) : t.publicCatalog.pricePending}
            </p>
          </div>
          <Button type="button" className="h-11 shrink-0 rounded-xl bg-[#FF6B5E] px-4 font-medium text-[#222831] hover:bg-[#E85C50]" onClick={() => onOpenChange(true)}>
            {t.publicCatalog.viewCart}
          </Button>
        </div>
      </div>

      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88dvh] rounded-t-3xl bg-white dark:bg-slate-950">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t.publicCatalog.cart}</DrawerTitle>
            <DrawerDescription>{t.publicCatalog.cartHelper}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 overflow-y-auto px-1 pb-[env(safe-area-inset-bottom)]">
            <PublicCatalogCart
              variant="mobile"
              items={items}
              cartItems={cartItems}
              config={config}
              t={t}
              onChangeQuantity={onChangeQuantity}
              onRemoveItem={onRemoveItem}
              onRequestPurchase={() => {
                onOpenChange(false);
                onRequestPurchase();
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
