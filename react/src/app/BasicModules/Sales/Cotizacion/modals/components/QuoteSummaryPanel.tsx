import { FileText } from 'lucide-react';
import { Badge } from '../../../../../components/ui/badge';
import type { SalesContact, SalesOpportunity } from '../../../types';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState, QuoteHealthState, QuoteTotals } from '../../types/quoteBuilderTypes';
import { getRoundedMargin } from '../../utils/quotePricing';
import { QuoteHealthBadges } from './QuoteHealthBadges';
import { QuoteMarginGuidance } from './QuoteMarginGuidance';

export function QuoteSummaryPanel({
  form,
  selectedContact,
  selectedOpportunity,
  itemCount,
  totals,
  health,
  formatCurrency,
  t,
}: {
  form: QuoteFormState;
  selectedContact?: SalesContact | null;
  selectedOpportunity?: SalesOpportunity | null;
  itemCount: number;
  totals: QuoteTotals;
  health: QuoteHealthState;
  formatCurrency: (value: number, currency?: string | null) => string;
  t: QuotesTranslations;
}) {
  const customer = form.clientMode === 'contact'
    ? selectedContact?.company ?? t.common.unassigned
    : form.temporaryClient || t.common.unassigned;
  const taxJurisdiction = form.taxJurisdiction === 'custom' && form.customJurisdictionName.trim()
    ? form.customJurisdictionName.trim()
    : t.taxJurisdictions[form.taxJurisdiction];

  return (
    <aside className="min-h-0 overflow-visible border-t border-slate-200 bg-slate-50 p-5 xl:overflow-y-auto xl:border-l xl:border-t-0">
      <div className="space-y-4 xl:sticky xl:top-0">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium text-slate-950">
            <FileText className="h-5 w-5 text-[#FF6B5E]" />
            {t.summary.title}
          </h3>
          <p className="mt-1 text-sm font-normal text-slate-500">{t.summary.description}</p>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-slate-500">{t.labels.client}</p>
              <p className="mt-1 font-medium text-slate-950">{customer}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">{t.labels.opportunity}</p>
              <p className="mt-1 font-medium text-slate-950">{selectedOpportunity?.opportunityName ?? t.common.unassigned}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-medium text-slate-500">{t.labels.seller}</p>
                <p className="mt-1 truncate font-medium text-slate-950">{form.assignedSeller || t.common.unassigned}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-medium text-slate-500">{t.labels.currency}</p>
                <p className="mt-1 font-medium text-slate-950">{form.currency}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-medium text-slate-500">{t.summary.items}</p>
                <p className="mt-1 font-medium text-slate-950">{itemCount}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-medium text-slate-500">{t.labels.expirationDate}</p>
                <p className="mt-1 font-medium text-slate-950">{form.expirationDate || t.common.unassigned}</p>
              </div>
            </div>
            <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-3">
              <p className="font-medium text-[#B63B32]">{t.taxBuilder.jurisdiction}</p>
              <p className="mt-1 font-medium text-slate-950">{taxJurisdiction}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">{t.labels.subtotal}</span>
              <span className="font-medium text-slate-950">{formatCurrency(totals.subtotal, form.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">{t.labels.discountTotal}</span>
              <span className="font-medium text-slate-950">{formatCurrency(totals.discountTotal, form.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">{t.pricing.taxableSubtotal}</span>
              <span className="font-medium text-slate-950">{formatCurrency(totals.taxableSubtotal, form.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">{t.labels.taxTotal}</span>
              <span className="font-medium text-slate-950">{formatCurrency(totals.taxTotal, form.currency)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-lg">
              <span className="font-medium text-slate-950">{t.labels.total}</span>
              <span className="font-medium text-[#B63B32]">{formatCurrency(totals.total, form.currency)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <Badge className="justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              {t.pricing.estimatedProfit}: {formatCurrency(totals.estimatedProfit, form.currency)}
            </Badge>
            <Badge className="justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-2 text-[#B63B32]">
              {t.pricing.estimatedMargin}: {getRoundedMargin(totals.estimatedMargin)}%
            </Badge>
          </div>
          <div className="mt-3">
            <QuoteHealthBadges health={health} t={t} />
          </div>
        </section>

        <QuoteMarginGuidance totals={totals} t={t} />
      </div>
    </aside>
  );
}
