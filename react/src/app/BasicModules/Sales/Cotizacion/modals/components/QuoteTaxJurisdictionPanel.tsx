import type { Dispatch, SetStateAction } from 'react';
import { Globe2 } from 'lucide-react';
import { Input } from '../../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../components/ui/select';
import type { SalesQuoteItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState } from '../../types/quoteBuilderTypes';
import {
  getDefaultTaxPresetForJurisdiction,
  getTaxPresetsForJurisdiction,
  quoteTaxJurisdictions,
  type QuoteTaxJurisdiction,
} from '../../utils/quoteTaxCatalog';

const fieldClassName = 'h-10 rounded-lg border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-none focus:ring-[#FF6B5E]/20';

export function QuoteTaxJurisdictionPanel({
  form,
  items,
  t,
  onFormChange,
  onUpdateItem,
}: {
  form: QuoteFormState;
  items: SalesQuoteItem[];
  t: QuotesTranslations;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
}) {
  const presets = getTaxPresetsForJurisdiction(form.taxJurisdiction);
  const selectedJurisdictionLabel = form.taxJurisdiction === 'custom' && form.customJurisdictionName.trim()
    ? form.customJurisdictionName.trim()
    : t.taxJurisdictions[form.taxJurisdiction];

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
    onFormChange((current) => ({ ...current, taxJurisdiction: value }));
    applyDefaultTaxToLines(value);
  };

  const updateCustomTaxLines = (patch: Partial<SalesQuoteItem>) => {
    items
      .filter((item) => item.taxCode === 'custom-tax' || item.taxIsCustom)
      .forEach((item) => onUpdateItem(item.id, patch));
  };

  return (
    <section className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
            <Globe2 className="h-5 w-5 text-[#FF6B5E]" />
            {t.taxBuilder.title}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{t.taxBuilder.description}</p>
          <p className="mt-2 rounded-lg border border-[#FF6B5E]/20 bg-white px-3 py-2 text-xs font-bold leading-5 text-[#B63B32]">
            {t.taxBuilder.singleJurisdictionNote(selectedJurisdictionLabel)}
          </p>
        </div>

        <div className="grid min-w-[260px] gap-2">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
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
      </div>

      {form.taxJurisdiction === 'custom' ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">{t.taxBuilder.customJurisdictionName}</label>
            <Input
              className={fieldClassName}
              value={form.customJurisdictionName}
              onChange={(event) => onFormChange((current) => ({ ...current, customJurisdictionName: event.target.value }))}
              placeholder={t.taxBuilder.customJurisdictionPlaceholder}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">{t.taxBuilder.customTaxLabel}</label>
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
            <label className="text-xs font-bold text-slate-500">{t.taxBuilder.customTaxRate}</label>
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

      <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {presets.map((preset) => (
          <div key={preset.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{preset.label}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{t.taxCategories[preset.category]}</p>
              </div>
              <span className="rounded-full bg-[#FF6B5E]/10 px-2.5 py-1 text-xs font-black text-[#B63B32]">
                {preset.rateEditable ? t.taxBuilder.variableRate : `${preset.defaultRate}%`}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
              {t.taxPresetDescriptions[preset.descriptionKey as keyof typeof t.taxPresetDescriptions]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
