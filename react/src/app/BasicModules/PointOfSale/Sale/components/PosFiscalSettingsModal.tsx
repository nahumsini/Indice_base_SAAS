import { useEffect, useMemo, useState } from 'react';
import { Check, Globe2, Percent } from 'lucide-react';
import { PosModalFrame } from './PosModalFrame';
import {
  findQuoteTaxPreset,
  getAutomaticCurrencyForTaxJurisdiction,
  getDefaultTaxPresetForJurisdiction,
  getTaxPresetsForJurisdiction,
  quoteTaxJurisdictions,
  type QuoteTaxJurisdiction,
} from '../../../CommerceCore/taxCatalog';
import { businessCurrencyOptions, normalizeBusinessCurrencyCode } from '../../../shared/businessCurrency';
import type { SaleTotals } from '../utils/saleCalculations';
import {
  normalizePosFiscalSettings,
  posTaxJurisdictionLabels,
  type PosFiscalSettings,
} from '../utils/posFiscalSettings';

interface PosFiscalSettingsModalProps {
  isOpen: boolean;
  settings: PosFiscalSettings;
  lockedCurrencyCode?: string;
  totals: SaleTotals;
  cartItemCount: number;
  onClose: () => void;
  onConfirm: (settings: PosFiscalSettings) => void;
  formatCurrency: (amount: number) => string;
}

const fieldClassName = 'min-h-14 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-black text-gray-950 outline-none transition focus:border-[#FF6B5E] focus:ring-4 focus:ring-[#FF6B5E]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white';

