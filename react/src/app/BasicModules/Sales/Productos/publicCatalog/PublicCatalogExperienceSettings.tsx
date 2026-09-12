import { BriefcaseBusiness, Building2, Hotel, PackageOpen, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { PublicCatalogCard } from './PublicCatalogCard';
import type {
  PublicCatalogCardStyle,
  PublicCatalogConfig,
  PublicCatalogExperienceProfile,
  PublicCatalogHeroStyle,
  PublicCatalogImageRatio,
  PublicCatalogItem,
  PublicCatalogLayoutStyle,
} from './types/publicCatalogTypes';
import { getProductsForPublicCatalog } from './utils/publicCatalogAdapters';
import {
  PUBLIC_CATALOG_BRAND_COLORS,
  PUBLIC_CATALOG_EXPERIENCE_PRESETS,
  getPublicCatalogExperienceStyle,
} from './utils/publicCatalogExperience';

const profileIcons = {
  general: Building2,
  retail: ShoppingBag,
  hospitality: Hotel,
  services: BriefcaseBusiness,
  foodBeverage: UtensilsCrossed,
  wholesale: PackageOpen,
};

const profileKeys = Object.keys(PUBLIC_CATALOG_EXPERIENCE_PRESETS) as PublicCatalogExperienceProfile[];

const previewFallback = (catalog: PublicCatalogConfig, copy: ProductsTranslations['publicCatalog']['experience']): PublicCatalogItem => ({
  id: 'public-catalog-preview',
  name: catalog.title || copy.previewTitle,
  type: 'Product',
  description: copy.previewDescription,
  publicPrice: 0,
  currency: 'MXN',
  publicInventoryStatus: 'noInventoryTracking',
  readyForSales: true,
});

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; description: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={`rounded-xl border p-3 text-left transition ${value === option.value ? 'border-[var(--catalog-accent)] bg-[var(--catalog-accent-soft)] ring-1 ring-[var(--catalog-accent)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            onClick={() => onChange(option.value)}
          >
            <span className="block text-sm font-medium text-slate-950">{option.label}</span>
            <span className="mt-1 block text-xs leading-4 text-slate-500">{option.description}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function PublicCatalogExperienceSettings({
  catalog,
  products,
  t,
  onChange,
}: {
  catalog: PublicCatalogConfig;
  products: SalesCatalogItem[];
  t: ProductsTranslations;
  onChange: (patch: Partial<PublicCatalogConfig>) => void;
}) {
  const copy = t.publicCatalog.experience;
  const style = getPublicCatalogExperienceStyle(catalog);
  const selectedPreviewItems = getProductsForPublicCatalog(products, catalog);
  const previewItem = selectedPreviewItems.find((item) => Boolean(item.thumbnailUrl))
    ?? selectedPreviewItems[0]
    ?? previewFallback(catalog, copy);

  return (
    <div className="space-y-4" style={style}>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-lg font-medium text-slate-950">{copy.profileTitle}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-500">{copy.profileDescription}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {profileKeys.map((profile) => {
            const Icon = profileIcons[profile];
            const selected = catalog.experienceProfile === profile;
            return (
              <button
                key={profile}
                type="button"
                aria-pressed={selected}
                className={`flex min-h-24 items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-[var(--catalog-accent)] bg-[var(--catalog-accent-soft)] ring-1 ring-[var(--catalog-accent)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                onClick={() => onChange(PUBLIC_CATALOG_EXPERIENCE_PRESETS[profile])}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--catalog-accent-soft)] text-[var(--catalog-accent-ink)]"><Icon className="h-4 w-4" /></span>
                <span>
                  <span className="block text-sm font-medium text-slate-950">{copy.profiles[profile].label}</span>
                  <span className="mt-1 block text-xs leading-4 text-slate-500">{copy.profiles[profile].description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="space-y-5">
            <fieldset>
              <legend className="text-sm font-medium text-slate-800">{copy.brandColor}</legend>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {PUBLIC_CATALOG_BRAND_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${copy.brandColor}: ${color}`}
                    aria-pressed={catalog.accentColor === color}
                    className={`h-9 w-9 rounded-full border-2 border-white shadow-sm ring-offset-2 ${catalog.accentColor === color ? 'ring-2 ring-slate-900' : 'ring-1 ring-slate-200'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => onChange({ accentColor: color })}
                  />
                ))}
                <label className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600">
                  {copy.customColor}
                  <input
                    type="color"
                    value={catalog.accentColor}
                    className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
                    onChange={(event) => onChange({ accentColor: event.target.value.toUpperCase() })}
                  />
                  <span className="font-mono">{catalog.accentColor}</span>
                </label>
              </div>
            </fieldset>

            <ChoiceGroup<PublicCatalogHeroStyle>
              label={copy.heroTitle}
              value={catalog.heroStyle}
              options={(['soft', 'solid', 'cover'] as const).map((value) => ({ value, ...copy.heroStyles[value] }))}
              onChange={(heroStyle) => onChange({ heroStyle })}
            />
            <ChoiceGroup<PublicCatalogLayoutStyle>
              label={copy.layoutTitle}
              value={catalog.layoutStyle}
              options={(['grid', 'showcase', 'compact'] as const).map((value) => ({ value, ...copy.layoutStyles[value] }))}
              onChange={(layoutStyle) => onChange({ layoutStyle })}
            />
            <ChoiceGroup<PublicCatalogCardStyle>
              label={copy.cardTitle}
              value={catalog.cardStyle}
              options={(['elevated', 'outlined', 'minimal'] as const).map((value) => ({ value, ...copy.cardStyles[value] }))}
              onChange={(cardStyle) => onChange({ cardStyle })}
            />
            <ChoiceGroup<PublicCatalogImageRatio>
              label={copy.imageTitle}
              value={catalog.imageRatio}
              options={(['landscape', 'square', 'portrait'] as const).map((value) => ({ value, ...copy.imageRatios[value] }))}
              onChange={(imageRatio) => onChange({ imageRatio })}
            />
          </div>

          <aside className="lg:sticky lg:top-0 lg:self-start">
            <p className="mb-2 text-sm font-medium text-slate-800">{copy.livePreview}</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
              <p className="sr-only" aria-live="polite">
                {copy.livePreview}: {previewItem.name}. {copy.layoutStyles[catalog.layoutStyle].label}. {copy.cardStyles[catalog.cardStyle].label}. {copy.imageRatios[catalog.imageRatio].label}.
              </p>
              <div className="pointer-events-none select-none" inert aria-hidden="true">
                <PublicCatalogCard
                  item={previewItem}
                  config={catalog}
                  t={t}
                  onAddToCart={() => undefined}
                  onCheckAvailability={() => undefined}
                  onOpenGallery={() => undefined}
                  onDownloadImages={() => undefined}
                  onShareWhatsApp={() => undefined}
                  downloadingImages={false}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                <span className="rounded-full border border-[var(--catalog-accent-border)] bg-[var(--catalog-accent-soft)] px-2 py-1 text-[10px] font-medium text-[var(--catalog-accent-ink)]">{copy.layoutStyles[catalog.layoutStyle].label}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600">{copy.cardStyles[catalog.cardStyle].label}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600">{copy.imageRatios[catalog.imageRatio].label}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
