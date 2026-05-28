import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { cn } from '../../../../../components/ui/utils';
import type { QuotesTranslations } from '../../translations';
import type { QuoteTotals } from '../../types/quoteBuilderTypes';
import { getRoundedMargin } from '../../utils/quotePricing';
import { getQuoteMarginTone } from '../../utils/quoteReadiness';

const toneClasses = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  warning: 'border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05]',
  danger: 'border-red-200 bg-red-50 text-red-600',
  success: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]',
};

const toneIcons = {
  neutral: Info,
  warning: AlertTriangle,
  danger: OctagonAlert,
  success: CheckCircle2,
};

export function QuoteMarginGuidance({
  totals,
  t,
}: {
  totals: QuoteTotals;
  t: QuotesTranslations;
}) {
  const tone = getQuoteMarginTone(totals);
  const Icon = toneIcons[tone];
  let messageKey: 'missingCost' | 'missingItems' | 'danger' | 'warning' | 'success' = 'success';

  if (totals.missingCostCount > 0) {
    messageKey = 'missingCost';
  } else if (totals.taxableSubtotal <= 0) {
    messageKey = 'missingItems';
  } else if (tone === 'danger' || tone === 'warning' || tone === 'success') {
    messageKey = tone;
  }

  return (
    <div className={cn('rounded-lg border px-4 py-3', toneClasses[tone])}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-black">{t.marginGuidance.title(getRoundedMargin(totals.estimatedMargin))}</p>
          <p className="mt-1 text-sm font-semibold leading-5">{t.marginGuidance.messages[messageKey]}</p>
        </div>
      </div>
    </div>
  );
}
