import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BadgeDollarSign,
  Columns3,
  Coins,
  Plus,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import {
  businessExchangeBaseCurrency,
  businessCurrencyOptions,
  createBusinessDailyExchangeRateSettings,
  createBusinessManualExchangeRateSettings,
  defaultBusinessExchangeRatesPerUsd,
  getBusinessExchangeRatePerUsd,
  type BusinessCurrencyCode,
  type BusinessExchangeRateMetadata,
  type BusinessExchangeRateSettings,
  type BusinessExchangeRatesPerUsd,
} from '../../../shared/businessCurrency';
import { hrAccentButtonClass } from '../constants/employees.constants';
import type { EmployeesTranslations } from '../translations';

interface EmployeesHeaderActionsProps {
  addEmployeeLabel: string;
  configureColumnsLabel: string;
  exchangeRateCopy: EmployeesTranslations['exchangeRates'];
  exchangeRateMetadata: BusinessExchangeRateMetadata;
  exchangeRatesPerUsd: BusinessExchangeRatesPerUsd;
  headingIcon: ReactNode;
  onConfigureColumns: () => void;
  onCreateEmployee: () => void;
  onExchangeRateSettingsChange: (exchangeRateSettings: BusinessExchangeRateSettings) => void;
  onPreferredCurrencyChange: (currencyCode: string) => void;
  preferredCurrency: string;
  preferredCurrencyLabel: string;
  subtitle: string;
  title: string;
}

export function EmployeesHeaderActions({
  addEmployeeLabel,
  configureColumnsLabel,
  exchangeRateCopy,
  exchangeRateMetadata,
  exchangeRatesPerUsd,
  headingIcon,
  onConfigureColumns,
  onCreateEmployee,
  onExchangeRateSettingsChange,
  onPreferredCurrencyChange,
  preferredCurrency,
  preferredCurrencyLabel,
  subtitle,
  title,
}: EmployeesHeaderActionsProps) {
  const [isExchangeRatePanelOpen, setIsExchangeRatePanelOpen] = useState(false);
  const [draftExchangeRates, setDraftExchangeRates] = useState<Record<string, string>>({});
  const [exchangeRateError, setExchangeRateError] = useState('');
  const editableCurrencyOptions = useMemo(
    () => businessCurrencyOptions.filter((option) => option.code !== businessExchangeBaseCurrency),
    [],
  );
  const exchangeRateModeLabel = exchangeRateMetadata.mode === 'manual'
    ? exchangeRateCopy.manualMode
    : exchangeRateCopy.dailyMode;
  const exchangeRateSourceLabel = exchangeRateMetadata.mode === 'manual'
    ? exchangeRateCopy.manualSource
    : exchangeRateCopy.dailySource;
  const exchangeRateSourceDate = exchangeRateMetadata.sourceDate;
  const preferredExchangeRate = getBusinessExchangeRatePerUsd(preferredCurrency, exchangeRatesPerUsd);
  const preferredExchangeRateLabel = preferredCurrency === businessExchangeBaseCurrency
    ? exchangeRateCopy.baseCurrency
    : exchangeRateCopy.preferredRate({
      currency: preferredCurrency,
      rate: String(preferredExchangeRate),
    });

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
        setExchangeRateError(exchangeRateCopy.invalid);
        return;
      }
      nextExchangeRates[option.code as BusinessCurrencyCode] = parsedRate;
    }

    onExchangeRateSettingsChange(createBusinessManualExchangeRateSettings(nextExchangeRates));
    setExchangeRateError('');
    setIsExchangeRatePanelOpen(false);
  };

  const handleResetExchangeRates = () => {
    const dailyExchangeRateSettings = createBusinessDailyExchangeRateSettings();
    onExchangeRateSettingsChange(dailyExchangeRateSettings);
    setDraftExchangeRates(
      Object.fromEntries(
        editableCurrencyOptions.map((option) => [
          option.code,
          String(defaultBusinessExchangeRatesPerUsd[option.code]),
        ]),
      ),
    );
    setExchangeRateError('');
    setIsExchangeRatePanelOpen(false);
  };

  return (
    <section className="mb-5 rounded-lg border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-6 shadow-sm dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {headingIcon}
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center gap-2 rounded-xl border border-[#59C3A5]/30 bg-white px-3 text-sm font-semibold text-slate-700 shadow-none dark:border-[#59C3A5]/40 dark:bg-slate-800 dark:text-slate-100">
            <Coins className="h-4 w-4 text-[#59C3A5]" />
            <span>{preferredCurrencyLabel}</span>
            <Select value={preferredCurrency} onValueChange={onPreferredCurrencyChange}>
              <SelectTrigger
                aria-label={preferredCurrencyLabel}
                className="h-8 w-[92px] rounded-lg border-slate-200 bg-slate-50 px-2 text-sm font-bold text-slate-900 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                aria-expanded={isExchangeRatePanelOpen}
                onClick={() => setIsExchangeRatePanelOpen((current) => !current)}
                className="h-8 gap-1.5 rounded-lg border-[#59C3A5]/30 bg-[#59C3A5]/10 px-2 text-xs font-black text-[#177d66] shadow-none hover:bg-[#59C3A5]/20 dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/20 dark:text-emerald-200"
              >
                <BadgeDollarSign className="h-3.5 w-3.5" />
                <span>{exchangeRateCopy.action}</span>
                <span className="max-w-[150px] truncate">{preferredExchangeRateLabel}</span>
                <span className="hidden max-w-[120px] truncate text-[#4f8d7c] dark:text-emerald-100 sm:inline">
                  {exchangeRateModeLabel}
                </span>
              </Button>
              {isExchangeRatePanelOpen ? (
                <div className="absolute right-0 top-10 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <BadgeDollarSign className="h-4 w-4 text-[#59C3A5]" />
                    <span>{exchangeRateCopy.title}</span>
                  </div>
                  <div className="mb-3 rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/10 px-3 py-2 text-xs font-bold text-slate-600 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/15 dark:text-slate-200">
                    <p>
                      {exchangeRateCopy.sourceDetails({
                        base: businessExchangeBaseCurrency,
                        date: exchangeRateSourceDate,
                        mode: exchangeRateModeLabel,
                        source: exchangeRateSourceLabel,
                      })}
                    </p>
                    <p className="mt-1 font-semibold text-slate-500 dark:text-slate-300">
                      {exchangeRateMetadata.mode === 'manual'
                        ? exchangeRateCopy.manualPersistenceNote
                        : exchangeRateCopy.dailyResetNote}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {editableCurrencyOptions.map((option) => (
                      <label key={option.code} className="grid gap-1.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {exchangeRateCopy.rateInputLabel(option.code)}
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
                      onClick={handleResetExchangeRates}
                      className="h-9 rounded-lg border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none dark:border-slate-700 dark:text-slate-200"
                    >
                      {exchangeRateCopy.reset}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApplyExchangeRates}
                      className={cn('h-9 rounded-lg px-3 text-sm font-bold', hrAccentButtonClass)}
                    >
                      {exchangeRateCopy.apply}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onConfigureColumns}
            className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 text-[#59C3A5] shadow-none hover:bg-[#59C3A5] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <Columns3 className="h-4 w-4" />
            {configureColumnsLabel}
          </Button>
          <Button
            onClick={onCreateEmployee}
            className={cn('h-11 gap-2 rounded-xl px-4', hrAccentButtonClass)}
          >
            <Plus className="h-4 w-4" />
            {addEmployeeLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
