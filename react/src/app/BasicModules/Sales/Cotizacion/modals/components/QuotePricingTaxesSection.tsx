import type { Dispatch, SetStateAction } from 'react';
import type { SalesCatalogItem, SalesQuoteItem } from '../../../types';
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
  onUpdateItem,
  onRemoveItem,
}: {
  form: QuoteFormState;
  items: SalesQuoteItem[];
  products: SalesCatalogItem[];
  totals: QuoteTotals;
  t: QuotesTranslations;
  formatCurrency: (value: number) => string;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
  onUpdateItem: (itemId: string, patch: Partial<SalesQuoteItem>) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
        {t.pricing.taxHelper}
      </div>

      <QuoteTaxJurisdictionPanel
        form={form}
        items={items}
        t={t}
        onFormChange={onFormChange}
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
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.subtotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.labels.discountTotal}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.discountTotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.labels.taxTotal}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.taxTotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.pricing.estimatedCost}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.estimatedCost)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">{t.pricing.estimatedProfit}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.estimatedProfit)}</p>
        </div>
        <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4">
          <p className="text-sm font-bold text-[#B63B32]">{t.labels.total}</p>
          <p className="mt-1 text-xl font-black text-[#B63B32]">{formatCurrency(totals.total)}</p>
        </div>
      </div>

      <QuoteMarginGuidance totals={totals} t={t} />
    </section>
  );
}
