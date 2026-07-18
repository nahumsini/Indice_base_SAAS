import { Switch } from '../../../../components/ui/switch';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

type VisibilityKey =
  | 'showPrices'
  | 'showWholesalePrices'
  | 'showStockStatus'
  | 'showItemTypeBadges'
  | 'showCategories'
  | 'allowCart'
  | 'allowPurchaseRequest'
  | 'showOnlinePaymentComingSoon';

const visibilityKeys: VisibilityKey[] = [
  'showPrices',
  'showWholesalePrices',
  'showStockStatus',
  'showItemTypeBadges',
  'showCategories',
  'allowCart',
  'allowPurchaseRequest',
  'showOnlinePaymentComingSoon',
];

function visibilityLabel(t: ProductsTranslations, key: VisibilityKey) {
  return {
    showPrices: t.publicCatalog.showPrices,
    showWholesalePrices: t.publicCatalog.showWholesalePrices,
    showStockStatus: t.publicCatalog.showStockStatus,
    showItemTypeBadges: t.publicCatalog.showItemTypeBadges,
    showCategories: t.publicCatalog.showCategories,
    allowCart: t.publicCatalog.allowCart,
    allowPurchaseRequest: t.publicCatalog.allowPurchaseRequest,
    showOnlinePaymentComingSoon: t.publicCatalog.showOnlinePaymentComingSoon,
  }[key];
}

export function PublicCatalogVisibilitySettings({
  catalog,
  t,
  onChange,
}: {
  catalog: PublicCatalogConfig;
  t: ProductsTranslations;
  onChange: (patch: Partial<PublicCatalogConfig>) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-950">{t.publicCatalog.visibility}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visibilityKeys.map((key) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
            {visibilityLabel(t, key)}
            <Switch checked={Boolean(catalog[key])} onCheckedChange={(checked) => onChange({ [key]: checked })} />
          </label>
        ))}
      </div>
    </section>
  );
}
