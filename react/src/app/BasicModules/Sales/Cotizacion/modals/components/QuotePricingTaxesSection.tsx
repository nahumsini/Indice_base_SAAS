import type { Dispatch, SetStateAction } from 'react';
import { CircleDollarSign } from 'lucide-react';
import type { SalesCatalogItem, SalesQuoteItem } from '../../../types';
import { salesCurrencyOptions } from '../../../utils/salesCurrency';
import { FilterSelect } from '../../components/QuoteUi';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState, QuoteTotals } from '../../types/quoteBuilderTypes';
import { QuoteMarginGuidance } from './QuoteMarginGuidance';
import { QuoteLineItemsSection } from './QuoteLineItemsSection';
import { QuoteTaxJurisdictionPanel } from './QuoteTaxJurisdictionPanel';

export function QuotePricingTaxesSection({
  form,
  items,
  products,
  totals,
  t,
  formatCurrency,
  onFormChange,
  onCurrencyChange,
  onUpdateItem,
  onRemoveItem,
}: {
  form: QuoteFormState;
  items: SalesQuoteItem[];
  products: SalesCatalogItem[];
  totals: QuoteTotals;
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onCurrencyChange: (value: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
              <CircleDollarSign className="h-5 w-5 text-[#FF6B5E]" />
              {t.builderSections.pricing}
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{t.pricing.taxHelper}</p>
          </div>
          <div className="w-full lg:w-[220px]">
            <FilterSelect
              label={t.labels.currency}
              value={form.currency}
              onValueChange={onCurrencyChange}
              options={salesCurrencyOptions.map((option) => ({ value: option.code, label: option.code }))}
            />
          </div>
        </div>
      </div>

      <QuoteTaxJurisdictionPanel
        form={form}
        items={items}
        t={t}
        onFormChange={onFormChange}
        onCurrencyChange={onCurrencyChange}
        onUpdateItem={onUpdateItem}
      />

      <QuoteLineItemsSection
        items={items}
        products={products}
        form={form}
        t={t}
        formatCurrency={formatCurrency}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.labels.subtotal}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.subtotal, form.currency)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.labels.discountTotal}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.discountTotal, form.currency)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.labels.taxTotal}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.taxTotal, form.currency)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.pricing.estimatedCost}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.estimatedCost, form.currency)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.pricing.estimatedProfit}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.estimatedProfit, form.currency)}</p>
        </div>
        <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4">
          <p className="text-sm font-bold text-[#B63B32]">{t.labels.total}</p>
          <p className="mt-1 text-xl font-black text-[#B63B32]">{formatCurrency(totals.total, form.currency)}</p>
        </div>
      </div>

      <QuoteMarginGuidance totals={totals} t={t} />
    </section>
  );
}
