import { useMemo } from 'react';
import type { SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import type { BusinessExchangeRatesPerUsd } from '../../../shared/businessCurrency';
import type { OpportunityPeriodFilter } from '../types/prospectosTypes';
import { calculateProspectosMetrics } from '../utils/prospectosMetrics';

export function useProspectosMetrics(
  opportunities: SalesOpportunity[],
  quotes: SalesQuote[],
  preferredCurrency: string,
  periodFilter: OpportunityPeriodFilter,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  return useMemo(
    () => calculateProspectosMetrics(opportunities, quotes, preferredCurrency, periodFilter, exchangeRatesPerUsd),
    [exchangeRatesPerUsd, opportunities, periodFilter, preferredCurrency, quotes],
  );
}