export function PosFiscalSettingsModal({
  isOpen,
  settings,
  lockedCurrencyCode,
  totals,
  cartItemCount,
  onClose,
  onConfirm,
  formatCurrency,
}: PosFiscalSettingsModalProps) {
  const [draft, setDraft] = useState<PosFiscalSettings>(settings);
  const lockedCurrency = useMemo(
    () => (lockedCurrencyCode ? normalizeBusinessCurrencyCode(lockedCurrencyCode, settings.currencyCode) : ''),
    [lockedCurrencyCode, settings.currencyCode],
  );

  useEffect(() => {
    if (isOpen) {
      setDraft({
        ...settings,
        currencyCode: lockedCurrency || settings.currencyCode,
      });
    }
  }, [isOpen, lockedCurrency, settings]);

  const presets = useMemo(() => getTaxPresetsForJurisdiction(draft.taxJurisdiction), [draft.taxJurisdiction]);
  const selectedPreset = findQuoteTaxPreset(draft.taxPresetId) ?? getDefaultTaxPresetForJurisdiction(draft.taxJurisdiction);
  const automaticCurrency = getAutomaticCurrencyForTaxJurisdiction(draft.taxJurisdiction);
  const visibleCurrency = lockedCurrency || draft.currencyCode;
  const showCurrencyLockNote = Boolean(
    lockedCurrency && automaticCurrency && automaticCurrency !== lockedCurrency,
  );
  const estimatedTax = totals.subtotal * (draft.taxRate / 100);
  const estimatedTotal = totals.subtotal + estimatedTax;

  const handleJurisdictionChange = (jurisdiction: QuoteTaxJurisdiction) => {
    const preset = getDefaultTaxPresetForJurisdiction(jurisdiction);
    const currencyCode = normalizeBusinessCurrencyCode(
      lockedCurrency || getAutomaticCurrencyForTaxJurisdiction(jurisdiction) || draft.currencyCode,
    );

    setDraft(normalizePosFiscalSettings({
      taxJurisdiction: jurisdiction,
      taxPresetId: preset.id,
      taxLabel: preset.label,
      taxRate: preset.defaultRate,
      currencyCode,
      isCustomRate: preset.rateEditable,
    }, currencyCode));
  };

  const handlePresetChange = (taxPresetId: string) => {
    const preset = findQuoteTaxPreset(taxPresetId) ?? getDefaultTaxPresetForJurisdiction(draft.taxJurisdiction);
    setDraft((current) => normalizePosFiscalSettings({
      ...current,
      taxPresetId: preset.id,
      taxLabel: preset.label,
      taxRate: preset.defaultRate,
      isCustomRate: preset.rateEditable,
    }, current.currencyCode));
  };

  const handleCurrencyChange = (currencyCode: string) => {
    if (lockedCurrency) {
      return;
    }

    setDraft((current) => ({
      ...current,
      currencyCode: normalizeBusinessCurrencyCode(currencyCode, current.currencyCode),
    }));
  };

  const handleRateChange = (value: string) => {
    const taxRate = Math.max(Number(value) || 0, 0);
    setDraft((current) => ({
      ...current,
      taxRate,
      isCustomRate: true,
    }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar configuración fiscal"
      eyebrow="Configuración POS"
      icon={<Globe2 className="h-7 w-7" />}
      onClose={onClose}
      size="lg"
      subtitle="Configura el país fiscal, la divisa de venta y el impuesto antes de cobrar."
      title="Divisa e impuestos"
      zIndexClassName="z-[160]"
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-14 rounded-lg border border-gray-200 px-6 py-3 text-base font-black text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ ...draft, currencyCode: visibleCurrency })}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-[#FF6B5E] px-6 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#E85F54] active:scale-[0.98]"
          >
            <Check className="h-5 w-5" />
            Aplicar al ticket
          </button>
        </div>
      )}
    >
        <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5">
          <div className="space-y-4">
            <section className="rounded-lg border border-[#FF6B5E]/20 bg-white p-4 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FF6B5E]/10 text-[#FF6B5E]" aria-hidden="true">
                  <Globe2 className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-gray-950 dark:text-white">Configuracion fiscal</h3>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                    El impuesto elegido se aplica a las partidas del ticket activo.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">Pais fiscal</span>
                  <select
                    className={fieldClassName}
                    value={draft.taxJurisdiction}
                    onChange={(event) => handleJurisdictionChange(event.target.value as QuoteTaxJurisdiction)}
                  >
                    {quoteTaxJurisdictions.map((jurisdiction) => (
                      <option key={jurisdiction} value={jurisdiction}>
                        {posTaxJurisdictionLabels[jurisdiction]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">
                    {lockedCurrency ? 'Divisa del turno' : 'Divisa de venta'}
                  </span>
                  {lockedCurrency ? (
                    <div className="flex min-h-14 items-center justify-between rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 text-base font-black text-gray-950 dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10 dark:text-white">
                      <span>{lockedCurrency}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#7A5B00] shadow-sm dark:bg-gray-900 dark:text-[#F8E08A]">POS</span>
                    </div>
                  ) : draft.taxJurisdiction === 'custom' ? (
                    <select
                      className={fieldClassName}
                      value={draft.currencyCode}
                      onChange={(event) => handleCurrencyChange(event.target.value)}
                    >
                      {businessCurrencyOptions.map((option) => (
                        <option key={option.code} value={option.code}>{option.code}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex min-h-14 items-center justify-between rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 text-base font-black text-gray-950 dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10 dark:text-white">
                      <span>{automaticCurrency ?? draft.currencyCode}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#7A5B00] shadow-sm dark:bg-gray-900 dark:text-[#F8E08A]">POS</span>
                    </div>
                  )}
                </label>
              </div>

              {showCurrencyLockNote && (
                <div className="mt-4 rounded-lg border border-[#F4C84A]/40 bg-[#F4C84A]/15 px-4 py-3 text-sm font-bold leading-6 text-[#7A5B00] dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/10 dark:text-[#F8E08A]">
                  El pais fiscal sugiere {automaticCurrency}, pero este turno opera en {lockedCurrency}. Para cambiar divisa abre un turno con otra moneda.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#59C3A5]/15 text-2xl" aria-hidden="true">
                  %
                </span>
                <div>
                  <h3 className="text-lg font-black text-gray-950 dark:text-white">Impuesto de venta</h3>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-300">
                    Selecciona la tasa que se cargara al cerrar la venta.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {presets.map((preset) => {
                  const isSelected = preset.id === draft.taxPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetChange(preset.id)}
                      className={`min-h-28 rounded-lg border p-4 text-left shadow-sm transition active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 text-[#B63B32] dark:bg-[#FF6B5E]/15 dark:text-[#FFB5AE]'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/5 dark:border-gray-800 dark:bg-gray-950 dark:text-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-base font-black">{preset.label}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isSelected ? 'bg-white text-[#B63B32]' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {preset.rateEditable ? 'Variable' : `${preset.defaultRate}%`}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {preset.rateEditable ? 'Permite ajustar tasa para este ticket.' : 'Tasa fija del pais fiscal.'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedPreset.rateEditable && (
                <label className="mt-4 block max-w-xs space-y-2">
                  <span className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">Tasa aplicada</span>
                  <div className="relative">
                    <Percent className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={`${fieldClassName} pl-12`}
                      value={draft.taxRate}
                      onChange={(event) => handleRateChange(event.target.value)}
                    />
                  </div>
                </label>
              )}
            </section>
          </div>

          <aside className="mt-5 space-y-3 lg:mt-0">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <Globe2 className="h-5 w-5 text-[#FF6B5E]" />
                <div>
                  <p className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">Resumen fiscal</p>
                  <p className="text-lg font-black text-gray-950 dark:text-white">{visibleCurrency}</p>
                </div>
              </div>
              <div className="space-y-3">
                <SummaryRow label="Pais" value={posTaxJurisdictionLabels[draft.taxJurisdiction]} />
                <SummaryRow label="Impuesto" value={draft.taxLabel} />
                <SummaryRow label="Tasa" value={`${draft.taxRate}%`} />
                <SummaryRow label="Partidas" value={String(cartItemCount)} />
              </div>
            </div>

            <div className="rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/10 p-4 shadow-sm dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10">
              <p className="text-xs font-black uppercase tracking-normal text-[#146B58] dark:text-[#A7F3D0]">Vista del ticket</p>
              <div className="mt-3 space-y-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
                <SummaryRow label="Impuesto" value={formatCurrency(estimatedTax)} />
                <SummaryRow label="Total estimado" value={formatCurrency(estimatedTotal)} strong />
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
              Los productos stock siguen descontando inventario al cerrar. Servicios, digitales y lineas custom no afectan stock.
            </div>
          </aside>
        </div>

    </PosModalFrame>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-black uppercase tracking-normal text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`min-w-0 text-right ${strong ? 'text-lg font-black text-gray-950 dark:text-white' : 'text-sm font-black text-gray-800 dark:text-gray-100'}`}>
        {value}
      </span>
    </div>
  );
}
