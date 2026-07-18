import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig, PublicCatalogContactMethod } from './types/publicCatalogTypes';
import { PublicCatalogProductSelector } from './PublicCatalogProductSelector';
import { PublicCatalogVisibilitySettings } from './PublicCatalogVisibilitySettings';

export function PublicCatalogEditor({
  catalog,
  products,
  units,
  businesses,
  t,
  onChange,
}: {
  catalog: PublicCatalogConfig | null;
  products: SalesCatalogItem[];
  units: Array<{ id: number; name: string }>;
  businesses: Array<{ id: number; unitId: number; name: string }>;
  t: ProductsTranslations;
  onChange: (patch: Partial<PublicCatalogConfig>) => void;
}) {
  const now = new Date();
  const minimumExpiration = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const availableBusinesses = catalog?.unitId
    ? businesses.filter((business) => business.unitId === catalog.unitId)
    : [];

  if (!catalog) {
    return (
      <section className="flex min-h-full items-center justify-center bg-white p-8">
        <div className="max-w-sm rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h3 className="text-lg font-bold text-slate-950">{t.publicCatalog.emptyManagerTitle}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{t.publicCatalog.emptyManagerDescription}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-0 overflow-y-auto bg-white">
      <div className="space-y-5 p-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-bold text-slate-950">{t.publicCatalog.identity}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.unitLabel}</span>
              <Select
                value={catalog.unitId ? String(catalog.unitId) : undefined}
                onValueChange={(value) => onChange({ unitId: Number(value), businessId: undefined })}
              >
                <SelectTrigger><SelectValue placeholder={t.publicCatalog.selectUnit} /></SelectTrigger>
                <SelectContent>
                  {units.map((unit) => <SelectItem key={unit.id} value={String(unit.id)}>{unit.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.businessLabel}</span>
              <Select
                disabled={!catalog.unitId}
                value={catalog.businessId ? String(catalog.businessId) : undefined}
                onValueChange={(value) => onChange({ businessId: Number(value) })}
              >
                <SelectTrigger><SelectValue placeholder={t.publicCatalog.selectBusiness} /></SelectTrigger>
                <SelectContent>
                  {availableBusinesses.map((business) => <SelectItem key={business.id} value={String(business.id)}>{business.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.catalogTitle}</span>
              <Input value={catalog.title} onChange={(event) => onChange({ title: event.target.value })} placeholder={t.publicCatalog.catalogTitle} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.coverImagePlaceholder}</span>
              <Input value={catalog.coverImageUrl} onChange={(event) => onChange({ coverImageUrl: event.target.value })} placeholder={t.publicCatalog.coverImagePlaceholder} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.ctaLabelField}</span>
              <Input value={catalog.contactCtaLabel} onChange={(event) => onChange({ contactCtaLabel: event.target.value })} placeholder={t.publicCatalog.ctaLabelField} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.contactMethod}</span>
              <Select value={catalog.contactMethod} onValueChange={(value) => onChange({ contactMethod: value as PublicCatalogContactMethod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">{t.publicCatalog.contactMethods.whatsapp}</SelectItem>
                  <SelectItem value="email">{t.publicCatalog.contactMethods.email}</SelectItem>
                  <SelectItem value="phone">{t.publicCatalog.contactMethods.phone}</SelectItem>
                  <SelectItem value="website">{t.publicCatalog.contactMethods.website}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.contactValuePlaceholder}</span>
              <Input value={catalog.contactValue} onChange={(event) => onChange({ contactValue: event.target.value })} placeholder={t.publicCatalog.contactValuePlaceholder} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.linkExpiration}</span>
              <Input
                type="datetime-local"
                min={minimumExpiration}
                value={catalog.expiresAt ?? ''}
                onChange={(event) => onChange({ expiresAt: event.target.value || undefined })}
              />
              <span className="text-xs font-medium text-slate-400">{t.publicCatalog.linkExpirationHelp}</span>
            </label>
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-slate-500">{t.publicCatalog.catalogDescription}</span>
              <Textarea value={catalog.description} onChange={(event) => onChange({ description: event.target.value })} placeholder={t.publicCatalog.catalogDescription} />
            </label>
          </div>
        </section>

        <PublicCatalogVisibilitySettings catalog={catalog} t={t} onChange={onChange} />
        <PublicCatalogProductSelector
          products={products}
          selectedProductIds={catalog.selectedProductIds}
          selectedCategoryIds={catalog.selectedCategoryIds}
          t={t}
          onSelectedProductIdsChange={(selectedProductIds) => onChange({ selectedProductIds })}
          onSelectedCategoryIdsChange={(selectedCategoryIds) => onChange({ selectedCategoryIds })}
        />
      </div>
    </section>
  );
}
