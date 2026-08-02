import { FileText, Globe2, ReceiptText, UserRound } from 'lucide-react';
import { Badge } from '../../../../../components/ui/badge';
import type { SalesCatalogItem, SalesContact, SalesOpportunity, SalesQuoteItem } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState, QuoteHealthState, QuoteTotals } from '../../types/quoteBuilderTypes';
import { calculateQuoteLinePricing, getRoundedMargin } from '../../utils/quotePricing';
import { QuoteHealthBadges } from './QuoteHealthBadges';
import { QuoteMarginGuidance } from './QuoteMarginGuidance';

export function QuoteFinalReviewSection({
  form,
  items,
  selectedContact,
  selectedOpportunity,
  products,
  totals,
  health,
  t,
  formatCurrency,
}: {
  form: QuoteFormState;
  items: SalesQuoteItem[];
  selectedContact?: SalesContact | null;
  selectedOpportunity?: SalesOpportunity | null;
  products: SalesCatalogItem[];
  totals: QuoteTotals;
  health: QuoteHealthState;
  t: QuotesTranslations;
  formatCurrency: (value: number, currency?: string | null) => string;
}) {
  const customer = form.clientMode === 'contact'
    ? selectedContact?.company ?? t.common.unassigned
    : form.temporaryClient || t.common.unassigned;
  const taxJurisdiction = form.taxJurisdiction === 'custom' && form.customJurisdictionName.trim()
    ? form.customJurisdictionName.trim()
    : t.taxJurisdictions[form.taxJurisdiction];

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4">
        <h3 className="flex items-center gap-2 text-base font-medium text-slate-950">
          <FileText className="h-5 w-5 text-[#FF6B5E]" />
          {t.builderSections.summary}
        </h3>
        <p className="mt-1 text-sm font-normal leading-6 text-slate-600">{t.summary.description}</p>
        <div className="mt-3">
          <QuoteHealthBadges health={health} t={t} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <UserRound className="h-4 w-4 text-[#FF6B5E]" />
            {t.labels.client}
          </p>
          <p className="mt-2 truncate text-base font-medium text-slate-950">{customer}</p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {selectedOpportunity?.opportunityName ?? t.common.unassigned}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Globe2 className="h-4 w-4 text-[#FF6B5E]" />
            {t.taxBuilder.jurisdiction}
          </p>
          <p className="mt-2 text-base font-medium text-slate-950">{taxJurisdiction}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{form.currency}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.labels.seller}</p>
          <p className="mt-2 truncate text-base font-medium text-slate-950">{form.assignedSeller || t.common.unassigned}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{t.labels.expirationDate}: {form.expirationDate || t.common.unassigned}</p>
        </div>
        <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-4 shadow-sm">
          <p className="text-sm font-medium text-[#B63B32]">{t.labels.total}</p>
          <p className="mt-2 text-xl font-medium text-[#B63B32]">{formatCurrency(totals.total, form.currency)}</p>
          <p className="mt-1 text-xs font-medium text-[#B63B32]">{t.summary.items}: {items.length}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="flex items-center gap-2 text-base font-medium text-slate-950">
            <ReceiptText className="h-5 w-5 text-[#FF6B5E]" />
            {t.lineItems.title}
          </h4>
          {items.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
              {t.builder.emptyItems}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => {
                const product = products.find((candidate) => candidate.id === item.productId);
                const pricing = calculateQuoteLinePricing(item, products);
                const itemCurrency = item.quoteCurrency ?? form.currency;

                return (
                  <article key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{item.productName}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {item.quantity} x {formatCurrency(item.unitPrice, itemCurrency)}
                          {product?.currency && product.currency !== itemCurrency ? ` · ${product.currency}` : ''}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-medium text-slate-950">{formatCurrency(pricing.lineTotal, itemCurrency)}</p>
                        <p className="mt-1 text-xs font-medium text-[#B63B32]">{getRoundedMargin(pricing.estimatedMargin)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        {item.taxLabel || t.taxBuilder.manualRate}: {item.taxPercent}%
                      </Badge>
                      {item.discountPercent > 0 ? (
                        <Badge className="rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-2.5 py-1 text-xs font-medium text-[#B63B32]">
                          {t.labels.discount}: {item.discountPercent}%
                        </Badge>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-slate-500">{t.labels.subtotal}</span>
                <span className="font-medium text-slate-950">{formatCurrency(totals.subtotal, form.currency)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-medium text-slate-500">{t.labels.discountTotal}</span>
                <span className="font-medium text-slate-950">{formatCurrency(totals.discountTotal, form.currency)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-medium text-slate-500">{t.labels.taxTotal}</span>
                <span className="font-medium text-slate-950">{formatCurrency(totals.taxTotal, form.currency)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-3 border-t border-slate-200 pt-3 text-lg">
                <span className="font-medium text-slate-950">{t.labels.total}</span>
                <span className="font-medium text-[#B63B32]">{formatCurrency(totals.total, form.currency)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{t.labels.notes}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-normal leading-6 text-slate-700">{form.notes || t.common.unassigned}</p>
            <p className="mt-4 text-sm font-medium text-slate-500">{t.builderSections.conditions}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-normal leading-6 text-slate-700">{form.terms || t.common.unassigned}</p>
          </div>
        </section>
      </div>

      <QuoteMarginGuidance totals={totals} t={t} />
    </section>
  );
}
