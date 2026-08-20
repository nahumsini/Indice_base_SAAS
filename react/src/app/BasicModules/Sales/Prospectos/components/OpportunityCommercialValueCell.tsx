import { Badge } from '../../../../components/ui/badge';
import type { SalesOpportunity } from '../../salesCrmContext';
import { formatSalesCurrencyAmount, normalizeSalesCurrencyCode } from '../../utils/salesCurrency';
import type { ProspectosCopy } from '../translations';
import { formatCurrencyAmount, parseMoney, parsePercentage } from '../utils/prospectosFormatters';
import type { OpportunityNativePipelineTotals } from '../utils/prospectosPipeline';

export function OpportunityCommercialValueCell({
  copy,
  opportunity,
  pipeline,
}: {
  copy: ProspectosCopy['table']['commercialValue'];
  opportunity: SalesOpportunity;
  pipeline: OpportunityNativePipelineTotals;
}) {
  const opportunityCurrency = normalizeSalesCurrencyCode(opportunity.currency);
  const probability = parsePercentage(opportunity.probability);
  const forecastLabel = pipeline.totalsByCurrency.length > 0
    ? pipeline.totalsByCurrency
      .map(({ currency, total }) => formatSalesCurrencyAmount(total * (probability / 100), currency))
      .join(' · ')
    : formatSalesCurrencyAmount(0, opportunityCurrency);
  const estimatedValueLabel = formatCurrencyAmount(parseMoney(opportunity.estimatedValue), opportunityCurrency);

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{copy.quoted}</p>
        <p className="break-words text-sm font-medium text-slate-950 dark:text-white">{pipeline.totalLabel}</p>
      </div>
      <div className="min-w-0 border-t border-slate-100 pt-1.5 dark:border-slate-700">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{copy.forecast(opportunity.probability)}</p>
        <p className="break-words text-sm font-medium text-[#2563EB]">{forecastLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="h-auto rounded-full border-[#F4C84A]/45 bg-[#F4C84A]/15 px-2.5 py-0.5 text-[11px] font-medium tracking-normal text-[#9a6b05]">
          {copy.quoteCount(pipeline.quoteCount)}
        </Badge>
        {parseMoney(opportunity.estimatedValue) > 0 ? (
          <span className="break-words text-[11px] text-slate-500 dark:text-slate-400">
            {copy.estimatedPotential(estimatedValueLabel)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
