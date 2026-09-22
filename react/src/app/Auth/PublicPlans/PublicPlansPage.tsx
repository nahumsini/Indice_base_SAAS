import { Loader2, RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { billingSignupApi, type BillingSignupConfig } from '../../api/billingSignup';
import { languages, useLanguage } from '../../shared/context';
import { PublicPlansBuilder } from './PublicPlansBuilder';
import { PublicPlansHeader } from './PublicPlansHeader';
import { PublicPlansHero } from './PublicPlansHero';
import { getPublicPlansCopy } from './publicPlansCopy';
import {
  calculatePublicPlanPricing,
  pricingModeForConfig,
  selectAllCompatibleProductCodes,
  toggleCompatibleProductCode,
} from './publicPlansPricing';
import { buildPublicPlanSearch, parsePublicPlanSearch } from './publicPlansSelection';

export default function PublicPlansPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const copy = getPublicPlansCopy(currentLanguage.code);
  const [config, setConfig] = useState<BillingSignupConfig | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [interval, setInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [totalPeople, setTotalPeople] = useState(0);
  const [countryCode, setCountryCode] = useState('MX');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const requestedLocale = new URLSearchParams(location.search).get('locale');
    const requestedLanguage = languages.find((language) => language.code === requestedLocale);
    if (requestedLanguage && requestedLanguage.code !== currentLanguage.code) {
      setCurrentLanguage(requestedLanguage);
    }
  }, [currentLanguage.code, location.search, setCurrentLanguage]);

  useEffect(() => {
    document.title = `${copy.plans} | Indice`;
  }, [copy.plans]);

  const loadConfig = useCallback(() => {
    setLoading(true);
    setError('');
    billingSignupApi.config()
      .then((value) => {
        const productCodes = value.products.map((product) => product.code);
        const handoff = parsePublicPlanSearch(location.search, productCodes, value.launchCountries);
        const requestedCountry = new URLSearchParams(location.search).get('country')?.toUpperCase();
        setConfig(value);
        setSelectedCodes(handoff?.selectedProductCodes ?? []);
        setInterval(handoff?.billingInterval ?? 'MONTH');
        setTotalPeople(value.includedSeats + (handoff?.extraSeats ?? 0));
        setCountryCode(handoff?.countryCode ?? (requestedCountry && value.launchCountries.includes(requestedCountry) ? requestedCountry : value.launchCountries[0] ?? 'MX'));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'LOAD_FAILED'))
      .finally(() => setLoading(false));
  }, [location.search]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const pricing = useMemo(
    () => config ? calculatePublicPlanPricing(config, selectedCodes, Math.max(0, totalPeople - config.includedSeats), interval) : null,
    [config, interval, selectedCodes, totalPeople],
  );

  const continueToSignup = () => {
    if (!config || !pricing?.validSelection || pricing.estimatedAmountCents == null) return;
    navigate(`/signup?${buildPublicPlanSearch({
      selectedProductCodes: selectedCodes,
      billingInterval: interval,
      extraSeats: Math.max(0, totalPeople - config.includedSeats),
      countryCode,
      locale: currentLanguage.code,
    })}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicPlansHeader copy={copy} />
      {loading && (
        <main className="flex min-h-[72vh] items-center justify-center bg-slate-50 px-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 font-medium text-slate-600 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--indice-brand-primary)]" />
            {copy.loading}
          </div>
        </main>
      )}
      {!loading && error && (
        <main className="flex min-h-[72vh] items-center justify-center bg-slate-50 px-6">
          <section className="max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg">
            <h1 className="text-2xl font-semibold text-slate-900">{copy.loadError}</h1>
            <p className="mt-3 break-words text-sm font-medium text-slate-600">{error}</p>
            <button type="button" onClick={loadConfig} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--indice-brand-primary)] px-6 font-medium text-white hover:bg-[var(--indice-brand-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--indice-brand-border)]">
              <RefreshCcw className="h-4 w-4" />
              {copy.retry}
            </button>
          </section>
        </main>
      )}
      {!loading && config && (
        <main>
          <PublicPlansHero config={config} copy={copy} interval={interval} pricing={pricing} />
          <PublicPlansBuilder
            config={config}
            copy={copy}
            selectedCodes={selectedCodes}
            interval={interval}
            totalPeople={totalPeople}
            countryCode={countryCode}
            onToggleProduct={(code) => setSelectedCodes((current) => toggleCompatibleProductCode(config, current, code))}
            onSelectAll={() => setSelectedCodes(
              pricingModeForConfig(config) === 'DIRECT_PRODUCTS'
                ? selectAllCompatibleProductCodes(config)
                : config.products.filter((product) => product.productType === 'BASIC').map((product) => product.code),
            )}
            onClear={() => setSelectedCodes([])}
            onIntervalChange={setInterval}
            onTotalPeopleChange={(value) => setTotalPeople(Math.min(config.includedSeats + 500, Math.max(config.includedSeats, value)))}
            onCountryChange={setCountryCode}
            onContinue={continueToSignup}
          />
        </main>
      )}
    </div>
  );
}
