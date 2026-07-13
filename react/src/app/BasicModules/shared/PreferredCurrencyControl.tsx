import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Coins } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  businessCurrencyOptions,
  businessExchangeBaseCurrency,
  businessExchangeOfficialDailySource,
  createBusinessManualExchangeRateSettings,
  getBusinessExchangeRatePerUsd,
  type BusinessCurrencyCode,
  type BusinessExchangeRatesPerUsd,
} from './businessCurrency';
import { usePreferredBusinessCurrency } from './BusinessCurrencyContext';
import { useLanguage } from '../../shared/context';
import { getPreferredCurrencyCopy } from './preferredCurrencyCopy';

export function PreferredCurrencyControl() {
  const { currentLanguage } = useLanguage();
  const copy = useMemo(() => getPreferredCurrencyCopy(currentLanguage.code), [currentLanguage.code]);
  const {
    exchangeRateMetadata,
    exchangeRatesPerUsd,
    isLoadingDailyExchangeRates,
    loadDailyExchangeRateSettings,
    preferredCurrency,
    setExchangeRateSettings,
    setPreferredCurrency,
  } = usePreferredBusinessCurrency();
  const [isExchangeRatePanelOpen, setIsExchangeRatePanelOpen] = useState(false);
  const [draftExchangeRates, setDraftExchangeRates] = useState<Record<string, string>>({});
  const [exchangeRateError, setExchangeRateError] = useState('');
  const editableCurrencyOptions = useMemo(
    () => businessCurrencyOptions.filter((option) => option.code !== businessExchangeBaseCurrency),
    [],
  );
  const exchangeRateModeLabel = exchangeRateMetadata.mode === 'manual'
    ? copy.manualRate
    : copy.dailyRate;
  const exchangeRateSourceLabel = exchangeRateMetadata.mode === 'manual'
    ? copy.manual
    : exchangeRateMetadata.source === businessExchangeOfficialDailySource
      ? copy.officialSources
      : copy.internalReference;
  const sourceDetails = exchangeRateMetadata.sourceDetails ?? [];
  const sourceWarnings = exchangeRateMetadata.warnings ?? [];
  const preferredExchangeRate = getBusinessExchangeRatePerUsd(preferredCurrency, exchangeRatesPerUsd);
  const formattedPreferredExchangeRate = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: preferredCurrency === 'COP' ? 2 : 4,
  }).format(preferredExchangeRate);
  const preferredSource = sourceDetails.find((source) => source.currencyCode === preferredCurrency);
  const isPreferredRateOfficial = preferredCurrency === businessExchangeBaseCurrency
    || preferredSource?.status === 'official';

  useEffect(() => {
    setDraftExchangeRates(
      Object.fromEntries(
        editableCurrencyOptions.map((option) => [
          option.code,
          String(getBusinessExchangeRatePerUsd(option.code, exchangeRatesPerUsd)),
        ]),
      ),
    );
    setExchangeRateError('');
  }, [editableCurrencyOptions, exchangeRatesPerUsd]);

  const handleApplyExchangeRates = () => {
    const nextExchangeRates: BusinessExchangeRatesPerUsd = {
      ...exchangeRatesPerUsd,
      USD: 1,
    };

    for (const option of editableCurrencyOptions) {
      const parsedRate = Number(draftExchangeRates[option.code]);
      if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
        setExchangeRateError(copy.positiveRatesError);
        return;
      }
      nextExchangeRates[option.code as BusinessCurrencyCode] = parsedRate;
    }

    setExchangeRateSettings(createBusinessManualExchangeRateSettings(nextExchangeRates));
    setExchangeRateError('');
    setIsExchangeRatePanelOpen(false);
  };

  const handleLoadDailyExchangeRates = async () => {
    const dailyExchangeRateSettings = await loadDailyExchangeRateSettings();
    setDraftExchangeRates(
      Object.fromEntries(
        editableCurrencyOptions.map((option) => [
          option.code,
          String(getBusinessExchangeRatePerUsd(option.code, dailyExchangeRateSettings.ratesPerUsd)),
        ]),
      ),
    );
    setExchangeRateError('');
    setIsExchangeRatePanelOpen(false);
  };

  const handleResetDraftExchangeRates = () => {
    setDraftExchangeRates(
      Object.fromEntries(
        editableCurrencyOptions.map((option) => [
          option.code,
          String(getBusinessExchangeRatePerUsd(option.code, exchangeRatesPerUsd)),
        ]),
      ),
    );
    setExchangeRateError('');
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-expanded={isExchangeRatePanelOpen}
        aria-label={`${copy.currency} ${preferredCurrency}, ${copy.equals} ${formattedPreferredExchangeRate} ${preferredCurrency}`}
        onClick={() => setIsExchangeRatePanelOpen((current) => !current)}
        className="h-10 min-w-10 gap-1.5 rounded-full border-transparent bg-white/65 px-2.5 text-xs font-semibold text-[#257B68] shadow-none transition-all hover:border-[#59C3A5]/35 hover:bg-white hover:text-[#1E6557] dark:bg-white/5 dark:text-[#8FE0CA] dark:hover:border-[#59C3A5]/40 dark:hover:bg-white/10 sm:px-3"
      >
        <Coins className="h-[18px] w-[18px] shrink-0" />
        <span className="hidden sm:inline">{preferredCurrency}</span>
        <span className="hidden text-[#59C3A5]/70 sm:inline" aria-hidden="true">·</span>
        <span className="hidden max-w-[72px] truncate md:inline">{formattedPreferredExchangeRate}</span>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${isPreferredRateOfficial ? 'bg-[#3AAE90]' : 'bg-amber-500'}`}
          title={isPreferredRateOfficial ? copy.officialRate : copy.lastRate}
        />
      </Button>
      {isExchangeRatePanelOpen ? (
        <div className="absolute right-0 top-12 z-[180] w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#59C3A5]/35 bg-white text-left shadow-[0_24px_60px_rgba(34,40,49,0.18)] dark:border-[#59C3A5]/30 dark:bg-[#222831]">
          <div className="mb-4 flex items-center gap-3 border-b border-[#3AAE90] bg-[#59C3A5] px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <BadgeDollarSign className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">{copy.exchangeRate}</p>
              <p className="text-xs font-medium text-white/80">{copy.operationalReference}</p>
            </div>
          </div>
          <div className="px-4 pb-4">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#59C3A5]/20 bg-[#E7F3F2]/65 p-2.5 dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{copy.preferredCurrency}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">{copy.appliesTo}</p>
            </div>
            <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
              <SelectTrigger
                aria-label={copy.preferredCurrency}
                className="h-9 w-[92px] rounded-xl border-[#59C3A5]/30 bg-white px-2 font-bold text-[#222831] shadow-none focus:ring-[#59C3A5]/40 dark:bg-[#222831] dark:text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[220] border-[#59C3A5]/25 bg-white dark:border-[#59C3A5]/30 dark:bg-[#222831]">
                {businessCurrencyOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-3 rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/10 px-3 py-2 text-xs font-bold text-slate-600 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/15 dark:text-slate-200">
            <p>
              {copy.base}: {businessExchangeBaseCurrency} · {copy.source}: {exchangeRateSourceLabel} · {copy.date}: {exchangeRateMetadata.sourceDate} · {exchangeRateModeLabel}
            </p>
            <p className="mt-1 font-semibold text-slate-500 dark:text-slate-300">
              {copy.loadExplanation} {copy.manualExplanation}
            </p>
            {exchangeRateMetadata.sourceSummary ? (
              <p className="mt-1 font-semibold text-slate-500 dark:text-slate-300">
                {exchangeRateMetadata.sourceSummary}
              </p>
            ) : null}
          </div>
          {sourceDetails.length > 0 ? (
            <div className="mb-3 max-h-28 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="mb-1 font-black text-slate-700 dark:text-slate-100">{copy.appliedSources}</p>
              <div className="space-y-1.5">
                {sourceDetails.map((source) => (
                  <div key={`${source.currencyCode}-${source.institution}`} className="flex items-start justify-between gap-3">
                    <span className="font-bold text-slate-700 dark:text-slate-100">
                      {source.currencyCode}
                    </span>
                    <span className="flex-1">
                      {source.institution}
                      {source.status === 'fallback' ? ` · ${copy.internalFallback}` : ''}
                      {source.observedDate ? ` · ${source.observedDate}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {sourceWarnings.length > 0 ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
              {sourceWarnings.slice(0, 2).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
          <div className="space-y-3">
            {editableCurrencyOptions.map((option) => (
              <label key={option.code} className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {copy.oneUsdIn} {option.code}
                </span>
                <Input
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={draftExchangeRates[option.code] ?? ''}
                  onChange={(event) => {
                    setDraftExchangeRates((current) => ({
                      ...current,
                      [option.code]: event.target.value,
                    }));
                    setExchangeRateError('');
                  }}
                  className="h-9 rounded-lg border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            ))}
          </div>
          {exchangeRateError ? (
            <p className="mt-3 text-xs font-bold text-rose-600 dark:text-rose-300">{exchangeRateError}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isLoadingDailyExchangeRates}
              onClick={handleLoadDailyExchangeRates}
              className="h-9 rounded-lg border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none dark:border-slate-700 dark:text-slate-200"
            >
              {isLoadingDailyExchangeRates ? copy.loading : copy.loadDaily}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetDraftExchangeRates}
              className="h-9 rounded-lg border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none dark:border-slate-700 dark:text-slate-200"
            >
              {copy.reset}
            </Button>
            <Button
              type="button"
              onClick={handleApplyExchangeRates}
              className="h-9 rounded-lg bg-[#59C3A5] px-3 text-sm font-bold text-white shadow-none hover:bg-[#3AAE90]"
            >
              {copy.apply}
            </Button>
          </div>
          <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
            {copy.disclaimer}
          </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
