import { BadgePercent, CalendarClock, Check, ChevronRight, CreditCard, HardDrive, Minus, Plus, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import type { BillingSignupConfig } from '../../api/billingSignup';
import type { PublicPlansCopy } from './publicPlansCopy';
import {
  calculatePublicPlanPricing,
  formatPublicPlanMoney,
  pricingModeForConfig,
  publishedProductAmount,
} from './publicPlansPricing';
import { PublicPlansProductCard } from './PublicPlansProductCard';

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
const productAccentText = ['#177D66', '#8A6500', '#C43B31', '#1D4ED8', '#6D28D9', '#126512'];
const stepAnchors = ['plan-modules', 'plan-team', 'plan-summary'];

export function PublicPlansBuilder(props: PublicPlansBuilderProps) {
  const {
    config, copy, selectedCodes, interval, totalPeople, countryCode, onToggleProduct,
    onSelectAll, onClear, onIntervalChange, onTotalPeopleChange, onCountryChange, onContinue,
  } = props;
  const pricingMode = pricingModeForConfig(config);
  const products = pricingMode === 'DIRECT_PRODUCTS'
    ? config.products
    : config.products.filter((product) => product.productType === 'BASIC');
  const selectedProducts = products.filter((product) => selectedCodes.includes(product.code));
  const extraSeats = Math.max(0, totalPeople - config.includedSeats);
  const pricing = calculatePublicPlanPricing(config, selectedCodes, extraSeats, interval);
  const canContinue = config.provisioningEnabled
    && config.checkoutEnabled
    && pricing.validSelection
    && pricing.estimatedAmountCents != null;
  const money = (value: number | null) => formatPublicPlanMoney(value, config.currency, copy.locale);
  const selectionPercent = products.length === 0 ? 0 : (selectedProducts.length / products.length) * 100;
  const unavailableMessage = selectedProducts.length === 0
    ? copy.chooseAtLeastOne
    : pricing.overlappingSelection
      ? copy.selectionConflict
      : pricing.estimatedAmountCents == null
        ? copy.pricePending
        : copy.notReady;

  return (
    <section id="configura-tu-plan" className="scroll-mt-24 bg-[#F7F9FC] px-5 py-16 sm:px-8">
      <div className="mx-auto grid max-w-[1380px] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
          <ol className="grid border-b border-slate-200 bg-slate-50/80 sm:grid-cols-3" aria-label={copy.builderTitle}>
            {copy.builderSteps.map((step, index) => (
              <li key={step} className={index > 0 ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''}>
                <a
                  href={`#${stepAnchors[index]}`}
                  className="group flex min-h-16 items-center gap-3 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[var(--indice-brand-border)]"
                >
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${index === 0 && selectedProducts.length > 0
                    ? 'border-[var(--indice-brand-primary)] bg-[var(--indice-brand-primary)] text-white'
                    : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    {index === 0 && selectedProducts.length > 0 ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span>{step}</span>
                </a>
              </li>
            ))}
          </ol>

          <div id="plan-modules" className="scroll-mt-28 p-6 sm:p-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-[var(--indice-brand-soft)] px-4 py-2 text-xs font-medium text-[var(--indice-brand-text)]">{copy.builderBadge}</span>
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-4xl">{copy.builderTitle}</h2>
                <p className="mt-3 max-w-2xl text-base font-normal leading-7 text-slate-600">{copy.builderDescription}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onSelectAll}
                  disabled={products.length === 0}
                  className="rounded-full border border-[var(--indice-brand-border)] px-4 py-2 text-sm font-medium text-[var(--indice-brand-text)] transition hover:bg-[var(--indice-brand-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.selectAll}
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  disabled={selectedProducts.length === 0}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.clear}
                </button>
              </div>
            </div>

            <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{copy.selectedModulesTitle}</p>
                <p className="text-sm font-normal text-slate-500" aria-live="polite">{copy.selectionProgress(selectedProducts.length, products.length)}</p>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-label={copy.selectedModulesTitle}
                aria-valuemin={0}
                aria-valuemax={products.length}
                aria-valuenow={selectedProducts.length}
              >
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#59C3A5,#F4C84A,#FF6B5E,#2563EB)] transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${selectionPercent}%` }}
                />
              </div>
              <div className="mt-4 flex min-h-9 flex-wrap items-center gap-2">
                {selectedProducts.length === 0 && <p className="text-sm font-normal text-slate-500">{copy.emptySelection}</p>}
                {selectedProducts.map((product) => (
                  <button
                    key={product.code}
                    type="button"
                    onClick={() => onToggleProduct(product.code)}
                    aria-label={`${copy.removeModule}: ${copy.productLabels[product.code] ?? product.displayName}`}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--indice-brand-border)] bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--indice-brand-soft-strong)]"
                  >
                    <span className="h-2 w-2 rounded-full bg-[var(--indice-brand-primary)]" aria-hidden="true" />
                    {copy.productLabels[product.code] ?? product.displayName}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <PublicPlansProductCard
                  key={product.code}
                  product={product}
                  label={copy.productLabels[product.code] ?? product.displayName}
                  description={copy.productDescriptions[product.code] ?? product.description ?? copy.builderDescription}
                  selected={selectedCodes.includes(product.code)}
                  accent={productAccents[index % productAccents.length]}
                  accentText={productAccentText[index % productAccentText.length]}
                  detail={pricingMode === 'DIRECT_PRODUCTS'
                    ? money(publishedProductAmount(config, product, interval))
                    : copy.countsAsOne}
                  kind={product.commercialKind === 'PACKAGE' ? copy.packageOffer : copy.moduleOffer}
                  addLabel={copy.addModule}
                  removeLabel={copy.removeModule}
                  selectedLabel={copy.selectedModule}
                  onToggle={() => onToggleProduct(product.code)}
                />
              ))}
            </div>

            <div id="plan-team" className="mt-8 scroll-mt-28 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="mb-5 flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-text)]">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-medium text-slate-900">{copy.teamTitle}</h3>
                  <p id="team-description" className="mt-1 text-sm font-normal leading-6 text-slate-500">{copy.teamDescription(config.includedSeats)}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.billingCycle}
                  <select
                    value={interval}
                    onChange={(event) => onIntervalChange(event.target.value as 'MONTH' | 'YEAR')}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-normal outline-none focus:border-[var(--indice-brand-primary)] focus:ring-4 focus:ring-[var(--indice-brand-soft-strong)]"
                  >
                    <option value="MONTH">{copy.monthly}</option>
                    <option value="YEAR">{copy.annual}</option>
                  </select>
                </label>

                <div className="grid gap-2">
                  <label htmlFor="public-plan-team-size" className="text-sm font-medium text-slate-700">{copy.totalPeople}</label>
                  <div className="flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      aria-label={copy.decreasePeople}
                      disabled={totalPeople <= config.includedSeats}
                      onClick={() => onTotalPeopleChange(totalPeople - 1)}
                      className="inline-flex w-12 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <input
                      id="public-plan-team-size"
                      type="number"
                      min={config.includedSeats}
                      max={config.includedSeats + 500}
                      value={totalPeople}
                      aria-describedby="team-description"
                      onChange={(event) => onTotalPeopleChange(Number(event.target.value) || config.includedSeats)}
                      className="min-w-0 flex-1 border-x border-slate-200 bg-white px-2 text-center text-lg font-medium text-slate-900 outline-none focus:bg-[var(--indice-brand-soft)]/50"
                    />
                    <button
                      type="button"
                      aria-label={copy.increasePeople}
                      disabled={totalPeople >= config.includedSeats + 500}
                      onClick={() => onTotalPeopleChange(totalPeople + 1)}
                      className="inline-flex w-12 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {copy.country}
                  <select
                    value={countryCode}
                    onChange={(event) => onCountryChange(event.target.value)}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-normal outline-none focus:border-[var(--indice-brand-primary)] focus:ring-4 focus:ring-[var(--indice-brand-soft-strong)]"
                  >
                    {config.launchCountries.map((country) => <option key={country} value={country}>{copy.countryLabels[country] ?? country}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <aside id="plan-summary" className="scroll-mt-28 overflow-hidden rounded-[32px] border border-[var(--indice-brand-border)] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] xl:sticky xl:top-28">
          <div className="border-b border-slate-100 p-7">
            <span className="inline-flex rounded-full bg-[var(--indice-brand-soft)] px-4 py-2 text-xs font-medium text-[var(--indice-brand-text)]">{copy.summaryBadge}</span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{copy.summaryTitle}</h2>
            <p className="mt-2 text-sm font-normal text-slate-500" aria-live="polite">{copy.selected(pricing.selectedProductCount)}</p>
          </div>
          <div className="space-y-4 p-7">
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label={copy.selectedModulesTitle}>
                {selectedProducts.map((product, index) => (
                  <span key={product.code} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: productAccents[index % productAccents.length] }} aria-hidden="true" />
                    {copy.productLabels[product.code] ?? product.displayName}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-4 text-sm font-normal text-slate-600"><span>{copy.basePlan}</span><strong className="font-medium text-slate-900">{money(pricing.baseAmountCents)}</strong></div>
            <div className="flex items-center justify-between gap-4 text-sm font-normal text-slate-600"><span>{copy.extraUsers} · {extraSeats}</span><strong className="font-medium text-slate-900">{money(pricing.extraSeatsAmountCents)}</strong></div>
            <div className="border-t border-slate-200 pt-5">
              <p className="text-sm font-medium text-slate-500">{copy.estimatedTotal}</p>
              <div className="mt-1 flex items-end justify-between gap-3" aria-live="polite">
                <strong className="text-4xl font-semibold tracking-[-0.045em] text-slate-900">{money(pricing.estimatedAmountCents)}</strong>
                <span className="pb-1 text-sm font-normal text-slate-500">/{interval === 'MONTH' ? copy.monthly.toLowerCase() : copy.annual.toLowerCase()}</span>
              </div>
              <p className="mt-4 text-xs font-normal leading-5 text-slate-500">{copy.taxNote}</p>
            </div>

            {!canContinue && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-800">{unavailableMessage}</p>}

            <button
              type="button"
              disabled={!canContinue}
              onClick={onContinue}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--indice-brand-primary)] px-5 text-base font-medium text-white shadow-lg shadow-[var(--indice-brand-shadow-soft)] transition hover:bg-[var(--indice-brand-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--indice-brand-border)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {copy.start}
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-6 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#C18A00]" />{copy.trialTrust(config.trialDays)}</span>
            <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[var(--indice-brand-text)]" />{copy.consultingTrust(config.includedConsultationsPerMonth ?? 1, config.consultationMinutes ?? 60)}</span>
            <span className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-violet-700" />{copy.storageTrust(config.includedStorageGiB ?? 5, config.storageBlockGiB ?? 5, money(config.storageBlockMonthlyAmountCents ?? 1_500))}</span>
            <span className="flex items-center gap-2"><BadgePercent className="h-4 w-4 text-[#C18A00]" />{copy.annualTrust(config.annualDiscountPercent ?? 20)}</span>
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[var(--indice-brand-action)]" />{copy.cardTrust}</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--indice-brand-text)]" />{copy.securityTrust}</span>
          </div>
        </aside>
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center text-sm font-normal text-slate-500">{copy.footer}</p>
    </section>
  );
}
