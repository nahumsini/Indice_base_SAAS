import { useMemo } from 'react';
import type { OpportunityFlowStage, SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import type { OpportunityPeriodFilter } from '../types/prospectosTypes';
import { calculateProspectosMetrics } from '../utils/prospectosMetrics';

export function useProspectosMetrics(
  opportunities: SalesOpportunity[],
  quotes: SalesQuote[],
  preferredCurrency: string,
  periodFilter: OpportunityPeriodFilter,
  stages: OpportunityFlowStage[],
) {
  return useMemo(
    () => calculateProspectosMetrics(opportunities, quotes, preferredCurrency, periodFilter, stages.map((stage) => stage.key)),
    [opportunities, periodFilter, preferredCurrency, quotes, stages],
  );
}
