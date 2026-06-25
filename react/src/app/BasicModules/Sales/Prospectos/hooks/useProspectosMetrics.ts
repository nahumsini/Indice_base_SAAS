import { useMemo } from 'react';
import type { SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import type { OpportunityPeriodFilter } from '../types/prospectosTypes';
import { calculateProspectosMetrics } from '../utils/prospectosMetrics';

export function useProspectosMetrics(
  opportunities: SalesOpportunity[],
  quotes: SalesQuote[],
  preferredCurrency: string,
  periodFilter: OpportunityPeriodFilter,
) {
  return useMemo(
    () => calculateProspectosMetrics(opportunities, quotes, preferredCurrency, periodFilter),
    [opportunities, periodFilter, preferredCurrency, quotes],
  );
}
