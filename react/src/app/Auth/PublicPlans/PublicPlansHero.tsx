import { ArrowDown, BadgeCheck, Compass } from 'lucide-react';
import type { BillingSignupConfig } from '../../api/billingSignup';
import type { PublicPlansCopy } from './publicPlansCopy';
import {
  formatPublicPlanMoney,
  publishedTierAmount,
  type PublicPlanPricing,
} from './publicPlansPricing';

type PublicPlansHeroProps = {
  config: BillingSignupConfig;
  copy: PublicPlansCopy;
  interval: 'MONTH' | 'YEAR';
  pricing: PublicPlanPricing | null;
};

export function PublicPlansHero({ config, copy, interval, pricing }: PublicPlansHeroProps) {
  const tiers = [
    { count: 1, label: copy.tierOne },
    { count: 2, label: copy.tierTwo },
    { count: 3, label: copy.tierThree },
    { count: 4, label: copy.tierAll },
  ];

  return (
    <section className="relative overflow-hidden border-b border-blue-100 bg-[radial-gradient(circle_at_12%_18%,var(--indice-brand-glow),transparent_30%),radial-gradient(circle_at_88%_12%,var(--indice-brand-shadow-soft),transparent_32%),linear-gradient(180deg,var(--indice-brand-soft)_0%,#ffffff_100%)] px-5 pb-14 pt-12 sm:px-8 sm:pt-16">
      <div className="mx-auto max-w-6xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-white/80 px-5 py-2 text-sm font-medium text-[var(--indice-brand-text)] shadow-sm">
          <BadgeCheck className="h-4 w-4" />
          {copy.heroBadge}
        </span>
        <h1 className="mx-auto mt-6 max-w-5xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-slate-900 sm:text-5xl lg:text-6xl">
          {copy.heroTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-4xl text-balance text-lg font-normal leading-8 text-slate-600 sm:text-xl">
          {copy.heroDescription}
        </p>

        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2" aria-label={copy.builderTitle}>
          {copy.pillars.map((pillar, index) => (
            <span
              key={pillar}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${['bg-[#59C3A5]', 'bg-[#F4C84A]', 'bg-[#FF6B5E]', 'bg-[#2563EB]'][index]}`} aria-hidden="true" />
              {pillar}
            </span>
          ))}
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#configura-tu-plan"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--indice-brand-primary)] px-6 text-base font-medium text-white shadow-lg shadow-[var(--indice-brand-shadow-soft)] transition hover:bg-[var(--indice-brand-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--indice-brand-border)]"
          >
            {copy.heroAction}
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="https://indiceapp.com/metodologia.php"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 text-base font-medium text-slate-700 transition hover:border-[var(--indice-brand-border)] hover:text-[var(--indice-brand-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--indice-brand-soft-strong)]"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            {copy.heroSecondaryAction}
          </a>
        </div>

        <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-[var(--indice-brand-border)] bg-white/85 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur">
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <span className="rounded-full bg-[var(--indice-brand-soft)] px-4 py-2 text-sm font-medium text-[var(--indice-brand-text)]">{copy.publishedOffer}</span>
            <span className="text-sm font-normal text-slate-600">{copy.publishedOfferDescription}</span>
          </div>
        </div>

        {pricing?.pricingMode === 'DIRECT_PRODUCTS' ? (
          <div className="mx-auto mt-6 grid max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="relative px-6 py-5 sm:px-8">
              <span className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#59C3A5,#F4C84A,#FF6B5E,#2563EB)]" />
              <p className="text-lg font-medium text-slate-900">{copy.directPricingTitle}</p>
              <p className="mt-1 text-sm font-normal leading-6 text-slate-500">{copy.directPricingDescription}</p>
            </div>
            <div className="border-t border-slate-200 px-7 py-5 text-center sm:border-l sm:border-t-0 sm:px-10" aria-live="polite">
              <p className="text-sm font-normal text-slate-500">{copy.selected(pricing.selectedProductCount)}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                {formatPublicPlanMoney(pricing.baseAmountCents, config.currency, copy.locale)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-6 grid max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:grid-cols-4" aria-live="polite">
            {tiers.map((tier, index) => {
              const selectedCount = pricing?.selectedBasicCount ?? 0;
              const active = selectedCount === tier.count || (tier.count === 4 && selectedCount >= 4);
              const amount = publishedTierAmount(config, tier.count, interval);
              return (
                <div
                  key={tier.count}
                  className={`relative px-5 py-4 transition-colors ${index > 0 ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''} ${active ? 'bg-[var(--indice-brand-soft)]/70' : ''}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${['bg-[#59C3A5]', 'bg-[#F4C84A]', 'bg-[#FF6B5E]', 'bg-[#2563EB]'][index]}`} />
                  <p className="text-sm font-normal text-slate-500">{tier.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                    {formatPublicPlanMoney(amount, config.currency, copy.locale)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-sm font-normal text-slate-500">{copy.pricesBeforeTaxes}</p>
      </div>
    </section>
  );
}
