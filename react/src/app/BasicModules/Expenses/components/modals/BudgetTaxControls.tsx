import { useEffect, useMemo } from 'react';
import {
  calculateBudgetTaxAmount,
  formatTaxRate,
  getBudgetTaxProfile,
  getBudgetTaxProfiles,
  getDefaultBudgetTaxProfile,
  inferTaxCountryFromCurrency,
  parsePercentInput,
  roundMoney,
  taxRateToPercentInput,
  type BudgetTaxCountry,
  type BudgetTaxMode,
} from '../../Budgets/budgetTaxCatalog';
import { useBudgetsTranslations } from '../../Budgets/hooks/useBudgetsTranslations';

export type TaxControlDraft = {
  amount: string;
  budgetCurrencyCode: string;
  taxes: string;
  taxCountry: string;
  taxEnabled: boolean;
  taxIncluded: boolean;
  taxMode: BudgetTaxMode;
  taxProfileId: string;
  taxRate: string;
  taxSpecialAmount: string;
};

type BudgetTaxControlsProps<TDraft extends TaxControlDraft> = {
  draft: TDraft;
  onDraftChange: (updates: Partial<TDraft>) => void;
};

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function BudgetTaxControls<TDraft extends TaxControlDraft>({ draft, onDraftChange }: BudgetTaxControlsProps<TDraft>) {
  const t = useBudgetsTranslations();
  const applyDraftChange = (updates: Partial<TaxControlDraft>) => {
    onDraftChange(updates as Partial<TDraft>);
  };
  const enteredAmount = toMoneyNumber(draft.amount);
  const country = normalizeTaxCountry(inferTaxCountryFromCurrency(draft.budgetCurrencyCode));
  const profiles = useMemo(() => getBudgetTaxProfiles(country), [country]);
  const selectedProfile = getBudgetTaxProfile(draft.taxProfileId, country) ?? getDefaultBudgetTaxProfile(country) ?? profiles[0];
  const selectedProfileId = selectedProfile?.id ?? '';
  const rate = selectedProfile?.manualRate ? parsePercentInput(draft.taxRate) : selectedProfile?.rate ?? 0;
  const taxAmount = draft.taxEnabled ? roundMoney(calculateBudgetTaxAmount(enteredAmount, rate, draft.taxIncluded)) : 0;
  const availableTaxLabel = profiles.length > 1 ? t.tax.availablePlural(profiles.length) : t.tax.availableSingular;
  const selectedTaxLabel = selectedProfile
    ? `${selectedProfile.shortName} · ${formatTaxRate(rate)}`
    : t.tax.noTaxForCurrency(draft.budgetCurrencyCode);

  useEffect(() => {
    if (!draft.taxEnabled) {
      if (draft.taxes || draft.taxSpecialAmount || draft.taxMode !== 'none') {
        applyDraftChange({
          taxes: '',
          taxMode: 'none',
          taxSpecialAmount: '',
        });
      }
      return;
    }

    const isSelectedProfileAvailable = profiles.some(profile => profile.id === draft.taxProfileId);
    const fallbackProfile = getDefaultBudgetTaxProfile(country) ?? profiles[0];
    const activeProfile = isSelectedProfileAvailable ? selectedProfile : fallbackProfile;
    const nextTaxes = formatMoneyInput(taxAmount);
    const nextRate = activeProfile?.manualRate ? draft.taxRate : activeProfile ? taxRateToPercentInput(activeProfile.rate) : '';
    const updates: Partial<TaxControlDraft> = {};

    if (draft.taxCountry !== country) updates.taxCountry = country;
    if (!isSelectedProfileAvailable && activeProfile?.id) updates.taxProfileId = activeProfile.id;
    if (draft.taxMode !== 'auto') updates.taxMode = 'auto';
    if (!activeProfile?.manualRate && draft.taxRate !== nextRate) updates.taxRate = nextRate;
    if (draft.taxSpecialAmount) updates.taxSpecialAmount = '';
    if (draft.taxes !== nextTaxes) updates.taxes = nextTaxes;

    if (Object.keys(updates).length > 0) {
      applyDraftChange(updates);
    }
  }, [
    country,
    draft.taxCountry,
    draft.taxEnabled,
    draft.taxMode,
    draft.taxProfileId,
    draft.taxRate,
    draft.taxSpecialAmount,
    draft.taxes,
    profiles,
    selectedProfile,
    taxAmount,
    onDraftChange,
  ]);

  const toggleTax = (enabled: boolean) => {
    if (!enabled) {
      applyDraftChange({
        taxEnabled: false,
        taxIncluded: false,
        taxMode: 'none',
        taxes: '',
        taxSpecialAmount: '',
      });
      return;
    }

    const defaultProfile = getDefaultBudgetTaxProfile(country) ?? profiles[0];
    applyDraftChange({
      taxCountry: country,
      taxEnabled: true,
      taxMode: 'auto',
      taxProfileId: defaultProfile?.id ?? '',
      taxRate: defaultProfile?.manualRate ? '' : defaultProfile ? taxRateToPercentInput(defaultProfile.rate) : '',
      taxSpecialAmount: '',
    });
  };

  const updateProfile = (taxProfileId: string) => {
    const profile = getBudgetTaxProfile(taxProfileId, country);
    applyDraftChange({
      taxMode: 'auto',
      taxProfileId,
      taxRate: profile?.manualRate ? '' : profile ? taxRateToPercentInput(profile.rate) : '',
      taxSpecialAmount: '',
    });
  };

  return (
    <section className="md:col-span-2 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/55">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-white">{t.tax.consumptionTaxes}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {draft.taxEnabled ? `${draft.budgetCurrencyCode} · ${selectedTaxLabel}` : `${draft.budgetCurrencyCode} · ${availableTaxLabel}`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={draft.taxEnabled}
              onChange={(event) => toggleTax(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#147514] focus:ring-[#147514]"
            />
            {t.tax.applyTax}
          </label>
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={draft.taxIncluded}
              onChange={(event) => applyDraftChange({ taxIncluded: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-[#147514] focus:ring-[#147514]"
            />
            {t.tax.amountIncludesTax}
          </label>
        </div>
      </div>

      {draft.taxEnabled ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <BudgetTaxSelect
            label={t.tax.taxAvailable}
            value={selectedProfileId}
            onChange={updateProfile}
            options={profiles.map(profile => ({ value: profile.id, label: profile.label }))}
          />
          {selectedProfile?.manualRate ? (
            <label>
              <FieldLabel label={t.tax.rate} />
              <input
                value={draft.taxRate}
                onChange={(event) => applyDraftChange({ taxRate: event.target.value, taxMode: 'auto', taxSpecialAmount: '' })}
                placeholder="Ej. 8.875"
                className={fieldClass}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function BudgetTaxSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label>
      <FieldLabel label={label} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>;
}

function normalizeTaxCountry(value: string): BudgetTaxCountry {
  return ['MX', 'US', 'CA', 'CO', 'BR', 'INTL'].includes(value) ? value as BudgetTaxCountry : 'INTL';
}

function toMoneyNumber(value: string) {
  const parsedValue = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatMoneyInput(value: number) {
  return String(roundMoney(value).toFixed(2));
}
