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

export function PreferredCurrencyControl() {
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
    ? 'Tasa manual'
    : 'Tasa diaria';
  const exchangeRateSourceLabel = exchangeRateMetadata.mode === 'manual'
    ? 'Manual'
    : exchangeRateMetadata.source === businessExchangeOfficialDailySource
      ? 'Fuentes oficiales'
      : 'Referencia interna';
  const sourceDetails = exchangeRateMetadata.sourceDetails ?? [];
  const sourceWarnings = exchangeRateMetadata.warnings ?? [];

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
        setExchangeRateError('Captura tasas positivas para todas las divisas.');
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
    <div className="relative flex min-h-10 w-full max-w-full items-center gap-2 rounded-xl border border-[#59C3A5]/30 bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-[#59C3A5]/40 dark:bg-slate-800/90 dark:text-slate-100 lg:w-auto">
      <Coins className="h-4 w-4 text-[#59C3A5]" />
      <span className="hidden xl:inline">Divisa</span>
      <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
        <SelectTrigger
          aria-label="Divisa preferida"
          className="h-8 w-[86px] rounded-lg border-slate-200 bg-slate-50 px-2 text-sm font-bold text-slate-900 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {businessCurrencyOptions.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        aria-expanded={isExchangeRatePanelOpen}
        onClick={() => setIsExchangeRatePanelOpen((current) => !current)}
        className="h-8 min-w-0 max-w-[160px] gap-1.5 rounded-lg border-[#59C3A5]/30 bg-[#59C3A5]/10 px-2 text-xs font-black text-[#177d66] shadow-none hover:bg-[#59C3A5]/20 dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/20 dark:text-emerald-200 sm:max-w-[220px]"
      >
        <BadgeDollarSign className="h-3.5 w-3.5 shrink-0" />
        <span>TC</span>
        <span className="truncate">Base {businessExchangeBaseCurrency}</span>
        <span className="hidden max-w-[90px] truncate text-[#4f8d7c] dark:text-emerald-100 2xl:inline">
          {exchangeRateModeLabel}
        </span>
      </Button>
      {isExchangeRatePanelOpen ? (
        <div className="absolute right-0 top-12 z-[180] w-[min(380px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <BadgeDollarSign className="h-4 w-4 text-[#59C3A5]" />
            <span>Tipo de cambio</span>
          </div>
          <div className="mb-3 rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/10 px-3 py-2 text-xs font-bold text-slate-600 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/15 dark:text-slate-200">
            <p>
              Base: {businessExchangeBaseCurrency} · Fuente: {exchangeRateSourceLabel} · Fecha: {exchangeRateMetadata.sourceDate} · {exchangeRateModeLabel}
            </p>
            <p className="mt-1 font-semibold text-slate-500 dark:text-slate-300">
              Cargar tasa del día reemplaza la tasa manual con la referencia diaria disponible.
              {' '}Si editas una tasa manual, se conserva hasta que la cambies o restablezcas.
            </p>
            {exchangeRateMetadata.sourceSummary ? (
              <p className="mt-1 font-semibold text-slate-500 dark:text-slate-300">
                {exchangeRateMetadata.sourceSummary}
              </p>
            ) : null}
          </div>
          {sourceDetails.length > 0 ? (
            <div className="mb-3 max-h-28 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="mb-1 font-black text-slate-700 dark:text-slate-100">Fuentes aplicadas</p>
              <div className="space-y-1.5">
                {sourceDetails.map((source) => (
                  <div key={`${source.currencyCode}-${source.institution}`} className="flex items-start justify-between gap-3">
                    <span className="font-bold text-slate-700 dark:text-slate-100">
                      {source.currencyCode}
                    </span>
                    <span className="flex-1">
                      {source.institution}
                      {source.status === 'fallback' ? ' · respaldo interno' : ''}
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
                  1 USD en {option.code}
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
              {isLoadingDailyExchangeRates ? 'Cargando tasa...' : 'Cargar tasa del día'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetDraftExchangeRates}
              className="h-9 rounded-lg border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none dark:border-slate-700 dark:text-slate-200"
            >
              Restablecer manual
            </Button>
            <Button
              type="button"
              onClick={handleApplyExchangeRates}
              className="h-9 rounded-lg bg-[#59C3A5] px-3 text-sm font-bold text-white shadow-none hover:bg-[#3AAE90]"
            >
              Aplicar
            </Button>
          </div>
          <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
            Tasa informativa para estimaciones operativas. No representa una cotización para compraventa de divisas.
          </p>
        </div>
      ) : null}
    </div>
  );
}
