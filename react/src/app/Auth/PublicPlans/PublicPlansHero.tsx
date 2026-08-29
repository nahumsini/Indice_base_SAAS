import { BadgeCheck } from 'lucide-react';
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
    <section className="relative overflow-hidden border-b border-blue-100 bg-[radial-gradient(circle_at_12%_18%,rgba(89,195,165,0.20),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.14),transparent_32%),linear-gradient(180deg,#f8fffd_0%,#ffffff_100%)] px-5 pb-24 pt-20 sm:px-8 sm:pt-24">
      <div className="mx-auto max-w-6xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-5 py-2 text-sm font-bold text-emerald-700 shadow-sm">
          <BadgeCheck className="h-4 w-4" />
          {copy.heroBadge}
        </span>
        <h1 className="mx-auto mt-8 max-w-5xl text-balance text-5xl font-black leading-[1.03] tracking-[-0.055em] text-slate-900 sm:text-6xl lg:text-7xl">
          {copy.heroTitle}
        </h1>
        <p className="mx-auto mt-7 max-w-4xl text-balance text-lg font-medium leading-8 text-slate-600 sm:text-xl">
          {copy.heroDescription}
        </p>

        <div className="mx-auto mt-12 max-w-5xl rounded-3xl border border-emerald-200 bg-white/85 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur sm:p-7">
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">{copy.publishedOffer}</span>
            <span className="text-sm font-semibold text-slate-600">{copy.publishedOfferDescription}</span>
          </div>
        </div>

        {pricing?.pricingMode === 'DIRECT_PRODUCTS' ? (
          <div className="mx-auto mt-10 grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="relative px-7 py-7 sm:px-9">
              <span className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#59C3A5,#F4C84A,#FF6B5E,#2563EB)]" />
              <p className="text-lg font-black text-slate-900">{copy.directPricingTitle}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{copy.directPricingDescription}</p>
            </div>
            <div className="border-t border-slate-200 px-7 py-6 text-center sm:border-l sm:border-t-0 sm:px-10">
              <p className="text-sm font-semibold text-slate-500">{copy.selected(pricing.selectedProductCount)}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                {formatPublicPlanMoney(pricing.baseAmountCents, config.currency, copy.locale)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-10 grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:grid-cols-4">
            {tiers.map((tier, index) => {
              const selectedCount = pricing?.selectedBasicCount ?? 0;
              const active = selectedCount === tier.count || (tier.count === 4 && selectedCount >= 4);
              const amount = publishedTierAmount(config, tier.count, interval);
              return (
                <div
                  key={tier.count}
                  className={`relative px-5 py-6 ${index > 0 ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''} ${active ? 'bg-emerald-50/70' : ''}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${['bg-[#59C3A5]', 'bg-[#F4C84A]', 'bg-[#FF6B5E]', 'bg-[#2563EB]'][index]}`} />
                  <p className="text-sm font-semibold text-slate-500">{tier.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    {formatPublicPlanMoney(amount, config.currency, copy.locale)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-5 text-sm font-medium text-slate-500">{copy.pricesBeforeTaxes}</p>
      </div>
    </section>
  );
}
