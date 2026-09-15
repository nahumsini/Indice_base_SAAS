import { useMemo, useState } from 'react';
import { BadgeDollarSign, Check, Coins, ExternalLink, LoaderCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
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
  type BusinessExchangeRateSettings,
  type BusinessExchangeRatesPerUsd,
} from './businessCurrency';
import { usePreferredBusinessCurrency } from './BusinessCurrencyContext';
import { useLanguage } from '../../shared/context';
import { getPreferredCurrencyCopy } from './preferredCurrencyCopy';

const toRateDraft = (settings: BusinessExchangeRateSettings) => Object.fromEntries(
  businessCurrencyOptions
    .filter((option) => option.code !== businessExchangeBaseCurrency)
    .map((option) => [option.code, String(getBusinessExchangeRatePerUsd(option.code, settings.ratesPerUsd))]),
);

export function PreferredCurrencyControl() {
  const { currentLanguage } = useLanguage();
  const copy = useMemo(() => getPreferredCurrencyCopy(currentLanguage.code), [currentLanguage.code]);
  const {
    exchangeRateMetadata,
    exchangeRateSettings,
    exchangeRatesPerUsd,
    isLoadingDailyExchangeRates,
    preferredCurrency,
    refreshDailyExchangeRateSettings,
    setExchangeRateSettings,
    setPreferredCurrency,
  } = usePreferredBusinessCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftPreferredCurrency, setDraftPreferredCurrency] = useState<BusinessCurrencyCode>(
    preferredCurrency as BusinessCurrencyCode,
  );
  const [draftSettings, setDraftSettings] = useState(exchangeRateSettings);
  const [draftExchangeRates, setDraftExchangeRates] = useState<Record<string, string>>(
    () => toRateDraft(exchangeRateSettings),
  );
  const [ratesEdited, setRatesEdited] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState('');
  const editableCurrencyOptions = useMemo(
    () => businessCurrencyOptions.filter((option) => option.code !== businessExchangeBaseCurrency),
    [],
  );
  const sourceDetails = draftSettings.metadata.sourceDetails ?? [];
  const sourceWarnings = draftSettings.metadata.warnings ?? [];
  const exchangeRateModeLabel = draftSettings.metadata.mode === 'manual' ? copy.manualRate : copy.dailyRate;
  const exchangeRateSourceLabel = draftSettings.metadata.mode === 'manual'
    ? copy.manual
    : draftSettings.metadata.source === businessExchangeOfficialDailySource
      ? copy.officialSources
      : copy.internalReference;
  const preferredExchangeRate = getBusinessExchangeRatePerUsd(preferredCurrency, exchangeRatesPerUsd);
  const formattedPreferredExchangeRate = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: preferredCurrency === 'COP' ? 2 : 4,
  }).format(preferredExchangeRate);
  const preferredSource = exchangeRateMetadata.sourceDetails?.find(
    (source) => source.currencyCode === preferredCurrency,
  );
  const isPreferredRateOfficial = preferredCurrency === businessExchangeBaseCurrency
    || preferredSource?.status === 'official';

  const openModal = () => {
    setDraftPreferredCurrency(preferredCurrency as BusinessCurrencyCode);
    setDraftSettings(exchangeRateSettings);
    setDraftExchangeRates(toRateDraft(exchangeRateSettings));
    setRatesEdited(false);
    setExchangeRateError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isLoadingDailyExchangeRates) setIsModalOpen(false);
  };

  const handleApplyConfiguration = () => {
    const nextExchangeRates: BusinessExchangeRatesPerUsd = {
      ...draftSettings.ratesPerUsd,
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

    setPreferredCurrency(draftPreferredCurrency);
    setExchangeRateSettings(ratesEdited
      ? createBusinessManualExchangeRateSettings(nextExchangeRates)
      : draftSettings);
    setExchangeRateError('');
    setIsModalOpen(false);
  };

  const handleRefreshDailyExchangeRates = async () => {
    setExchangeRateError('');
    try {
      const refreshedSettings = await refreshDailyExchangeRateSettings();
      setDraftSettings(refreshedSettings);
      setDraftExchangeRates(toRateDraft(refreshedSettings));
      setRatesEdited(false);
    } catch {
      setExchangeRateError(copy.refreshError);
    }
  };

  const handleResetDraftExchangeRates = () => {
    setDraftExchangeRates(toRateDraft(draftSettings));
    setRatesEdited(false);
    setExchangeRateError('');
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        aria-label={`${copy.currency} ${preferredCurrency}, ${copy.equals} ${formattedPreferredExchangeRate} ${preferredCurrency}`}
        onClick={openModal}
        className="h-10 min-w-10 gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-xs font-medium text-[var(--indice-brand-shell-foreground)] shadow-none transition-all hover:border-white/35 hover:bg-white/20 hover:text-[var(--indice-brand-shell-foreground)] dark:border-white/20 dark:bg-white/10 dark:text-[var(--indice-brand-shell-foreground)] dark:hover:border-white/35 dark:hover:bg-white/20 sm:px-3"
      >
        <Coins className="h-[18px] w-[18px] shrink-0" />
        <span className="hidden sm:inline">{preferredCurrency}</span>
        <span className="hidden text-white/45 sm:inline" aria-hidden="true">·</span>
        <span className="hidden max-w-[72px] truncate md:inline">{formattedPreferredExchangeRate}</span>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${isPreferredRateOfficial ? 'bg-emerald-400' : 'bg-amber-400'}`}
          title={isPreferredRateOfficial ? copy.officialRate : copy.lastRate}
        />
      </Button>

      <IndiceModalFrame
        open={isModalOpen}
        busy={isLoadingDailyExchangeRates}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        modalType="standard-form"
        contentClassName="sm:max-w-3xl"
        tone="blue"
        icon={<BadgeDollarSign className="h-5 w-5" />}
        eyebrow={copy.currencySettings}
        title={copy.exchangeRate}
        description={copy.operationalReference}
        footerSummary={`${copy.preferredCurrency}: ${draftPreferredCurrency} · ${copy.source}: ${ratesEdited ? copy.manual : exchangeRateSourceLabel}`}
        footer={(
          <>
            <Button type="button" variant="outline" disabled={isLoadingDailyExchangeRates} onClick={closeModal}>
              {copy.cancel}
            </Button>
            <Button type="button" disabled={isLoadingDailyExchangeRates} onClick={handleApplyConfiguration}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {copy.save}
            </Button>
          </>
        )}
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <section className="rounded-2xl border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.preferredCurrency}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.appliesTo}</p>
            <Select
              value={draftPreferredCurrency}
              onValueChange={(value) => setDraftPreferredCurrency(value as BusinessCurrencyCode)}
            >
              <SelectTrigger
                aria-label={copy.preferredCurrency}
                className="mt-4 h-11 w-full rounded-xl border-[var(--indice-brand-border)] bg-white px-3 text-sm font-medium text-slate-950 shadow-sm focus:ring-[var(--indice-brand-action)] dark:border-blue-800 dark:bg-slate-900 dark:text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[220] border-[var(--indice-brand-border)] bg-white dark:border-blue-800 dark:bg-slate-900">
                {businessCurrencyOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>{option.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.currentReference}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {copy.base}: {businessExchangeBaseCurrency} · {copy.date}: {draftSettings.metadata.sourceDate}
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[var(--indice-brand-text)] dark:bg-blue-950/50 dark:text-blue-200">
                {ratesEdited ? copy.manualRate : exchangeRateModeLabel}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {draftSettings.metadata.sourceSummary ?? `${copy.source}: ${exchangeRateSourceLabel}`}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={isLoadingDailyExchangeRates}
              onClick={() => void handleRefreshDailyExchangeRates()}
              className="mt-4 h-10 w-full justify-center rounded-xl border-[var(--indice-brand-border)] text-sm font-medium text-[var(--indice-brand-text)] shadow-none hover:bg-[var(--indice-brand-soft)] dark:border-blue-800 dark:text-blue-200"
            >
              {isLoadingDailyExchangeRates
                ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              {isLoadingDailyExchangeRates ? copy.loading : copy.loadDaily}
            </Button>
          </section>
        </div>

        {sourceWarnings.length > 0 ? (
          <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100" role="status">
            {sourceWarnings.slice(0, 3).map((warning) => <p key={warning}>{warning}</p>)}
          </section>
        ) : null}

        {sourceDetails.length > 0 ? (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.appliedSources}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sourceDetails.map((source) => (
                <article key={`${source.currencyCode}-${source.institution}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{source.currencyCode} · {source.institution}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {source.dataset}{source.observedDate ? ` · ${source.observedDate}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${source.status === 'official' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'}`}>
                      {source.status === 'official' ? copy.officialRate : copy.lastRate}
                    </span>
                  </div>
                  {source.sourceUrl ? (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--indice-brand-action)] hover:underline"
                    >
                      {copy.source}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <details className="group mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indice-brand-action)] dark:text-white">
            <span>
              {copy.manualRate}
              <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{copy.manualExplanation}</span>
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 group-open:bg-[var(--indice-brand-soft)] group-open:text-[var(--indice-brand-text)] dark:bg-slate-800 dark:text-slate-300">
              {ratesEdited ? copy.pendingChanges : copy.optional}
            </span>
          </summary>
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="grid gap-3 sm:grid-cols-2">
              {editableCurrencyOptions.map((option) => (
                <label key={option.code} className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{copy.oneUsdIn} {option.code}</span>
                  <Input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={draftExchangeRates[option.code] ?? ''}
                    onChange={(event) => {
                      setDraftExchangeRates((current) => ({ ...current, [option.code]: event.target.value }));
                      setRatesEdited(true);
                      setExchangeRateError('');
                    }}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetDraftExchangeRates}
              className="mt-3 h-9 rounded-xl border-slate-200 px-3 text-sm font-medium text-slate-700 shadow-none dark:border-slate-700 dark:text-slate-200"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {copy.reset}
            </Button>
          </div>
        </details>

        {exchangeRateError ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200" role="alert">
            {exchangeRateError}
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.disclaimer}</p>
      </IndiceModalFrame>
    </>
  );
}
