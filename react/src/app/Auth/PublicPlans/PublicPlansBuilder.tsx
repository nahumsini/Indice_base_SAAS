import { Check, ChevronRight, CreditCard, Minus, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { BillingSignupConfig, BillingSignupProduct } from '../../api/billingSignup';
import type { PublicPlansCopy } from './publicPlansCopy';
import { calculatePublicPlanPricing, formatPublicPlanMoney } from './publicPlansPricing';

type PublicPlansBuilderProps = {
  config: BillingSignupConfig;
  copy: PublicPlansCopy;
  selectedCodes: string[];
  interval: 'MONTH' | 'YEAR';
  totalPeople: number;
  countryCode: string;
  onToggleProduct: (code: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onIntervalChange: (interval: 'MONTH' | 'YEAR') => void;
  onTotalPeopleChange: (value: number) => void;
  onCountryChange: (country: string) => void;
  onContinue: () => void;
};

const productAccents = ['#59C3A5', '#F4C84A', '#FF6B5E', '#2563EB', '#8B5CF6', '#147514'];

function ProductCard({ product, label, selected, index, countsAsOne, onToggle }: {
  product: BillingSignupProduct;
  label: string;
  selected: boolean;
  index: number;
  countsAsOne: string;
  onToggle: () => void;
}) {
  const accent = productAccents[index % productAccents.length];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`group relative min-h-40 overflow-hidden rounded-3xl border p-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${selected ? 'border-emerald-300 bg-emerald-50/70 shadow-[0_16px_40px_rgba(16,185,129,0.10)]' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg'}`}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />
      <span className="flex items-start justify-between gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700" style={{ color: accent }}>
          <Sparkles className="h-5 w-5" />
        </span>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-transparent'}`}>
          <Check className="h-4 w-4" />
        </span>
      </span>
      <span className="mt-6 block text-lg font-extrabold leading-tight text-slate-900">{label}</span>
      <span className="mt-2 block text-sm font-semibold text-slate-500">{countsAsOne}</span>
    </button>
  );
}

export function PublicPlansBuilder(props: PublicPlansBuilderProps) {
  const {
    config, copy, selectedCodes, interval, totalPeople, countryCode, onToggleProduct,
    onSelectAll, onClear, onIntervalChange, onTotalPeopleChange, onCountryChange, onContinue,
  } = props;
  const products = config.products.filter((product) => product.productType === 'BASIC');
  const extraSeats = Math.max(0, totalPeople - config.includedSeats);
  const pricing = calculatePublicPlanPricing(config, selectedCodes, extraSeats, interval);
  const canContinue = config.provisioningEnabled
    && config.checkoutEnabled
    && pricing.validSelection
    && pricing.estimatedAmountCents != null;
  const money = (value: number | null) => formatPublicPlanMoney(value, config.currency, copy.locale);

  return (
    <section className="bg-[#F7F9FC] px-5 py-20 sm:px-8">
      <div className="mx-auto grid max-w-[1380px] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-700">{copy.builderBadge}</span>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] text-slate-900 sm:text-4xl">{copy.builderTitle}</h2>
              <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-600">{copy.builderDescription}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onSelectAll} className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">{copy.selectAll}</button>
              <button type="button" onClick={onClear} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">{copy.clear}</button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard
                key={product.code}
                product={product}
                label={copy.productLabels[product.code] ?? product.displayName}
                selected={selectedCodes.includes(product.code)}
                index={index}
                countsAsOne={copy.countsAsOne}
                onToggle={() => onToggleProduct(product.code)}
              />
            ))}
          </div>

          <div className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {copy.billingCycle}
              <select
                value={interval}
                onChange={(event) => onIntervalChange(event.target.value as 'MONTH' | 'YEAR')}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="MONTH">{copy.monthly}</option>
                <option value="YEAR">{copy.annual}</option>
              </select>
            </label>

            <div className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">{copy.totalPeople}</span>
              <div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button type="button" aria-label="−" onClick={() => onTotalPeopleChange(totalPeople - 1)} className="inline-flex w-12 items-center justify-center text-slate-500 hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
                <span className="flex flex-1 items-center justify-center border-x border-slate-200 text-lg font-black text-slate-900">{totalPeople}</span>
                <button type="button" aria-label="+" onClick={() => onTotalPeopleChange(totalPeople + 1)} className="inline-flex w-12 items-center justify-center text-slate-500 hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {copy.country}
              <select
                value={countryCode}
                onChange={(event) => onCountryChange(event.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                {config.launchCountries.map((country) => <option key={country} value={country}>{copy.countryLabels[country] ?? country}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-500">
            <Users className="h-4 w-4 text-emerald-600" />
            {copy.teamDescription(config.includedSeats)}
          </div>
        </div>

        <aside className="overflow-hidden rounded-[32px] border border-emerald-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] xl:sticky xl:top-28">
          <div className="border-b border-slate-100 p-7">
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-700">{copy.summaryBadge}</span>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">{copy.summaryTitle}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{copy.selected(pricing.selectedBasicCount)}</p>
          </div>
          <div className="space-y-4 p-7">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-600"><span>{copy.basePlan}</span><strong className="text-slate-900">{money(pricing.baseAmountCents)}</strong></div>
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-600"><span>{copy.extraUsers} · {extraSeats}</span><strong className="text-slate-900">{money(pricing.extraSeatsAmountCents)}</strong></div>
            <div className="border-t border-slate-200 pt-5">
              <p className="text-sm font-bold text-slate-500">{copy.estimatedTotal}</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <strong className="text-4xl font-black tracking-[-0.045em] text-slate-900">{money(pricing.estimatedAmountCents)}</strong>
                <span className="pb-1 text-sm font-semibold text-slate-500">/{interval === 'MONTH' ? copy.monthly.toLowerCase() : copy.annual.toLowerCase()}</span>
              </div>
              <p className="mt-4 text-xs font-medium leading-5 text-slate-500">{copy.taxNote}</p>
            </div>

            {!canContinue && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">{pricing.validSelection ? copy.notReady : copy.pricePending}</p>}

            <button
              type="button"
              disabled={!canContinue}
              onClick={onContinue}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-base font-black text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {copy.start}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-6 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#F4B400]" />{copy.trialTrust(config.trialDays)}</span>
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#2563EB]" />{copy.cardTrust}</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />{copy.securityTrust}</span>
          </div>
        </aside>
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center text-sm font-semibold text-slate-500">{copy.footer}</p>
    </section>
  );
}
