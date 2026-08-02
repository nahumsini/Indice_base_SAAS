import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CircleDollarSign, Globe2 } from 'lucide-react';
import { Input } from '../../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../components/ui/select';
import type { SalesQuoteItem } from '../../../types';
import { salesCurrencyOptions } from '../../../utils/salesCurrency';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState } from '../../types/quoteBuilderTypes';
import {
  getDefaultTaxPresetForJurisdiction,
  getTaxPresetsForJurisdiction,
  quoteTaxJurisdictions,
  type QuoteTaxJurisdiction,
} from '../../utils/quoteTaxCatalog';

const fieldClassName = 'h-10 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 shadow-none focus:ring-[#FF6B5E]/20';
const automaticCurrencyByJurisdiction: Record<Exclude<QuoteTaxJurisdiction, 'custom'>, string> = {
  mx: 'MXN',
  ca: 'CAD',
  us: 'USD',
  co: 'COP',
  br: 'BRL',
  eu: 'EUR',
};

function getAutomaticCurrencyForJurisdiction(jurisdiction: QuoteTaxJurisdiction) {
  return jurisdiction === 'custom' ? null : automaticCurrencyByJurisdiction[jurisdiction];
}

export function QuoteTaxJurisdictionPanel({
  form,
  items,
  t,
  onFormChange,
  onCurrencyChange,
  onUpdateItem,
}: {
  form: QuoteFormState;
  items: SalesQuoteItem[];
  t: QuotesTranslations;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onCurrencyChange: (value: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
}) {
  const presets = getTaxPresetsForJurisdiction(form.taxJurisdiction);
  const automaticCurrency = getAutomaticCurrencyForJurisdiction(form.taxJurisdiction);
  const currencySelectOptions = salesCurrencyOptions
    .map((option) => ({ value: option.code, label: option.code }));
  const normalizedCurrencyOptions = currencySelectOptions.some((option) => option.value === form.currency)
    ? currencySelectOptions
    : [{ value: form.currency, label: form.currency }, ...currencySelectOptions];
  const selectedJurisdictionLabel = form.taxJurisdiction === 'custom' && form.customJurisdictionName.trim()
    ? form.customJurisdictionName.trim()
    : t.taxJurisdictions[form.taxJurisdiction];

  useEffect(() => {
    if (automaticCurrency && form.currency !== automaticCurrency) {
      onCurrencyChange(automaticCurrency);
    }
  }, [automaticCurrency, form.currency, onCurrencyChange]);

  const applyDefaultTaxToLines = (jurisdiction: QuoteTaxJurisdiction) => {
    const defaultPreset = getDefaultTaxPresetForJurisdiction(jurisdiction);

    items.forEach((item) => {
      onUpdateItem(item.id, {
        taxCode: defaultPreset.id,
        taxLabel: defaultPreset.label,
        taxJurisdiction: jurisdiction,
        taxPercent: defaultPreset.defaultRate,
        taxIsCustom: defaultPreset.id === 'custom-tax',
      });
    });
  };

  const handleJurisdictionChange = (value: QuoteTaxJurisdiction) => {
    const nextCurrency = getAutomaticCurrencyForJurisdiction(value);

    onFormChange((current) => ({ ...current, taxJurisdiction: value }));
    if (nextCurrency && nextCurrency !== form.currency) {
      onCurrencyChange(nextCurrency);
    }
    applyDefaultTaxToLines(value);
  };

  const updateCustomTaxLines = (patch: Partial<SalesQuoteItem>) => {
    items
      .filter((item) => item.taxCode === 'custom-tax' || item.taxIsCustom)
      .forEach((item) => onUpdateItem(item.id, patch));
  };

  return (
    <section className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div className="max-w-2xl">
          <h3 className="flex items-center gap-2 text-base font-medium text-slate-950">
            <Globe2 className="h-5 w-5 text-[#FF6B5E]" />
            {t.taxBuilder.title}
          </h3>
          <p className="mt-1 text-sm font-normal leading-6 text-slate-600">{t.taxBuilder.description}</p>
          <p className="mt-2 rounded-lg border border-[#FF6B5E]/20 bg-white px-3 py-2 text-xs font-medium leading-5 text-[#B63B32]">
            {t.taxBuilder.singleJurisdictionNote(selectedJurisdictionLabel)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:min-w-[440px]">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-600">
              {t.taxBuilder.jurisdiction}
            </label>
            <Select value={form.taxJurisdiction} onValueChange={(value) => handleJurisdictionChange(value as QuoteTaxJurisdiction)}>
              <SelectTrigger className={fieldClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quoteTaxJurisdictions.map((jurisdiction) => (
                  <SelectItem key={jurisdiction} value={jurisdiction}>
                    {t.taxJurisdictions[jurisdiction]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-600">
              {t.labels.currency}
            </label>
            {form.taxJurisdiction === 'custom' ? (
              <Select value={form.currency} onValueChange={onCurrencyChange}>
                <SelectTrigger className={fieldClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {normalizedCurrencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-10 items-center justify-between rounded-lg border border-[#FF6B5E]/20 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm">
                <span>{automaticCurrency ?? form.currency}</span>
                <CircleDollarSign className="h-4 w-4 text-[#FF6B5E]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {form.taxJurisdiction === 'custom' ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">{t.taxBuilder.customJurisdictionName}</label>
            <Input
              className={fieldClassName}
              value={form.customJurisdictionName}
              onChange={(event) => onFormChange((current) => ({ ...current, customJurisdictionName: event.target.value }))}
              placeholder={t.taxBuilder.customJurisdictionPlaceholder}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">{t.taxBuilder.customTaxLabel}</label>
            <Input
              className={fieldClassName}
              value={form.customTaxLabel}
              onChange={(event) => {
                onFormChange((current) => ({ ...current, customTaxLabel: event.target.value }));
                updateCustomTaxLines({ taxLabel: event.target.value || t.taxBuilder.customTaxFallback });
              }}
              placeholder={t.taxBuilder.customTaxPlaceholder}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">{t.taxBuilder.customTaxRate}</label>
            <Input
              className={fieldClassName}
              type="number"
              min={0}
              value={form.customTaxRate}
              onChange={(event) => {
                onFormChange((current) => ({ ...current, customTaxRate: event.target.value }));
                updateCustomTaxLines({ taxPercent: Number(event.target.value) || 0 });
              }}
              placeholder="0"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {presets.map((preset) => (
          <div key={preset.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-slate-950">{preset.label}</p>
              <span className="shrink-0 rounded-full bg-[#FF6B5E]/10 px-2.5 py-1 text-xs font-medium text-[#B63B32]">
                {preset.rateEditable ? t.taxBuilder.variableRate : `${preset.defaultRate}%`}
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">{t.taxCategories[preset.category]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
