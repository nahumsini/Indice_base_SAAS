import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import type { SalesOpportunity } from '../../salesCrmContext';
import { normalizeSalesCurrencyCode } from '../../utils/salesCurrency';
import type { ProspectosCopy } from '../translations';
import { formatCurrencyAmount, normalizeEstimatedValueInput, parseMoney, toEstimatedValueInputValue } from '../utils/prospectosFormatters';
import type { OpportunityPipelineTotals } from '../utils/prospectosPipeline';

const valueBadgeClassNames = {
  estimated: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  quoted: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  won: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  lost: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#B63B32]',
};

export function OpportunityCommercialValueCell({
  copy,
  opportunity,
  pipeline,
  onEstimatedValueChange,
}: {
  copy: ProspectosCopy['table']['commercialValue'];
  opportunity: SalesOpportunity;
  pipeline: OpportunityPipelineTotals;
  onEstimatedValueChange: (value: string) => void;
}) {
  const isWon = opportunity.stage === 'Won';
  const isLost = opportunity.stage === 'Lost';
  const hasQuotedValue = pipeline.quoteCount > 0;
  const opportunityCurrency = normalizeSalesCurrencyCode(opportunity.currency);
  const estimatedValueLabel = formatCurrencyAmount(parseMoney(opportunity.estimatedValue), opportunityCurrency);
  const primaryValue = hasQuotedValue ? pipeline.totalLabel : estimatedValueLabel;
  const badgeTone = isWon ? 'won' : isLost ? 'lost' : hasQuotedValue ? 'quoted' : 'estimated';
  const badgeLabel = isWon
    ? copy.won
    : isLost
      ? copy.lost
      : hasQuotedValue
        ? copy.quoted
        : copy.estimated;

  if (!hasQuotedValue && !isWon && !isLost) {
    return (
      <div className="min-w-0 max-w-full space-y-2">
        <Input
          value={toEstimatedValueInputValue(opportunity.estimatedValue)}
          inputMode="decimal"
          onChange={(event) => onEstimatedValueChange(normalizeEstimatedValueInput(event.target.value))}
          placeholder="0"
          className="h-9 w-full min-w-0 max-w-full rounded-full border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('h-auto rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-normal', valueBadgeClassNames.estimated)}>
            {copy.editableEstimate}
          </Badge>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{opportunityCurrency}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-1.5">
      <p className="break-words text-sm font-medium text-slate-950 dark:text-white">{primaryValue}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn('h-auto max-w-full whitespace-normal rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-normal', valueBadgeClassNames[badgeTone])}>
          {badgeLabel}
        </Badge>
        {hasQuotedValue ? (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.quoteCount(pipeline.quoteCount)}</span>
        ) : null}
      </div>
      {hasQuotedValue && pipeline.totalsByCurrency.length > 1 ? (
        <p className="text-xs font-medium text-[#B63B32] dark:text-[#FFB0AA]">{copy.converted(pipeline.convertedLabel)}</p>
      ) : null}
    </div>
  );
}
